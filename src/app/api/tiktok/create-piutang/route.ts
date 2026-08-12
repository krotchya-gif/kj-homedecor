import { type NextRequest, NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { createClient } from '@/utils/supabase/server'
import { getTikTokSettings, getValidToken } from '@/lib/tiktok'
import { E_WALLET_TIKTOK_ACCOUNT_ID } from '@/config/accounts'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // F-19 fix: hanya owner/admin/finance yang boleh buat piutang settlement
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active' || !['owner', 'admin', 'finance'].includes(requester.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { shop_id, start_date, end_date } = body

  const settings = await getTikTokSettings(shop_id)
  if (!settings) {
    return NextResponse.json({ error: 'TikTok Shop not configured' }, { status: 400 })
  }

  try {
    // Statement yang belum punya piutang, status SETTLED, dalam rentang tanggal (opsional)
    let query = supabase
      .from('tiktok_shop_statements')
      .select('*')
      .is('piutang_id', null)
      .eq('status', 'SETTLED')
    if (start_date) query = query.gte('start_date', start_date)
    if (end_date) query = query.lte('start_date', end_date)

    const { data: statements, error: fetchErr } = await query

    if (fetchErr) {
      return NextResponse.json({ error: toClientError(fetchErr) }, { status: 500 })
    }

    let created = 0
    let skipped = 0

    for (const stmt of statements || []) {
      // 073 fix: piutang dicatat GROSS (total_amount = settlement_amount = pembayaran
      // customer) + fee terpisah; net yang masuk bank = revenue_amount. 3 jurnal lengkap.
      // 077 fix: fee = SEMUA potongan (komisi + ongkir + adjustment) agar sisa piutang
      // = gross − net − potongan = 0; piutang_received debit ke E Wallet Tiktok.
      const gross = Number(stmt.total_amount ?? 0) || 0
      const net = Number(stmt.revenue_amount ?? stmt.total_amount ?? 0) || 0
      const fee = Number(stmt.fee_amount ?? 0) || 0
      const shipping = Number(stmt.shipping_cost_amount ?? 0) || 0
      const adjustment = Number(stmt.adjustment_amount ?? 0) || 0
      const totalDeductions = fee + shipping + adjustment
      const invoiceNum = `TTK-${stmt.statement_id.slice(0, 8)}`

      // Cek duplikat invoice_number (anti-double — mis. sudah dibuat jalur lain)
      const { data: existing } = await supabase
        .from('piutang')
        .select('id')
        .eq('invoice_number', invoiceNum)
        .maybeSingle()

      if (existing) {
        // Update langsung piutang_id di statement
        await supabase.from('tiktok_shop_statements').update({ piutang_id: existing.id }).eq('id', stmt.id)
        skipped++
        continue
      }

      const { data: piutang, error: insertErr } = await supabase
        .from('piutang')
        .insert({
          customer_id: null,
          invoice_number: invoiceNum,
          invoice_date: stmt.start_date || new Date().toISOString().split('T')[0],
          amount: gross,
          fee_amount: totalDeductions,
          paid_amount: net,
          
          channel: 'tiktok',
          description: `TikTok Shop settlement ${stmt.statement_id.slice(0, 8)}`,
          status: 'paid'
        })
        .select('id')
        .single()

      if (insertErr || !piutang) {
        console.error('Failed to insert piutang:', insertErr ? toClientError(insertErr) : 'no id')
        continue
      }

      // Jurnal settlement — BUG-069 fix (model akrual):
      // revenue (order_created) SUDAH dicatat saat order di sync-to-main-orders.
      // Jalur settlement hanya mencatat KAS (piutang_received) + BEBAN (ecommerce_fee).
      // Semua ber-idempotency key — retry tidak dobel.
      try {
        const { createSimpleJournal } = await import('@/utils/journal/create')
        if (totalDeductions > 0) {
          await createSimpleJournal({
            transaction_type: 'ecommerce_fee',
            reference_type: 'piutang',
            reference_id: piutang.id,
            description: `Settlement TikTok ${stmt.statement_id.slice(0, 8)} — komisi & biaya platform`,
            amount: totalDeductions,
            baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
            supabase,
            idempotency_key: `tiktok_fee:${stmt.statement_id}`
          })
        }
        await createSimpleJournal({
          transaction_type: 'piutang_received',
          reference_type: 'piutang',
          reference_id: piutang.id,
          description: `Settlement TikTok ${stmt.statement_id.slice(0, 8)} — kas masuk E Wallet Tiktok Rp${net.toLocaleString('id-ID')}`,
          amount: net,
          debit_account_id: E_WALLET_TIKTOK_ACCOUNT_ID,
          baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
          supabase,
          idempotency_key: `tiktok_paid:${stmt.statement_id}`
        })
      } catch (jErr) {
        console.error('Gagal buat jurnal settlement TikTok:', jErr)
      }

      // Update piutang_id di statement
      await supabase.from('tiktok_shop_statements').update({ piutang_id: piutang.id }).eq('id', stmt.id)

      created++
    }

    return NextResponse.json({
      created,
      skipped,
      total: (statements || []).length,
      message: `Created ${created} piutang, ${skipped} already linked`
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? toClientError(err) : String(err) }, { status: 500 })
  }
}
