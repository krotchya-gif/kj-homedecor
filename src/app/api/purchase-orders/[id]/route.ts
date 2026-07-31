import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { createSimpleJournal } from '@/utils/journal/create'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, supplier:suppliers(*), pr:purchase_requests(*)')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  // Get current PO data (before update)
  const { data: currentPO } = await supabase
    .from('purchase_orders')
    .select('status, pr_id, actual_cost')
    .eq('id', id)
    .single()

  // Handle status transitions
  const updates: any = { ...body }

  if (body.status === 'received') {
    updates.received_at = new Date().toISOString()

    // If PO has a linked PR, increment stock_gudang for the material
    if (currentPO?.pr_id) {
      const { data: pr } = await supabase
        .from('purchase_requests')
        .select('material_id, qty')
        .eq('id', currentPO.pr_id)
        .single()
      if (pr?.material_id) {
        const materialQty = Number(pr.qty)
        if (isNaN(materialQty) || materialQty <= 0) {
          return NextResponse.json({ data: null, error: { message: 'Invalid material quantity' } }, { status: 400 })
        }
        // Increment stock_gudang
        try {
          const { error: rpcError } = await supabase.rpc('increment_stock_gudang', {
            material_id: pr.material_id,
            amount: materialQty
          })
          if (rpcError) throw rpcError
        } catch (rpcErr: any) {
          console.warn('RPC increment_stock_gudang failed, falling back to direct update:', rpcErr?.message)
          const { data: mat } = await supabase
            .from('materials')
            .select('stock_gudang')
            .eq('id', pr.material_id)
            .single()
          if (!mat) {
            return NextResponse.json({ data: null, error: { message: 'Material not found' } }, { status: 404 })
          }
          await supabase
            .from('materials')
            .update({ stock_gudang: (mat.stock_gudang ?? 0) + materialQty })
            .eq('id', pr.material_id)
        }
        // Record inventory movement
        const { error: movError } = await supabase.from('inventory_movements').insert({
          material_id: pr.material_id,
          type: 'in',
          qty: materialQty,
          reason: `PO received — PO ${id.slice(0, 8)}`,
          created_by: user?.id ?? null
        })
        if (movError) {
          console.warn('Failed to record inventory movement:', movError)
        }

        // Auto-create journal entry for PO received (inventory masuk)
        try {
          await createSimpleJournal({
            transaction_type: 'purchase',
            reference_type: 'purchase_order',
            reference_id: id,
            description: `PO received — material stock in`,
            amount: materialQty
          })
        } catch (e) {
          console.warn('Failed to create journal entry for PO received:', e)
        }
      }
    }
  }

  if (body.status === 'paid') {
    updates.paid_at = new Date().toISOString()
    updates.paid_by = user?.id

    // Auto-create journal entry for PO payment (hutang lunas)
    if (currentPO?.actual_cost) {
      const actualCostNum = Number(currentPO.actual_cost)
      if (isNaN(actualCostNum) || actualCostNum <= 0) {
        console.warn('Invalid actual_cost for journal entry:', currentPO.actual_cost)
      } else {
        try {
          await createSimpleJournal({
            transaction_type: 'expense_paid',
            reference_type: 'purchase_order',
            reference_id: id,
            description: `PO payment — pelunasan tagihan supplier`,
            amount: actualCostNum
          })
        } catch (e) {
          console.warn('Failed to create journal entry for PO payment:', e)
        }
      }
    }
  }

  const { data, error } = await supabase.from('purchase_orders').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
