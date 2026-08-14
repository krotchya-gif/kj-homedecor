import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { checkRateLimit, getClientIp } from '@/lib/auth'

// GET — list POs that are delivered (status = 'delivered') and not yet confirmed received by Gudang
export async function GET(request: Request) {
  if (checkRateLimit(getClientIp(request), 120, 60_000).blocked) {
    return NextResponse.json({ data: null, error: { message: 'Too many requests' } }, { status: 429 })
  }
  const supabase = await createClient()
  // Security fix (2026-08-12): GET wajib login + role gudang/admin/owner
  // (sebelumnya tanpa auth sama sekali → data PO + supplier bocor ke siapa pun)
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active' || !['gudang', 'admin', 'owner'].includes(requester.role)) {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, supplier:suppliers(name), pr:purchase_requests(material:materials(name, unit))')
    .eq('status', 'delivered')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ data: null, error: { message: toClientError(error) } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

// POST — Gudang confirms receipt of a delivered PO → status becomes 'received' + stock_gudang increment
export async function POST(request: Request) {
  if (checkRateLimit(getClientIp(request), 30, 60_000).blocked) {
    return NextResponse.json({ data: null, error: { message: 'Too many requests' } }, { status: 429 })
  }
  const supabase = await createClient()
  const body = await request.json()
  const { po_id } = body

  if (!po_id) return NextResponse.json({ error: { message: 'po_id is required' } }, { status: 400 })

  const {
    data: { user }
  } = await supabase.auth.getUser()
  // Security fix: wajib login + role gudang/admin/owner + status active (Phase 1 BUG-089)
  if (!user) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active' || !['gudang', 'admin', 'owner'].includes(requester.role)) {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })
  }

  const { data, error } = await supabase.rpc('receive_purchase_order_atomic', {
    p_po_id: po_id,
    p_received_by: user.id
  })
  if (error) {
    const message = toClientError(error)
    const status = error.message?.includes('tidak ditemukan') ? 404 : 400
    return NextResponse.json({ error: { message } }, { status })
  }

  return NextResponse.json({ data, error: null })
}
