import { type NextRequest, NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { createServiceClient } from '@/utils/supabase/server'
import crypto from 'crypto'

// POST /api/shopee/webhook — push notification dari Shopee (order status dll).
// Verifikasi: header Authorization `SHA256 <hex>` = HMAC-SHA256(partner_key, raw body).
// Webhook hanya MENCATAT status — proses ke main orders tetap lewat Sync to Main Orders
// (mirror TikTok: webhook tidak membuat jurnal/payment tanpa user session).
export async function POST(req: NextRequest) {
  const db = createServiceClient()

  try {
    const rawBody = await req.text()
    const body = JSON.parse(rawBody)

    // Ambil partner_key dari DB (settings pertama) — fallback env untuk dev
    let partnerKey = process.env.SHOPEE_PARTNER_KEY
    const { data: settings } = await db
      .from('shopee_shop_settings')
      .select('partner_key')
      .limit(1)
      .maybeSingle()
    if (settings?.partner_key) partnerKey = settings.partner_key

    if (!partnerKey) {
      console.error('Shopee webhook: partner key tidak ditemukan (env/DB) — rejecting')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const authHeader = req.headers.get('authorization') || ''
    const signature = authHeader.replace(/^SHA256\s+/i, '').trim()
    if (!signature) {
      console.error('Shopee webhook: missing signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }
    const expected = crypto.createHmac('sha256', partnerKey).update(rawBody, 'utf8').digest('hex')
    const sigBuffer = Buffer.from(signature, 'utf-8')
    const expectedBuffer = Buffer.from(expected, 'utf-8')
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      console.error('Shopee webhook: invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Body: { code, data: <json string|object>, shop_id, timestamp }
    const code = Number(body.code ?? 0)
    const data = typeof body.data === 'string' ? JSON.parse(body.data) : body.data ?? {}

    console.log('Shopee webhook received: code', code, JSON.stringify(data).slice(0, 200))

    // Code 3 = order status update; 4 = trackingNo — dua-duanya update status order
    if (code === 3 || code === 4) {
      const orderSn = data.order_sn || data.orderSn
      const orderStatus = data.order_status || data.orderStatus
      if (orderSn && orderStatus) {
        await db.from('shopee_shop_orders').upsert(
          {
            order_sn: orderSn,
            order_status: orderStatus,
            payment_status:
              orderStatus === 'CANCELLED' || orderStatus === 'IN_CANCEL'
                ? 'cancelled'
                : ['READY_TO_SHIP', 'PROCESSED', 'SHIPPED', 'COMPLETED'].includes(orderStatus)
                  ? 'paid'
                  : 'pending',
            order_data: data,
            synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          { onConflict: 'order_sn' }
        )
      }
    } else {
      console.log('Unhandled Shopee webhook code:', code)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Shopee webhook error:', err instanceof Error ? toClientError(err) : String(err))
    return NextResponse.json({ error: err instanceof Error ? toClientError(err) : String(err) }, { status: 500 })
  }
}
