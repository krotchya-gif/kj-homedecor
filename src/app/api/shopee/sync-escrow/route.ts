import { type NextRequest, NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { createClient, createServiceClient } from '@/utils/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/auth'
import { createShopeeSDK } from '@/lib/shopee'

// POST /api/shopee/sync-escrow — tarik escrow (settlement per order) dari Shopee:
// get_escrow_list (rentang release_time) + get_escrow_detail_batch (fee & net).
// Body opsional: { time_from?: unix, time_to?: unix } — default 30 hari terakhir.
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

  const body = await req.json().catch(() => ({}))
  const { sdk, settings } = (await createShopeeSDK(body?.shop_id as string | undefined)) ?? {}
  if (!sdk) {
    return NextResponse.json({ error: 'Shopee belum dikonfigurasi' }, { status: 400 })
  }
  if (!settings?.is_active) {
    return NextResponse.json({ error: 'Shopee belum terhubung' }, { status: 400 })
  }

  try {
    const now = Math.floor(Date.now() / 1000)
    const timeTo = Number(body.time_to ?? now)
    // WAVE 2 (2026-08-15): Tanggal Mulai Sync per-shop — jepit rentang escrow ke batas bawah
    let timeFrom = Number(body.time_from ?? timeTo - 30 * 86400)
    if (settings.sync_start_date) {
      const minTs = Math.floor(new Date(settings.sync_start_date).getTime() / 1000)
      if (timeFrom < minTs) timeFrom = minTs
    }

    const db = createServiceClient()
    // Paginated escrow — Shopee get_escrow_list page_no loop (mirror order pagination)
    let pageNo = 1
    let moreEscrow = true
    const allEscrow: Awaited<ReturnType<typeof sdk.payment.getEscrowList>>['response']['escrow_list'] = []
    while (moreEscrow) {
      const escrowList = await sdk.payment.getEscrowList({
        release_time_from: timeFrom,
        release_time_to: timeTo,
        page_size: 100,
        page_no: pageNo
      })
      const batch = escrowList.response?.escrow_list ?? []
      allEscrow.push(...(batch as typeof allEscrow))
      const more = (escrowList.response as unknown as { more?: boolean })?.more
      if (more === false || batch.length < 100) moreEscrow = false
      else pageNo++
      if (pageNo > 50) break // safety cap 5000 escrow
    }
    const list = allEscrow
    let updated = 0

    // Simpan escrow_amount & release_time per order
    for (const esc of list) {
      const orderSn = esc.order_sn
      if (!orderSn) continue
      const { data: existing } = await db
        .from('shopee_shop_orders')
        .select('id')
        .eq('order_sn', orderSn)
        .maybeSingle()
      if (!existing) continue
      const { error } = await db
        .from('shopee_shop_orders')
        .update({
          shop_id: settings.shop_id ?? null,
          escrow_amount: Number(esc.payout_amount ?? 0),
          escrow_release_time: esc.escrow_release_time
            ? new Date(esc.escrow_release_time * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString()
        })
        .eq('order_sn', orderSn)
      if (!error) updated++
    }

    // Detail fee (commission/transaction/service) untuk order ber-escrow yang belum lengkap
    const { data: pendingFee } = await db
      .from('shopee_shop_orders')
      .select('order_sn')
      .gt('escrow_amount', 0)
      .or('commission_fee.eq.0,commission_fee.is.null')
      .limit(50)
    const orderSns = (pendingFee ?? []).map((r: { order_sn: string }) => r.order_sn)
    if (orderSns.length > 0) {
      const detailRes = await sdk.payment.getEscrowDetailBatch({ order_sn_list: orderSns })
      for (const inc of detailRes.response?.order_income_list ?? []) {
        const income = (inc as unknown as { order_income?: Record<string, number> }).order_income ?? {}
        await db
          .from('shopee_shop_orders')
          .update({
            commission_fee: Number(income.commission_fee ?? 0),
            transaction_fee: Number(income.seller_transaction_fee ?? income.transaction_fee ?? 0),
            service_fee: Number(income.service_fee ?? 0),
            shipping_amount: Number(income.actual_shipping_fee ?? 0),
            updated_at: new Date().toISOString()
          })
          .eq('order_sn', (inc as { order_sn: string }).order_sn)
      }
    }

    return NextResponse.json({ success: true, escrow_updated: updated, message: `${list.length} escrow disinkronkan` })
  } catch (err) {
    console.error('Shopee sync-escrow error:', err)
    return NextResponse.json({ error: err instanceof Error ? toClientError(err) : String(err) }, { status: 500 })
  }
}
