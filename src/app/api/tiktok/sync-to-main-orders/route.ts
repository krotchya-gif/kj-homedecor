import { type NextRequest, NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { createClient } from '@/utils/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/auth'

interface TikTokOrderRow {
  tiktok_order_id: string
  order_status?: string | null
}

export async function POST(req: NextRequest) {
  // Phase 2 (BUG-091): rate limit — cegah spam link order (insert order + jurnal).
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

  // F-19 fix: hanya owner/admin/finance yang boleh link order TikTok ke main orders
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active' || !['owner', 'admin', 'finance'].includes(requester.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Ambil semua tiktok orders yg status PAID dan belum di-link ke main orders
    const { data: tiktokOrders, error: fetchErr } = await supabase
      .from('tiktok_shop_orders')
      .select('tiktok_order_id')
      .eq('payment_status', 'PAID')
      .neq('order_status', 'CANCELLED')

    if (fetchErr) {
      return NextResponse.json({ error: toClientError(fetchErr) }, { status: 500 })
    }

    console.log('tiktokOrders count:', tiktokOrders?.length)

    let created = 0
    let skipped = 0

    // SESI 52 (#15): konsolidasi ke RPC process_tiktok_order_atomic (SECURITY DEFINER).
    // Satu transaksi server: buat/repair order + payment lunas (verified_by NULL,
    // platform sudah verifikasi → auto-skip Cek Bayar) + jurnal order_created +
    // order_items (hanya saat order BARU — sync ulang tidak menduplikat).
    // Payment & jurnal idempotent per order → aman di-call berulang (repair crash).
    for (const to of tiktokOrders || []) {
      const { data, error: rpcErr } = await supabase.rpc('process_tiktok_order_atomic', {
        p_tiktok_order_id: to.tiktok_order_id,
        p_actor: user.id
      })
      if (rpcErr) {
        // 2026-08-12: BLOCK (bukan `continue`) kalau gagal — order tidak hilang
        // diam-diam dari sync; caller bisa lihat error & retry.
        return NextResponse.json(
          {
            error: `Gagal proses order TikTok ${to.tiktok_order_id}: ${toClientError(rpcErr)}`,
            created,
            skipped
          },
          { status: 500 }
        )
      }
      const result = (data ?? {}) as { was_new?: boolean }
      if (result.was_new) created++
      else skipped++
    }

    // F-13 fix: sinkronisasi PEMBATALAN — order TikTok yang di-CANCEL setelah
    // masuk main orders harus ikut dibatalkan (sebelumnya main order tetap
    // 'sorted'/'done' dengan payment_status 'paid' → produksi jalan sia-sia).
    // SESI 52 (#15): pakai cancel_tiktok_order_atomic — void payment + reversal
    // jurnal order_created + order_logs dalam satu transaksi server.
    let cancelled = 0
    const { data: cancelledOrders } = await supabase
      .from('tiktok_shop_orders')
      .select('tiktok_order_id, order_status')
      .eq('order_status', 'CANCELLED')
    for (const co of (cancelledOrders ?? []) as TikTokOrderRow[]) {
      const { data: mainOrder } = await supabase
        .from('orders')
        .select('id, status')
        .eq('order_id_external', co.tiktok_order_id)
        .maybeSingle()
      if (!mainOrder) continue
      if (mainOrder.status === 'cancelled') continue
      const { error: cancelErr } = await supabase.rpc('cancel_tiktok_order_atomic', {
        p_order_id: mainOrder.id,
        p_reason: 'Dibatalkan di TikTok Shop (sinkronisasi otomatis)',
        p_actor: user.id
      })
      if (cancelErr) {
        console.error('Gagal cancel main order TikTok:', cancelErr)
        // BLOCK: reversal jurnal tidak boleh dilewati diam-diam
        return NextResponse.json(
          {
            error: `Gagal batalkan order TikTok ${co.tiktok_order_id}: ${toClientError(cancelErr)}`,
            created,
            skipped,
            cancelled
          },
          { status: 500 }
        )
      }
      cancelled++
    }

    return NextResponse.json({
      created,
      skipped,
      cancelled,
      total: (tiktokOrders || []).length,
      message: `Linked ${created} TikTok orders to main orders, ${skipped} already linked, ${cancelled} cancelled`
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? toClientError(err) : String(err) }, { status: 500 })
  }
}
