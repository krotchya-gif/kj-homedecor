/**
 * Backfill order_items dari tiktok_shop_orders.order_data untuk semua main orders
 * yang sudah di-link tapi item-nya kosong (root cause "item pesanan ga keluar").
 *
 * Run: node scripts/backfill-tiktok-order-items.js
 * Idempotent: order yang sudah punya items TIDAK di-touch.
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function main() {
  const { data: tiktokOrders, error: fetchErr } = await sb
    .from('tiktok_shop_orders')
    .select('tiktok_order_id, order_data')

  if (fetchErr) {
    console.error('Fetch tiktok_shop_orders error:', fetchErr.message)
    process.exit(1)
  }

  console.log('tiktok_shop_orders:', tiktokOrders?.length)

  let ordersFixed = 0
  let itemsInserted = 0
  let ordersSkipped = 0
  let noMainOrder = 0

  for (const to of tiktokOrders || []) {
    // Cari main order by external id
    const { data: mainOrder } = await sb
      .from('orders')
      .select('id')
      .eq('order_id_external', to.tiktok_order_id)
      .maybeSingle()

    if (!mainOrder) {
      noMainOrder++
      continue
    }

    // Skip kalau sudah ada items
    const { count } = await sb
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', mainOrder.id)

    if (count && count > 0) {
      ordersSkipped++
      continue
    }

    const lineItems = (to.order_data || {}).line_items || []
    if (!lineItems.length) {
      console.log('  SKIP (no line_items):', to.tiktok_order_id)
      continue
    }

    let ok = 0
    for (const li of lineItems) {
      if (!li.product_name && !li.sku_name) continue
      const { error: itemErr } = await sb.from('order_items').insert({
        order_id: mainOrder.id,
        product_id: null,
        item_type: 'perabot',
        qty: Number(li.quantity ?? 1),
        price: Number(li.sale_price ?? li.original_price ?? 0),
        custom_specs: li.product_name || li.sku_name || null,
        size: li.sku_name && li.sku_name !== li.product_name ? li.sku_name : null
      })
      if (itemErr) {
        console.error('  INSERT ERROR', to.tiktok_order_id, itemErr.message)
        continue
      }
      ok++
      itemsInserted++
    }

    if (ok > 0) {
      ordersFixed++
      console.log(`  FIXED ${to.tiktok_order_id.slice(0, 12)}: ${ok} item(s)`)
    }
  }

  console.log('---')
  console.log('orders fixed:', ordersFixed)
  console.log('items inserted:', itemsInserted)
  console.log('orders skipped (sudah ada items):', ordersSkipped)
  console.log('no main order:', noMainOrder)
}

main()
