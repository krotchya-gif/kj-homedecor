import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

// SESI 53: uji RPC atomic Shopee (process/cancel/escrow) user-level setara jalur server:
// dipanggil dengan service_role + p_actor user asli (branch service_role di
// actor_is_active_with_role) + render halaman. RLS mirror TikTok (pola sudah terverifikasi).
function loadEnv() {
  const raw = fs.readFileSync(path.join(__dirname, '..', '..', '.env.local'), 'utf8')
  const env: Record<string, string> = {}
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return env
}

test.describe.serial('Shopee Seller', () => {
  test('RPC atomic shopee + render /admin/shopee', async ({ browser }) => {
    const env = loadEnv()
    const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    const orderSn = `E2E-SHOPEE-${Date.now()}`

    const { data: adminRow } = await sb.from('users').select('id').eq('role', 'admin').eq('status', 'active').limit(1).maybeSingle()
    const actor = adminRow!.id

    // 1. Insert dummy order Shopee
    const { error: insErr } = await sb.from('shopee_shop_orders').insert({
      order_sn: orderSn,
      order_status: 'COMPLETED',
      payment_status: 'paid',
      total_amount: 1000000,
      shipping_amount: 50000,
      buyer_name: 'E2E Buyer',
      shipping_address: 'Jl. E2E 1',
      order_data: {
        item_list: [
          { item_name: 'Gorden E2E', model_name: '120x250', model_quantity_purchased: 2, model_discounted_price: 500000 }
        ]
      }
    })
    expect(insErr, `insert shopee order: ${insErr?.message}`).toBeNull()

    // 2. Process → main order
    const { data: r1, error: e1 } = await sb.rpc('process_shopee_order_atomic', { p_order_sn: orderSn, p_actor: actor })
    expect(e1, `process: ${e1?.message}`).toBeNull()
    const orderId = (r1 as { order_id: string }).order_id

    const { data: mainOrder } = await sb.from('orders').select('order_number, status, payment_status, total_amount, order_id_external').eq('id', orderId).single()
    expect(mainOrder).toMatchObject({ order_id_external: orderSn, status: 'done', payment_status: 'paid', total_amount: 1000000 })

    const { count: itemCount } = await sb.from('order_items').select('id', { count: 'exact', head: true }).eq('order_id', orderId)
    const { count: payCount } = await sb.from('payments').select('id', { count: 'exact', head: true }).eq('order_id', orderId)
    expect(itemCount).toBe(1)
    expect(payCount).toBe(1)

    // 3. Process ulang → idempotent
    await sb.rpc('process_shopee_order_atomic', { p_order_sn: orderSn, p_actor: actor })
    const { count: itemCount2 } = await sb.from('order_items').select('id', { count: 'exact', head: true }).eq('order_id', orderId)
    expect(itemCount2).toBe(1)

    // 4. Escrow → jurnal settlement
    const { error: updErr } = await sb
      .from('shopee_shop_orders')
      .update({ escrow_amount: 880000, commission_fee: 50000, transaction_fee: 10000, service_fee: 10000, escrow_release_time: new Date().toISOString() })
      .eq('order_sn', orderSn)
    expect(updErr).toBeNull()
    const { data: r3, error: e3 } = await sb.rpc('process_shopee_escrow_atomic', { p_order_sn: orderSn, p_actor: actor })
    expect(e3, `escrow: ${e3?.message}`).toBeNull()
    expect((r3 as { synced: boolean }).synced).toBe(true)

    const { data: escrowJournal } = await sb.from('journal_entries').select('*').eq('idempotency_key', `shopee_escrow:${orderSn}`).maybeSingle()
    expect(escrowJournal, 'jurnal escrow harus ada').not.toBeNull()
    const { data: shopeeRow } = await sb.from('shopee_shop_orders').select('is_synced').eq('order_sn', orderSn).single()
    expect(shopeeRow?.is_synced).toBe(true)

    // Escrow ulang → idempotent
    const { data: r4 } = await sb.rpc('process_shopee_escrow_atomic', { p_order_sn: orderSn, p_actor: actor })
    expect((r4 as { idempotent: boolean }).idempotent).toBe(true)

    // 5. Cancel → void + reversal
    const { error: e5 } = await sb.rpc('cancel_shopee_order_atomic', { p_order_id: orderId, p_reason: 'E2E cleanup cancel', p_actor: actor })
    expect(e5, `cancel: ${e5?.message}`).toBeNull()
    const { data: cancelledOrder } = await sb.from('orders').select('status').eq('id', orderId).single()
    expect(cancelledOrder?.status).toBe('cancelled')
    const { count: voidedPay } = await sb.from('payments').select('id', { count: 'exact', head: true }).eq('order_id', orderId).not('voided_at', 'is', null)
    expect(voidedPay).toBe(1)

    // 6. Cleanup penuh
    await sb.from('order_logs').delete().eq('order_id', orderId)
    await sb.from('order_items').delete().eq('order_id', orderId)
    await sb.from('payments').delete().eq('order_id', orderId)
    await sb.from('journal_entries').delete().eq('reference_id', orderId)
    await sb.from('journal_entries').delete().eq('idempotency_key', `shopee_escrow:${orderSn}`)
    await sb.from('orders').delete().eq('id', orderId)
    await sb.from('shopee_shop_orders').delete().eq('order_sn', orderSn)

    // 7. Render halaman admin/shopee (UI)
    const AUTH = path.join(__dirname, '.auth')
    const ctx = await browser.newContext({ storageState: path.join(AUTH, 'admin.json') })
    const page = await ctx.newPage()
    await page.goto('http://localhost:3000/admin/shopee')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /shopee seller/i })).toBeVisible()
    await ctx.close()
  })
})
