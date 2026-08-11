import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// GET — list POs that are delivered (status = 'delivered') and not yet confirmed received by Gudang
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, supplier:suppliers(name), pr:purchase_requests(material:materials(name, unit))')
    .eq('status', 'delivered')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

// POST — Gudang confirms receipt of a delivered PO → status becomes 'received' + stock_gudang increment
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { po_id } = body

  if (!po_id) return NextResponse.json({ error: { message: 'po_id is required' } }, { status: 400 })

  const {
    data: { user }
  } = await supabase.auth.getUser()
  // Security fix: wajib login + role gudang/admin/owner (sebelumnya fail-open!)
  if (!user) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
  const { data: requester } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!requester || !['gudang', 'admin', 'owner'].includes(requester.role)) {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })
  }

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
    return NextResponse.json(
      { error: { message: `PO status is '${currentPO.status}', must be 'delivered' first` } },
      { status: 400 }
    )
  }

  // Update PO status to received
  const { error: updateErr } = await supabase
    .from('purchase_orders')
    .update({ status: 'received', received_at: new Date().toISOString() })
    .eq('id', po_id)

  if (updateErr) return NextResponse.json({ error: { message: updateErr.message } }, { status: 500 })

  // Increment stock_gudang for the material
  const pr = currentPO.pr as unknown as { qty?: number; material_id?: string; material?: { name?: string; unit?: string } | null } | null
  if (pr?.material_id) {
    const materialQty = Number(pr.qty)
    if (!isNaN(materialQty) && materialQty > 0) {
      try {
        await supabase.rpc('increment_stock_gudang', { material_id: pr.material_id, amount: materialQty })
      } catch {
        // Fallback direct update
        const { data: mat } = await supabase.from('materials').select('stock_gudang').eq('id', pr.material_id).single()
        if (mat) {
          await supabase
            .from('materials')
            .update({ stock_gudang: (mat.stock_gudang ?? 0) + materialQty })
            .eq('id', pr.material_id)
        }
      }
      // Record inventory movement
      await supabase.from('inventory_movements').insert({
        material_id: pr.material_id,
        type: 'in',
        qty: materialQty,
        to_location: 'gudang',
        reason: `PO delivery confirmed by Gudang — PO ${po_id.slice(0, 8)}`,
        created_by: user?.id ?? null
      })
    }
  }

  return NextResponse.json({ data: { id: po_id, status: 'received' }, error: null })
}
