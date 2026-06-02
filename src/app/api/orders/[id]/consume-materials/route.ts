import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/orders/[id]/consume-materials
 *
 * V3 Pipeline: Server-side atomic material consumption.
 * Called dari Gudang Production page saat production_jobs.status -> 'done'.
 *
 * Body: { production_job_id: string }
 *
 * Calls RPC `consume_materials_for_production` yang:
 * 1. Decrement stock_gudang (dengan GREATEST(0) guard)
 * 2. Insert order_material_consumption row per material
 * 3. Insert inventory_movements row per material (with FK order_id, production_job_id)
 *
 * Idempotent: kalau sudah pernah di-consume, return info tanpa re-process.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { data: null, error: { message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  // 2. Parse body
  const body = await request.json()
  const productionJobId: string = body.production_job_id

  if (!productionJobId) {
    return NextResponse.json(
      { data: null, error: { message: 'production_job_id wajib diisi' } },
      { status: 400 }
    )
  }

  // 3. Verify order exists & match
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, order_number')
    .eq('id', id)
    .single()

  if (orderErr || !order) {
    return NextResponse.json(
      { data: null, error: { message: 'Order tidak ditemukan' } },
      { status: 404 }
    )
  }

  // 4. Verify production_job exists & belongs to this order
  const { data: job, error: jobErr } = await supabase
    .from('production_jobs')
    .select('id, order_id, status')
    .eq('id', productionJobId)
    .eq('order_id', id)
    .single()

  if (jobErr || !job) {
    return NextResponse.json(
      { data: null, error: { message: 'Production job tidak ditemukan atau bukan milik order ini' } },
      { status: 404 }
    )
  }

  if (job.status !== 'done') {
    return NextResponse.json(
      { data: null, error: { message: `Production job belum 'done' (saat ini: ${job.status}). Material hanya bisa di-consume setelah job selesai.` } },
      { status: 400 }
    )
  }

  // 5. Call RPC (server-side atomic transaction)
  // RPC ini SECURITY DEFINER — bypass RLS untuk perform atomic stock decrement.
  const { data: rpcResult, error: rpcErr } = await supabase
    .rpc('consume_materials_for_production', {
      p_production_job_id: productionJobId,
      p_order_id: id,
      p_consumed_by: user.id,
    })

  if (rpcErr) {
    console.error('consume_materials_for_production RPC failed:', rpcErr)
    return NextResponse.json(
      { data: null, error: { message: 'Gagal consume materials: ' + rpcErr.message } },
      { status: 500 }
    )
  }

  // rpcResult is JSONB (auto-parsed by supabase-js to object)
  // Shape: { already_consumed: bool, consumption_count: int, total_qty: number }
  return NextResponse.json({
    data: {
      order_id: id,
      order_number: order.order_number,
      production_job_id: productionJobId,
      ...(rpcResult as any),
    },
    error: null,
  })
}
