import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth, requireAuthRole, checkRateLimit } from '@/lib/auth'

const ALLOWED_PO_FIELDS = [
  'supplier_id', 'pr_id', 'status', 'expected_cost', 'actual_cost',
  'notes', 'order_date', 'received_at', 'paid_at', 'paid_by',
] as const

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  // Restrict to admin/owner/gudang/finance
  const { data: requester } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  const userRole = requester?.role ?? ''
  if (!['admin', 'owner', 'gudang', 'finance'].includes(userRole)) {
    return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
  const offset = (page - 1) * limit

  let query = supabase
    .from('purchase_orders')
    .select('*, supplier:suppliers(name), pr:purchase_requests(material:materials(name))')
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)

  const { data, error, count } = await query.range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  return NextResponse.json({ data, pagination: { page, limit, total: count ?? 0 }, error: null })
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimit.blocked) return NextResponse.json({ data: null, error: { message: 'Too many requests' } }, { status: 429 })

  const auth = await requireAuthRole(['admin', 'owner', 'gudang'])
  if (auth.error) return auth.error
  const { supabase } = auth

  const body = await request.json()

  // Whitelist fields
  const insertData: Record<string, any> = {}
  for (const field of ALLOWED_PO_FIELDS) {
    if (body[field] !== undefined) insertData[field] = body[field]
  }

  const { data, error } = await supabase.from('purchase_orders').insert(insertData).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
