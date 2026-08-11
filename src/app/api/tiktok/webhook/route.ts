import { type NextRequest, NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { createServiceClient } from '@/utils/supabase/server'
import crypto from 'crypto'

// POST /api/tiktok/webhook — Receive TikTok Shop event notifications
export async function POST(req: NextRequest) {
  // Server-to-server: no user session → service-role client (bypasses RLS)
  const supabase = createServiceClient()

  try {
    const rawBody = await req.text()
    const body = JSON.parse(rawBody)
    const eventType = body.event_type || body.type
    const data = body.data || body

    // Verify signature: hex(HMAC-SHA256(app_secret, raw_body)) in authorization header
    const appSecret = process.env.TIKTOK_APP_SECRET
    const signature = req.headers.get('authorization') || req.headers.get('x-tt-signature')
    // Security fix (2026-08-11): FAIL-CLOSED — kalau app secret tidak di-set,
    // webhook DITOLAK (bukan di-skip seperti sebelumnya → webhook tidak aman).
    if (!appSecret) {
      console.error('TikTok webhook: TIKTOK_APP_SECRET not set — rejecting webhook')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }
    if (!signature) {
      console.error('TikTok webhook: missing signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }
    const expected = crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')
    if (signature !== expected) {
      console.error('TikTok webhook: invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Log webhook for debugging
    console.log('TikTok webhook received:', eventType, JSON.stringify(data).slice(0, 200))

    if (eventType === 'ORDER_CREATED' || eventType === 'ORDER_STATUS_UPDATED' || eventType === 'ORDER_STATUS_CHANGE') {
      const orderId = data.order_id || data.id
      if (orderId) {
        const { error } = await supabase
          .from('tiktok_shop_orders')
          .update({
            order_status: data.order_status,
            payment_status: data.payment_status,
            order_data: data,
            updated_at: new Date().toISOString()
          })
          .eq('tiktok_order_id', orderId)
        if (error) console.error('TikTok webhook: update tiktok_shop_orders failed:', toClientError(error))
      }
    } else if (eventType === 'PAYMENT_RELEASED' || eventType === 'SETTLEMENT_COMPLETED') {
      const statementId = data.statement_id || data.id
      if (statementId) {
        // Check if already synced
        const { data: existing, error: selectErr } = await supabase
          .from('tiktok_shop_statements')
          .select('id')
          .eq('statement_id', statementId)
          .maybeSingle()
        if (selectErr) console.error('TikTok webhook: select tiktok_shop_statements failed:', toClientError(selectErr))

        if (!existing && data.total_amount > 0) {
          // Auto-create piutang — F-14 fix: wajib jurnal Dr Piutang / Cr Penjualan
          // (sebelumnya piutang masuk tanpa jurnal → neraca tidak balance).
          const { data: piutang, error: piutangErr } = await supabase
            .from('piutang')
            .insert({
              customer_id: null,
              invoice_number: `TTK-WEB-${statementId.slice(0, 8)}`,
              invoice_date: new Date().toISOString().split('T')[0],
              amount: data.total_amount,
              channel: 'tiktok',
              description: `TikTok Shop auto settlement ${statementId.slice(0, 8)}`
            })
            .select('id')
            .single()
          if (piutangErr) console.error('TikTok webhook: insert piutang failed:', toClientError(piutangErr))

          if (piutang?.id) {
            try {
              const { createSimpleJournal } = await import('@/utils/journal/create')
              await createSimpleJournal({
                transaction_type: 'order_created',
                reference_type: 'piutang',
                reference_id: piutang.id,
                description: `Settlement TikTok ${statementId.slice(0, 8)} — piutang terutang`,
                amount: data.total_amount,
                baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
                supabase,
                idempotency_key: `tiktok_settlement:${statementId}`
              })
            } catch (jErr) {
              console.error('Gagal buat jurnal settlement TikTok:', jErr)
            }
          }

          const { error: stmtErr } = await supabase.from('tiktok_shop_statements').insert({
            statement_id: statementId,
            statement_type: data.type || 'AUTO_SETTLEMENT',
            total_amount: data.total_amount,
            status: 'SUCCESS',
            currency: data.currency || 'IDR',
            statement_data: data,
            is_synced: true,
            piutang_id: piutang?.id || null
          })
          if (stmtErr) console.error('TikTok webhook: insert tiktok_shop_statements failed:', toClientError(stmtErr))
        }
      }
    } else if (eventType === 'ORDER_REFUND' || eventType === 'REFUND_COMPLETED') {
      const refundOrderId = data.order_id
      if (refundOrderId) {
        const { error } = await supabase
          .from('tiktok_shop_orders')
          .update({
            payment_status: 'refunded',
            order_data: data,
            updated_at: new Date().toISOString()
          })
          .eq('tiktok_order_id', refundOrderId)
        if (error) console.error('TikTok webhook: update refund failed:', toClientError(error))
      }
    } else {
      console.log('Unhandled TikTok event:', eventType)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('TikTok webhook error:', err instanceof Error ? toClientError(err) : String(err))
    return NextResponse.json({ error: err instanceof Error ? toClientError(err) : String(err) }, { status: 500 })
  }
}
