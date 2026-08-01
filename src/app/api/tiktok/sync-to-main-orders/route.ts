import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(_req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

      const { error: insertErr } = await supabase.from('orders').insert({
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

      // Sync line items dari TikTok ke order_items — root cause "item pesanan ga keluar":
      // sebelumnya order dibuat TANPA order_items sama sekali.
      const lineItems = (to.order_data as any)?.line_items ?? []
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

    return NextResponse.json({
      created,
      skipped,
      total: (tiktokOrders || []).length,
      message: `Linked ${created} TikTok orders to main orders, ${skipped} already linked`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
