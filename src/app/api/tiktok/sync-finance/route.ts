import { type NextRequest, NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { createClient } from '@/utils/supabase/server'
import { getTikTokSettings, getValidToken, signTikTokRequest } from '@/lib/tiktok'
import { checkRateLimit, getClientIp } from '@/lib/auth'

export async function POST(req: NextRequest) {
  // Phase 2 (BUG-091): rate limit — cegah spam sync settlement (API eksternal + jurnal).
  const rateLimit = checkRateLimit(getClientIp(req))
  if (rateLimit.blocked) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // F-19 fix: hanya owner/admin/finance yang boleh sync data keuangan TikTok
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active' || !['owner', 'admin', 'finance'].includes(requester.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { shop_id, start_date, end_date, auto_create_piutang } = body

  const settings = await getTikTokSettings(shop_id)
  if (!settings) {
    return NextResponse.json({ error: 'TikTok Shop not configured' }, { status: 400 })
  }

  const token = await getValidToken(settings)
  if (!token) {
    return NextResponse.json({ error: 'Access token not available' }, { status: 400 })
  }

  try {
    // Call TikTok Shop Finance API - GetStatements
    // NOTE: /finance/202309/payments is UNAVAILABLE for SEA (Indonesia)
    // Use /finance/202309/statements instead — applicable for all regions
    // WAVE 2 (2026-08-15): batas bawah sync = sync_start_date per-shop (bukan lagi
    // 2023-07-01) — statement sebelum tanggal mulai dianggap sudah diinput manual.
    let statementTimeGe: number
    if (start_date) {
      statementTimeGe = Math.floor(new Date(start_date).getTime() / 1000)
      if (settings.sync_start_date) {
        const minTs = Math.floor(new Date(settings.sync_start_date).getTime() / 1000)
        if (statementTimeGe < minTs) statementTimeGe = minTs
      }
    } else if (settings.sync_start_date) {
      statementTimeGe = Math.floor(new Date(settings.sync_start_date).getTime() / 1000)
    } else {
      statementTimeGe = Math.floor(new Date('2023-07-01').getTime() / 1000)
    }
    const now = Math.floor(Date.now() / 1000)
    const statementTimeLt = end_date ? Math.floor(new Date(end_date).getTime() / 1000) : now

    const extraQs: Record<string, string> = {
      sort_field: 'statement_time',
      statement_time_ge: String(statementTimeGe),
      statement_time_lt: String(statementTimeLt),
      page_size: '100'
    }
    if (settings.shop_cipher) {
      extraQs.shop_cipher = settings.shop_cipher
    }

    const url = signTikTokRequest(
      '/finance/202309/statements',
      settings.app_key,
      settings.app_secret,
      undefined,
      extraQs
    )

    const statementsRes = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'x-tts-access-token': token
      }
    })

    const statementsData = await statementsRes.json()

    // 2026-08-12: log hanya ringkasan (tidak lagi log payload mentah settlement — data sensitif)
    console.log(`TikTok statements response: ${statementsData.data?.statements?.length ?? 0} statement(s)`)

    // Check for TikTok API errors
    if (statementsData.code && statementsData.code !== 0) {
      return NextResponse.json(
        {
          error: `TikTok API error (${statementsData.code}): ${statementsData.message || 'Unknown error'}`
        },
        { status: 400 }
      )
    }

    const stmtList = statementsData.data?.statements
    if (!stmtList || stmtList.length === 0) {
      return NextResponse.json({
        synced: 0,
        message: 'No statements found',
        debug: JSON.stringify(statementsData).slice(0, 1000)
      })
    }

    let synced = 0
    let created_piutang = 0
    const actorId = user.id // sudah diverifikasi non-null di atas (auth check)

    // Sesi 43 (single-source-of-truth): pembukuan settlement (piutang + jurnal
    // per kategori + kas E-Wallet) = SATU RPC atomic process_tiktok_settlement_atomic.
    // Route ini hanya: fetch statement → simpan → panggil RPC. Error = BLOCK
    // (bukan console.error terus lanjut) supaya tidak ada statement lewat tanpa dibukukan.
    async function settleStatement(stmtRowId: string): Promise<void> {
      const { error: rpcErr } = await supabase.rpc('process_tiktok_settlement_atomic', {
        p_statement_id: stmtRowId,
        p_actor: actorId
      })
      if (rpcErr) throw new Error(rpcErr.message)
    }

    for (const stmt of statementsData.data.statements) {
      // Map TikTok snake_case fields to our schema
      const stmtId = stmt.id
      const payStatus = stmt.payment_status || stmt.paymentStatus
      const stmtTime = stmt.statement_time || stmt.statementTime
      const payTime = stmt.payment_time || stmt.paymentTime
      // 073 fix — mapping BENAR (terverifikasi dari payload live, settlement = revenue + fee):
      //   settlement_amount = GROSS (total pembayaran customer)
      //   revenue_amount     = NET (yang dibayar TikTok ke bank, setelah potongan)
      // 077 fix — potongan (komisi + ongkir + adjustment) dipecah per kategori
      // (sesi 43: mapping ecommerce_commission/shipping/adjustment).
      const settlement = Number(stmt.settlement_amount ?? stmt.settlementAmount ?? 0) || 0
      const revenue = Number(stmt.revenue_amount ?? stmt.revenueAmount ?? stmt.net_sales_amount ?? stmt.netSalesAmount ?? 0) || 0
      const fee = Number(stmt.fee_amount ?? stmt.feeAmount ?? 0) || 0
      const shipping = Number(stmt.shipping_cost_amount ?? stmt.shippingCostAmount ?? 0) || 0
      const adjustment = Number(stmt.adjustment_amount ?? stmt.adjustmentAmount ?? 0) || 0
      const totalDeductions = fee + shipping + adjustment
      const gross = settlement || revenue + totalDeductions
      const net = revenue || Math.max(0, gross - totalDeductions)
      const invoiceDate = stmtTime
        ? new Date(stmtTime * 1000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]

      const { data: existing } = await supabase
        .from('tiktok_shop_statements')
        .select('id, piutang_id')
        .eq('statement_id', stmtId)
        .maybeSingle()

      // Auto-create piutang + jurnal jika enabled & status SETTLED (baru maupun existing tanpa piutang)
      const settleStatuses = ['PAID', 'SETTLED', 'COMPLETED']
      const shouldSettle = auto_create_piutang && settleStatuses.includes(payStatus)

      // Statement baru → insert
      if (!existing) {
        const { data: newStmt, error: stmtErr } = await supabase
          .from('tiktok_shop_statements')
          .insert({
            statement_id: stmtId,
            statement_type: 'SETTLEMENT',
            total_amount: gross,
            revenue_amount: net,
            fee_amount: fee,
            shipping_cost_amount: shipping,
            net_sales_amount: Number(stmt.net_sales_amount ?? stmt.netSalesAmount ?? 0) || 0,
            adjustment_amount: adjustment,
            status: payStatus,
            currency: stmt.currency || 'IDR',
            start_date: stmtTime ? new Date(stmtTime * 1000).toISOString().split('T')[0] : null,
            end_date: stmtTime ? new Date(stmtTime * 1000).toISOString().split('T')[0] : null,
            paid_at: payTime ? new Date(payTime * 1000).toISOString() : null,
            transaction_count: 0,
            statement_data: stmt,
            is_synced: true
          })
          .select('id')
          .single()
        if (stmtErr || !newStmt) {
          return NextResponse.json(
            {
              error: `Gagal simpan statement TikTok ${stmtId}: ${stmtErr ? toClientError(stmtErr) : 'no id'}`,
              synced,
              created_piutang
            },
            { status: 500 }
          )
        }
        synced++
        if (shouldSettle) {
          try {
            await settleStatement(newStmt.id)
            created_piutang++
          } catch (rpcErr) {
            const msg = rpcErr instanceof Error ? rpcErr.message : String(rpcErr)
            return NextResponse.json(
              { error: `Gagal proses settlement TikTok ${stmtId}: ${msg}`, synced, created_piutang },
              { status: 500 }
            )
          }
        }
      } else if (shouldSettle && !existing.piutang_id) {
        // Statement sudah tersimpan tapi belum dibukukan → proses ulang lewat RPC
        try {
          await settleStatement(existing.id)
          created_piutang++
        } catch (rpcErr) {
          const msg = rpcErr instanceof Error ? rpcErr.message : String(rpcErr)
          return NextResponse.json(
            { error: `Gagal proses settlement TikTok ${stmtId}: ${msg}`, synced, created_piutang },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({
      synced,
      created_piutang,
      message: `Synced ${synced} statements, created ${created_piutang} piutang`
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? toClientError(err) : String(err) }, { status: 500 })
  }
}
