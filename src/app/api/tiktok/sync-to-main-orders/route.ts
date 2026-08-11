import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface TikTokLineItem {
  sale_price?: number | string
  original_price?: number | string
  product_name?: string
  product_id?: string
  quantity?: number | string
  sku_id?: string
  sku_name?: string
}

export async function POST(_req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // F-19 fix: hanya owner/admin/finance yang boleh link order TikTok ke main orders
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active' || !['owner', 'admin', 'finance'].includes(requester.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Ambil semua tiktok orders yg status PAID dan belum di-link ke main orders
    const { data: tiktokOrders, error: fetchErr } = await supabase
      .from('tiktok_shop_orders')
      .select('*')
      .eq('payment_status', 'PAID')
      .neq('order_status', 'CANCELLED')

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    console.log('tiktokOrders count:', tiktokOrders?.length)

    let created = 0
    let skipped = 0

    for (const to of tiktokOrders || []) {
      // Cek apakah order_id_external udah ada di main orders
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('order_id_external', to.tiktok_order_id)
        .maybeSingle()

      if (existing) {
        skipped++
        continue
      }

      // Nomor order otomatis (ORD-YYYY-NNNN) — sebelumnya order TikTok order_number NULL
      const { data: orderNum } = await supabase.rpc('generate_order_number')

      const { error: insertErr } = await supabase.from('orders').insert({
        order_number: orderNum ?? undefined,
        order_id_external: to.tiktok_order_id,
        source: 'tiktok',
        customer_id: null,
        classification: 'kirim',
        // 2026-07-31 Opsi A: e-commerce auto-skip cek bayar — pembayaran platform sudah terverifikasi.
        // Masuk langsung 'sorted' (siap sortir gudang), bukan lewat payment_ok.
        status: to.order_status === 'COMPLETED' ? 'done' : 'sorted',
        total_amount: Number(to.total_amount || 0),
        dp_amount: 0,
        lunas_amount: Number(to.total_amount || 0),
        shipping_cost: Number(to.shipping_amount || 0),
        payment_status: 'paid',
        order_date: to.order_date || null,
        notes: `TikTok Shop order — ${to.buyer_name || 'Unknown'}`,
        shipping_address: to.shipping_address || null
      })

      if (insertErr) {
        console.error('Failed to insert order:', insertErr, 'tiktok_order:', to.tiktok_order_id)
        continue
      }

      // Ambil id order yg baru dibuat untuk link order_items
      const { data: newOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('order_id_external', to.tiktok_order_id)
        .maybeSingle()

      if (!newOrder) {
        console.error('Order inserted but id not found:', to.tiktok_order_id)
        continue
      }

      // F-13 fix: order TikTok harus tercatat di pembukuan —
      // row payments (lunas) + jurnal order_created + payment_received
      // (sebelumnya: order 'paid' tanpa payment & tanpa jurnal → revenue
      // tidak masuk laba-rugi, piutang ter-kredit tanpa pernah di-debit).
      const amountNum = Number(to.total_amount || 0)
      if (amountNum > 0) {
        const { error: payErr } = await supabase.from('payments').insert({
          order_id: newOrder.id,
          type: 'lunas',
          amount: amountNum,
          date: new Date().toISOString(),
          verified_by: null,
          verified_at: new Date().toISOString(),
          notes: `Auto-catat TikTok Shop (settlement platform) — ${to.tiktok_order_id}`
        })
        if (payErr) console.error('Gagal catat payment TikTok:', payErr)

        try {
          const { createSimpleJournal } = await import('@/utils/journal/create')
          await createSimpleJournal({
            transaction_type: 'order_created',
            reference_type: 'order',
            reference_id: newOrder.id,
            description: `Order TikTok ${to.tiktok_order_id} — ${to.buyer_name || 'Unknown'}`,
            amount: amountNum,
            baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
            supabase,
            idempotency_key: `tiktok_sync_order_created:${newOrder.id}`
          })
          await createSimpleJournal({
            transaction_type: 'payment_received',
            reference_type: 'order',
            reference_id: newOrder.id,
            description: `Pembayaran TikTok (platform settlement) — ${to.tiktok_order_id}`,
            amount: amountNum,
            baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
            supabase,
            idempotency_key: `tiktok_sync_payment:${newOrder.id}`
          })
        } catch (jErr) {
          console.error('Gagal buat jurnal TikTok order:', jErr)
        }
      }

      // Sync line items dari TikTok ke order_items — root cause "item pesanan ga keluar":
      // sebelumnya order dibuat TANPA order_items sama sekali.
      const lineItems = (to.order_data as unknown as { line_items?: TikTokLineItem[] } | null)?.line_items ?? []
      let itemCount = 0
      for (const li of lineItems) {
        const price = Number(li.sale_price ?? li.original_price ?? 0)
        if (!li.product_name && !li.sku_name) continue
        const { error: itemErr } = await supabase.from('order_items').insert({
          order_id: newOrder.id,
          product_id: null, // SKU TikTok tidak match produk lokal — tampil via custom_specs fallback
          item_type: 'perabot',
          qty: Number(li.quantity ?? 1),
          price,
          // Nama produk asli TikTok sebagai fallback render (kolom custom_specs tidak dipakai UI)
          custom_specs: li.product_name || li.sku_name || null,
          size: li.sku_name && li.sku_name !== li.product_name ? li.sku_name : null
        })
        if (itemErr) {
          console.error('Failed to insert order_item:', itemErr, 'tiktok_order:', to.tiktok_order_id)
          continue
        }
        itemCount++
      }
      console.log(`TikTok order ${to.tiktok_order_id}: ${itemCount} item(s) synced`)

      created++
    }

    // F-13 fix: sinkronisasi PEMBATALAN — order TikTok yang di-CANCEL setelah
    // masuk main orders harus ikut dibatalkan (sebelumnya main order tetap
    // 'sorted'/'done' dengan payment_status 'paid' → produksi jalan sia-sia).
    let cancelled = 0
    const { data: cancelledOrders } = await supabase
      .from('tiktok_shop_orders')
      .select('tiktok_order_id')
      .eq('order_status', 'CANCELLED')
    for (const co of cancelledOrders ?? []) {
      const { data: mainOrder } = await supabase
        .from('orders')
        .select('id, status')
        .eq('order_id_external', co.tiktok_order_id)
        .maybeSingle()
      if (!mainOrder) continue
      if (mainOrder.status === 'cancelled') continue
      const { error: cancelErr } = await supabase
        .from('orders')
        .update({ status: 'cancelled', payment_status: 'pending' })
        .eq('id', mainOrder.id)
      if (cancelErr) {
        console.error('Gagal cancel main order TikTok:', cancelErr)
      } else {
        cancelled++
      }
    }

    return NextResponse.json({
      created,
      skipped,
      cancelled,
      total: (tiktokOrders || []).length,
      message: `Linked ${created} TikTok orders to main orders, ${skipped} already linked, ${cancelled} cancelled`
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
