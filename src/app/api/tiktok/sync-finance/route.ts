import { type NextRequest, NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { createClient } from '@/utils/supabase/server'
import { getTikTokSettings, getValidToken, signTikTokRequest } from '@/lib/tiktok'
import { createSimpleJournal } from '@/utils/journal/create'

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

    // Debug: log raw API response (will show in server logs)
    console.log('TikTok statements response:', JSON.stringify(statementsData).slice(0, 2000))

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

    for (const stmt of statementsData.data.statements) {
      // Map TikTok snake_case fields to our schema
      const stmtId = stmt.id
      const payStatus = stmt.payment_status || stmt.paymentStatus
      const stmtTime = stmt.statement_time || stmt.statementTime
      const payTime = stmt.payment_time || stmt.paymentTime
      const settleAmount =
        stmt.settlement_amount || stmt.settlementAmount || stmt.revenue_amount || stmt.revenueAmount || '0'

      const { data: existing } = await supabase
        .from('tiktok_shop_statements')
        .select('id')
        .eq('statement_id', stmtId)
        .maybeSingle()

      if (existing) continue

      let piutangId: string | null = null

      // Auto-create piutang if enabled (PAID / SETTLED statements)
      const settleStatuses = ['PAID', 'SETTLED', 'COMPLETED']
      if (auto_create_piutang && settleStatuses.includes(payStatus)) {
        // CRITICAL: cek error insert — kalau gagal, piutang tidak dibuat diam-diam
        // (pola `if (data)` swallow). Blokir alur supaya tidak lanjut dengan data setengah.
        const { data: piutang, error: piutangErr } = await supabase
          .from('piutang')
          .insert({
            customer_id: null,
            invoice_number: `TTK-${stmtId.slice(0, 8)}`,
            invoice_date: stmtTime
              ? new Date(stmtTime * 1000).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            amount: Number(settleAmount),
            remaining: Number(settleAmount),
            channel: 'tiktok',
            description: `TikTok Shop settlement ${stmtId.slice(0, 8)}`,
            status: 'pending'
          })
          .select()
          .single()

        if (piutangErr) {
          return NextResponse.json(
            {
              error: `Gagal buat piutang TikTok ${stmtId}: ${toClientError(piutangErr)}`,
              created: created_piutang
            },
            { status: 500 }
          )
        }
        if (piutang) {
          piutangId = piutang.id
          created_piutang++

          // BUG-017 fix (2026-08-11): settlement masuk = penerimaan piutang →
          // jurnal Dr Kas / Cr Piutang (mapping 'piutang_received'). Sebelumnya
          // settlement net masuk piutang TANPA jurnal → neraca/laba-rugi tidak
          // mencerminkan kas masuk marketplace.
          try {
            await createSimpleJournal({
              transaction_type: 'piutang_received',
              reference_type: 'piutang',
              reference_id: piutang.id,
              description: `TikTok Shop settlement ${stmtId.slice(0, 8)} — kas masuk Rp${Number(settleAmount).toLocaleString('id-ID')}`,
              amount: Number(settleAmount),
              baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
              supabase
            })
          } catch (jErr) {
            console.error(`Gagal buat jurnal settlement TikTok ${stmtId}:`, jErr)
          }
        }
      }

      // CRITICAL: cek error insert statement — kalau gagal, statement tidak tercatat
      // tapi flow lanjut (data settlement hilang diam-diam).
      const { error: stmtErr } = await supabase.from('tiktok_shop_statements').insert({
        statement_id: stmtId,
        statement_type: 'SETTLEMENT',
        total_amount: Number(settleAmount),
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
