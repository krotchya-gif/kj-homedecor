import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { createSimpleJournal } from '@/utils/journal/create'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  // Phase 1 (BUG-089): GET PO detail membawa data supplier + PR — batasi role pengadaan + finance.
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active' || !['gudang', 'admin', 'owner', 'finance'].includes(requester.role)) {
    return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, supplier:suppliers(*), pr:purchase_requests(*)')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ data: null, error: { message: toClientError(error) } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  // Security fix: wajib login + role gudang/admin/owner + status active (Phase 1)
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active' || !['gudang', 'admin', 'owner', 'finance'].includes(requester.role)) {
    return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
  }

  // Get current PO data (before update)
  const { data: currentPO } = await supabase
    .from('purchase_orders')
    .select('status, pr_id, actual_cost, id')
    .eq('id', id)
    .single()

  // Security fix: whitelist field (jangan body mentah)
  const ALLOWED_FIELDS = ['status', 'supplier_id', 'qty', 'actual_cost', 'notes']
  const updates: Record<string, unknown> = {}
  for (const k of ALLOWED_FIELDS) {
    if (k in body) updates[k] = body[k]
  }

  // BUG-062 fix (2026-08-13): guard transisi status — cegah received/paid dobel
  // (stok & jurnal purchase ganda) dan paid tanpa received (hutang negatif).
  // Transisi sah: pending → delivered → received → paid.
  const VALID_TRANSITIONS: Record<string, string[]> = {
    pending: ['delivered', 'received', 'pending'],
    delivered: ['received', 'delivered'],
    received: ['paid', 'received'],
    paid: ['paid']
  }

  if (body.status && currentPO) {
    const allowedNext = VALID_TRANSITIONS[currentPO.status] ?? []
    if (!allowedNext.includes(body.status)) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: `Transisi status tidak sah: ${currentPO.status} → ${body.status} (urutan: pending → delivered → received → paid)`
          }
        },
        { status: 400 }
      )
    }
    // Idempotent: status yang sama di-submit ulang → 200 tanpa aksi ganda
    if (body.status === currentPO.status) {
      const { data: existingPO } = await supabase
        .from('purchase_orders')
        .select('*, supplier:suppliers(*), pr:purchase_requests(*)')
        .eq('id', id)
        .single()
      return NextResponse.json({ data: existingPO, error: null })
    }
  }

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
        } catch (rpcErr) {
          console.warn('RPC increment_stock_gudang failed, falling back to direct update:', rpcErr instanceof Error ? toClientError(rpcErr) : String(rpcErr))
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
        // BUG-011 fix: jurnal pakai NOMINAL (actual_cost), bukan quantity materialQty.
        // BUG-009 fix: wajib baseUrl di server context.
        try {
          const poCost = Number(currentPO?.actual_cost ?? 0)
          if (isNaN(poCost) || poCost <= 0) {
            console.warn('Invalid actual_cost for PO received journal:', currentPO?.actual_cost)
          } else {
            await createSimpleJournal({
              transaction_type: 'purchase',
              reference_type: 'purchase_order',
              reference_id: id,
              description: `PO received — material stock in`,
              amount: poCost,
              baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
              supabase,
              idempotency_key: `po_received:${id}`
            })
          }
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
    // F-8 fix: pakai `hutang_paid` (Dr Hutang Supplier / Cr Kas) — bukan
    // `expense_paid` (Dr Beban Gaji) yang membuat beban dobel & hutang tak pernah turun.
    if (currentPO?.actual_cost) {
      const actualCostNum = Number(currentPO.actual_cost)
      if (isNaN(actualCostNum) || actualCostNum <= 0) {
        console.warn('Invalid actual_cost for journal entry:', currentPO.actual_cost)
      } else {
        try {
          await createSimpleJournal({
            transaction_type: 'hutang_paid',
            reference_type: 'purchase_order',
            reference_id: id,
            description: `PO payment — pelunasan tagihan supplier`,
            amount: actualCostNum,
            baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
            supabase,
            idempotency_key: `po_paid:${id}`
          })
        } catch (e) {
          console.warn('Failed to create journal entry for PO payment:', e)
        }
      }
    }
  }

  const { data, error } = await supabase.from('purchase_orders').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: toClientError(error) } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
