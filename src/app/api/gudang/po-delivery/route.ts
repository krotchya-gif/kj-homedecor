import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth, requireAuthRole, checkRateLimit } from '@/lib/auth'

// GET — list POs that are delivered (status = 'delivered') and not yet confirmed received by Gudang
export async function GET(request: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { supabase } = auth

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('purchase_orders')
    .select('*, supplier:suppliers(name), pr:purchase_requests(material:materials(name, unit))', { count: 'exact' })
    .eq('status', 'delivered')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  return NextResponse.json({ data, pagination: { page, limit, total: count ?? 0 }, error: null })
}

// POST — Gudang confirms receipt of a delivered PO → status becomes 'received' + stock_gudang increment
export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimit.blocked) return NextResponse.json({ error: { message: 'Too many requests' } }, { status: 429 })

  const auth = await requireAuthRole(['gudang', 'admin', 'owner'])
  if (auth.error) return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
  const { supabase, user } = auth

  const body = await request.json()
  const { po_id } = body

  if (!po_id) return NextResponse.json({ error: { message: 'po_id is required' } }, { status: 400 })

  // Get current PO with PR info
  const { data: currentPO, error: fetchErr } = await supabase
    .from('purchase_orders')
    .select('*, pr:purchase_requests(material_id, qty, material:materials(name))')
    .eq('id', po_id)
    .single()

  if (fetchErr || !currentPO) {
    return NextResponse.json({ error: { message: 'PO not found' } }, { status: 404 })
  }

  if (currentPO.status !== 'delivered') {
    return NextResponse.json({ error: { message: `PO status is '${currentPO.status}', must be 'delivered' first` } }, { status: 400 })
  }

  // Update PO status to received
  const { error: updateErr } = await supabase
    .from('purchase_orders')
    .update({ status: 'received', received_at: new Date().toISOString() })
    .eq('id', po_id)

  if (updateErr) return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })

  // Increment stock_gudang for the material
  const pr = currentPO.pr as any
  if (pr?.material_id) {
    const materialQty = Number(pr.qty)
    if (!isNaN(materialQty) && materialQty > 0) {
      try {
        await supabase.rpc('increment_stock_gudang', { material_id: pr.material_id, amount: materialQty })
      } catch {
        // Fallback direct update
        const { data: mat } = await supabase.from('materials').select('stock_gudang').eq('id', pr.material_id).single()
        if (mat) {
          await supabase.from('materials').update({ stock_gudang: (mat.stock_gudang ?? 0) + materialQty }).eq('id', pr.material_id)
        }
      }
      // Record inventory movement
      await supabase.from('inventory_movements').insert({
        material_id: pr.material_id,
        type: 'in',
        qty: materialQty,
        to_location: 'gudang',
        reason: `PO delivery confirmed by Gudang — PO ${po_id.slice(0, 8)}`,
        created_by: user?.id ?? null,
      })
    }
  }

  return NextResponse.json({ data: { id: po_id, status: 'received' }, error: null })
}
