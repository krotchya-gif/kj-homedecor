import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getTikTokSettings, getValidToken, signTikTokRequest } from '@/lib/tiktok'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // F-19 fix: hanya owner/admin/finance yang boleh trigger sync TikTok
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

  const token = await getValidToken(settings)
  if (!token) {
    return NextResponse.json({ error: 'Access token not available' }, { status: 400 })
  }

  try {
    // Call TikTok Shop API to get orders with signed request
    // page_size must be in BOTH query string and body for correct signature
    const reqBody: Record<string, unknown> = {
      page_size: 100
    }
    if (start_date) {
      reqBody.create_time_ge = Math.floor(new Date(start_date).getTime() / 1000)
    }
    if (end_date) {
      reqBody.create_time_lt = Math.floor(new Date(end_date).getTime() / 1000)
    }

    const extraQs: Record<string, string> = {
      page_size: '100'
    }
    if (settings.shop_cipher) {
      extraQs.shop_cipher = settings.shop_cipher
    }

    const url = signTikTokRequest(
      '/order/202309/orders/search',
      settings.app_key,
      settings.app_secret,
      reqBody,
      extraQs
    )

    const orderListRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tts-access-token': token
      },
      body: JSON.stringify(reqBody)
    })

    const orderData = await orderListRes.json()

    // Check for TikTok API errors
    if (orderData.code && orderData.code !== 0) {
      return NextResponse.json(
        {
          error: `TikTok API error (${orderData.code}): ${orderData.message || 'Unknown error'}`
        },
        { status: 400 }
      )
    }

    if (!orderData.data?.orders) {
      return NextResponse.json({ synced: 0, message: 'No orders found' })
    }

    let synced = 0
    for (const order of orderListRes.ok ? orderData.data.orders : []) {
      const { data: existing } = await supabase
        .from('tiktok_shop_orders')
        .select('id')
        .eq('tiktok_order_id', order.id)
        .maybeSingle()

      if (!existing) {
        // TikTok API field mapping — payment details are in nested payment object
        const payment = order.payment || {}
        const totalAmount = payment.total_amount ? Number(payment.total_amount) : 0
        const shippingFee = payment.shipping_fee ? Number(payment.shipping_fee) : 0
        // BUG-017 fix (2026-08-11): catat komisi/biaya marketplace yang BENAR.
        // Sebelumnya commission_fee selalu 0 dan net_amount tidak kurangi komisi
        // → selisih gross vs net settlement menguap dari pembukuan.
        const commissionFee = payment.commission_fee ? Number(payment.commission_fee) : 0
        // platform_fee = komisi + iklan + biaya lain dari API (jika tersedia)
        const platformFee =
          payment.platform_fee !== undefined && payment.platform_fee !== null
            ? Number(payment.platform_fee)
            : commissionFee + (payment.seller_discount ? Math.abs(Number(payment.seller_discount)) : 0)
        const netAmount = Math.max(0, totalAmount - shippingFee - commissionFee)

        // CRITICAL: cek error insert — kalau gagal (constraint/RLS/schema drift),
        // order hilang dari sync diam-diam + counter `synced` salah. Blokir alur.
        const { error: insErr } = await supabase.from('tiktok_shop_orders').insert({
          tiktok_order_id: order.id,
          order_status: order.status || order.order_status,
          payment_status: order.status === 'COMPLETED' || order.status === 'DELIVERED' ? 'PAID' : order.status,
          total_amount: totalAmount,
          shipping_amount: shippingFee,
          platform_fee: platformFee,
          commission_fee: commissionFee,
          net_amount: netAmount,
          currency: payment.currency || 'IDR',
          buyer_name: order.recipient_address?.name || order.buyer_user_name,
          buyer_phone: order.recipient_address?.phone_number,
          shipping_address: order.recipient_address?.full_address,
          order_date: order.create_time ? new Date(order.create_time * 1000).toISOString() : null,
          order_data: order
        })
        if (insErr) {
          return NextResponse.json(
            {
              error: `Gagal simpan order TikTok ${order.id}: ${insErr.message}`,
              synced,
              failedOrderId: order.id
            },
            { status: 500 }
          )
        }
        synced++
      }
    }

    return NextResponse.json({
      synced,
      total: orderData.data.orders.length,
      message: `Synced ${synced} new orders`
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
