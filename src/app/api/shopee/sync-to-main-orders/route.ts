import { type NextRequest, NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { createClient } from '@/utils/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/auth'

// POST /api/shopee/sync-to-main-orders — proses order Shopee → main order via RPC
// process_shopee_order_atomic / cancel_shopee_order_atomic (BLOCK on error, mirror TikTok).
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

  try {
    const { data: paidOrders, error: fetchErr } = await supabase
      .from('shopee_shop_orders')
      .select('order_sn')
      .eq('payment_status', 'paid')
      .neq('order_status', 'CANCELLED')
    if (fetchErr) {
      return NextResponse.json({ error: toClientError(fetchErr) }, { status: 500 })
    }

    let created = 0
    let skipped = 0

    for (const so of paidOrders ?? []) {
      const { data, error: rpcErr } = await supabase.rpc('process_shopee_order_atomic', {
        p_order_sn: so.order_sn,
        p_actor: user.id
      })
      if (rpcErr) {
        // BLOCK: order tidak hilang diam-diam dari sync — caller bisa lihat error & retry
        return NextResponse.json(
          { error: `Gagal proses order Shopee ${so.order_sn}: ${toClientError(rpcErr)}`, created, skipped },
          { status: 500 }
        )
      }
      const result = (data ?? {}) as { was_new?: boolean }
      if (result.was_new) created++
      else skipped++
    }

    // Sinkronisasi pembatalan — order CANCELLED di Shopee → main order ikut dibatalkan
    let cancelled = 0
    const { data: cancelledOrders } = await supabase
      .from('shopee_shop_orders')
      .select('order_sn')
      .eq('order_status', 'CANCELLED')
    for (const co of cancelledOrders ?? []) {
      const { data: mainOrder } = await supabase
        .from('orders')
        .select('id, status')
        .eq('order_id_external', co.order_sn)
        .maybeSingle()
      if (!mainOrder || mainOrder.status === 'cancelled') continue
      const { error: cancelErr } = await supabase.rpc('cancel_shopee_order_atomic', {
        p_order_id: mainOrder.id,
        p_reason: 'Dibatalkan di Shopee (sinkronisasi otomatis)',
        p_actor: user.id
      })
      if (cancelErr) {
        return NextResponse.json(
          { error: `Gagal batalkan order Shopee ${co.order_sn}: ${toClientError(cancelErr)}`, created, skipped, cancelled },
          { status: 500 }
        )
      }
      cancelled++
    }

    return NextResponse.json({
      created,
      skipped,
      cancelled,
      total: (paidOrders ?? []).length,
      message: `Linked ${created} Shopee orders to main orders, ${skipped} already linked, ${cancelled} cancelled`
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? toClientError(err) : String(err) }, { status: 500 })
  }
}
