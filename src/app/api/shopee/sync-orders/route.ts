import { type NextRequest, NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { createClient, createServiceClient } from '@/utils/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/auth'
import { createShopeeSDK } from '@/lib/shopee'

// POST /api/shopee/sync-orders — tarik order dari Shopee (get_order_list + detail).
// Body opsional: { time_from?: unix, time_to?: unix } — default 15 hari terakhir.
const SHOPEE_PAID_STATUSES = ['READY_TO_SHIP', 'PROCESSED', 'SHIPPED', 'COMPLETED']

export async function POST(req: NextRequest) {
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
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active' || !['owner', 'admin', 'finance'].includes(requester.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { sdk, settings } = (await createShopeeSDK()) ?? {}
  if (!sdk) {
    return NextResponse.json({ error: 'Shopee belum dikonfigurasi — isi Partner ID/Key di /owner/shopee' }, { status: 400 })
  }
  if (!settings?.is_active) {
    return NextResponse.json({ error: 'Shopee belum terhubung — lakukan Authorize dulu' }, { status: 400 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const now = Math.floor(Date.now() / 1000)
    const timeTo = Number(body.time_to ?? now)
    const timeFrom = Number(body.time_from ?? timeTo - 15 * 86400)

    let cursor = ''
    let total = 0
    let hasMore = true
    const db = createServiceClient()

    while (hasMore) {
      const res = await sdk.order.getOrderList({
        time_range_field: 'update_time',
        time_from: timeFrom,
        time_to: timeTo,
        page_size: 100,
        cursor
      })
      const orderList = res.response?.order_list ?? []
      cursor = res.response?.next_cursor ?? ''
      hasMore = res.response?.more ?? false

      // Detail per batch (maks 50/request)
      for (let i = 0; i < orderList.length; i += 50) {
        const batch = orderList.slice(i, i + 50).map((o) => o.order_sn)
        const detailRes = await sdk.order.getOrdersDetail({
          order_sn_list: batch,
          response_optional_fields:
            'buyer_username,recipient_address,item_list,total_amount,pay_time,actual_shipping_fee'
        })
        for (const od of detailRes.response?.order_list ?? []) {
          const addr = (od.recipient_address ?? {}) as {
            name?: string
            phone?: string
            full_address?: string
            address?: string
            city?: string
            state?: string
          }
          const addressParts = [addr.full_address || addr.address, addr.city, addr.state].filter(Boolean).join(', ')
          const totalAmount = Number(od.total_amount ?? 0)
          const shippingAmount = Number(od.actual_shipping_fee ?? 0)
          const paymentStatus = od.order_status === 'CANCELLED' || od.order_status === 'IN_CANCEL'
            ? 'cancelled'
            : SHOPEE_PAID_STATUSES.includes(od.order_status ?? '')
              ? 'paid'
              : 'pending'

          await db.from('shopee_shop_orders').upsert(
            {
              order_sn: od.order_sn,
              order_status: od.order_status ?? null,
              payment_status: paymentStatus,
              total_amount: totalAmount,
              shipping_amount: shippingAmount,
              buyer_name: addr.name ?? od.buyer_username ?? null,
              buyer_phone: addr.phone ?? null,
              shipping_address: addressParts || null,
              order_data: od,
              synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            { onConflict: 'order_sn' }
          )
          total++
        }
      }
    }

    return NextResponse.json({ success: true, synced: total, message: `${total} order Shopee disinkronkan` })
  } catch (err) {
    console.error('Shopee sync-orders error:', err)
    return NextResponse.json({ error: err instanceof Error ? toClientError(err) : String(err) }, { status: 500 })
  }
}
