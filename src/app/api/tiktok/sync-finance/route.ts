import { type NextRequest, NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { createClient } from '@/utils/supabase/server'
import { getTikTokSettings, getValidToken, signTikTokRequest } from '@/lib/tiktok'
import { createSimpleJournal } from '@/utils/journal/create'
import { E_WALLET_TIKTOK_ACCOUNT_ID } from '@/config/accounts'

export async function POST(req: NextRequest) {
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
    // Kalo tanggal dikosongin, sync dari 2023-07-01 (earliest data available)
    const EARLIEST_DATA = Math.floor(new Date('2023-07-01').getTime() / 1000)
    const now = Math.floor(Date.now() / 1000)
    const statementTimeGe = start_date ? Math.floor(new Date(start_date).getTime() / 1000) : EARLIEST_DATA
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

    // 073 fix (2026-08-12): piutang settlement dicatat GROSS (settlement_amount =
    // pembayaran customer) + fee terpisah, 3 jurnal (order_created, ecommerce_fee,
    // piutang_received) — TIDAK main net. Net yang masuk bank = revenue_amount.
    // Anti-double: cek duplikat invoice_number + idempotency key per jurnal.
    async function ensurePiutangForStatement(opts: {
      stmtId: string
      gross: number
      fee: number
      net: number
      invoiceDate: string
    }): Promise<string | null> {
      const { stmtId, gross, fee, net, invoiceDate } = opts
      const invoiceNum = `TTK-${stmtId.slice(0, 8)}`

      // Guard 1: piutang sudah ada untuk invoice ini → link ulang, jangan buat baru
      const { data: existing } = await supabase
        .from('piutang')
        .select('id')
        .eq('invoice_number', invoiceNum)
        .maybeSingle()
      if (existing) return existing.id

      const { data: piutang, error: piutangErr } = await supabase
        .from('piutang')
        .insert({
          customer_id: null,
          invoice_number: invoiceNum,
          invoice_date: invoiceDate,
          amount: gross,
          fee_amount: fee,
          paid_amount: net,
          
          channel: 'tiktok',
          description: `TikTok Shop settlement ${stmtId.slice(0, 8)}`,
          status: 'paid'
        })
        .select('id')
        .single()

      if (piutangErr || !piutang) {
        console.error(`Gagal buat piutang TikTok ${stmtId}:`, piutangErr ? toClientError(piutangErr) : 'no id')
        return null
      }

      // Jurnal settlement — BUG-069 fix (model akrual):
      // revenue (order_created) SUDAH dicatat saat order di sync-to-main-orders.
      // Jalur settlement hanya mencatat KAS (piutang_received) + BEBAN (ecommerce_fee).
      // Semua ber-idempotency key — retry tidak dobel.
      if (fee > 0) {
        try {
          await createSimpleJournal({
            transaction_type: 'ecommerce_fee',
            reference_type: 'piutang',
            reference_id: piutang.id,
            description: `Settlement TikTok ${stmtId.slice(0, 8)} — komisi & biaya platform`,
            amount: fee,
            baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
            supabase,
            idempotency_key: `tiktok_fee:${stmtId}`
          })
        } catch (jErr) {
          console.error(`Gagal jurnal ecommerce_fee TikTok ${stmtId}:`, jErr)
        }
      }

      try {
        await createSimpleJournal({
          transaction_type: 'piutang_received',
          reference_type: 'piutang',
          reference_id: piutang.id,
          description: `TikTok Shop settlement ${stmtId.slice(0, 8)} — kas masuk E Wallet Tiktok Rp${net.toLocaleString('id-ID')}`,
          amount: net,
          debit_account_id: E_WALLET_TIKTOK_ACCOUNT_ID,
          baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
          supabase,
          idempotency_key: `tiktok_paid:${stmtId}`
        })
      } catch (jErr) {
        console.error(`Gagal jurnal piutang_received TikTok ${stmtId}:`, jErr)
      }

      return piutang.id
    }

    for (const stmt of statementsData.data.statements) {
      // Map TikTok snake_case fields to our schema
      const stmtId = stmt.id
      const payStatus = stmt.payment_status || stmt.paymentStatus
      const stmtTime = stmt.statement_time || stmt.statementTime
      const payTime = stmt.payment_time || stmt.paymentTime
      // 073 fix — mapping BENAR (terverifikasi dari payload live, settlement = revenue + fee):
      //   settlement_amount = GROSS (total pembayaran customer)
      //   revenue_amount     = NET (yang dibayar TikTok ke bank, setelah fee)
      //   fee_amount         = biaya/komisi platform
      // 077 fix — settlement FULL: semua potongan (komisi + ongkir + adjustment)
      // di-jurnal sebagai beban e-commerce agar sisa piutang = gross − net − potongan = 0.
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

      // Auto-create piutang jika enabled & status SETTLED (baru maupun existing tanpa piutang)
      const settleStatuses = ['PAID', 'SETTLED', 'COMPLETED']
      let piutangId: string | null = null

      if (auto_create_piutang && settleStatuses.includes(payStatus)) {
        piutangId = await ensurePiutangForStatement({ stmtId, gross, fee: totalDeductions, net, invoiceDate })
        if (piutangId && !existing) created_piutang++
      }

      // Statement baru → insert; statement existing tanpa piutang → link piutang_id
      if (!existing) {
        const { error: stmtErr } = await supabase.from('tiktok_shop_statements').insert({
          statement_id: stmtId,
          statement_type: 'SETTLEMENT',
          total_amount: gross,
          revenue_amount: net,
          fee_amount: totalDeductions,
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
          is_synced: true,
          piutang_id: piutangId
        })
        if (stmtErr) {
          return NextResponse.json(
            {
              error: `Gagal simpan statement TikTok ${stmtId}: ${toClientError(stmtErr)}`,
              synced,
              created_piutang
            },
            { status: 500 }
          )
        }
        synced++
      } else if (piutangId && !existing.piutang_id) {
        await supabase.from('tiktok_shop_statements').update({ piutang_id: piutangId }).eq('id', existing.id)
        created_piutang++
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
