import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ['sorted', 'cancelled'],
  sorted: ['payment_ok', 'cancelled'],
  payment_ok: ['production', 'cancelled'],
  production: ['steam', 'cancelled'],
  steam: ['ready', 'cancelled'],
  ready: ['packed', 'done', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['done'],
  done: [],
  returned: [],
  cancelled: [],
}

// Role-based permissions for status transitions
// finance: only sorted→payment_ok (payment approval)
// admin: all transitions
// gudang: production→steam (QC pass)
// installer: packed→shipped (delivery)
const ROLE_STATUS_PERMISSIONS: Record<string, string[]> = {
  finance: ['sorted->payment_ok'],
  admin: [], // admin can do all transitions (handled separately)
  gudang: ['production->steam'],
  installer: ['packed->shipped'],
}

function isStatusTransitionAllowed(
  fromStatus: string,
  toStatus: string,
  userRole: string
): boolean {
  // Admin can do all transitions (except cancel which is always allowed)
  if (userRole === 'admin' || userRole === 'owner') return true

  // Check role-specific permissions
  const rolePerms = ROLE_STATUS_PERMISSIONS[userRole]
  if (rolePerms && rolePerms.length > 0) {
    const transition = `${fromStatus}->${toStatus}`
    if (!rolePerms.includes(transition)) {
      return false
    }
  } else if (userRole !== 'admin' && userRole !== 'owner') {
    // Other roles (penjahit, etc.) cannot change order status
    return false
  }

  return true
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const { data, error } = await supabase
    .from('orders')
    .select('*, customer:customers(*), order_items(*, product:products(name))')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  // Get requester role
  const { data: requester } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = requester?.role ?? 'admin'
  const body = await request.json()

  // Validate status transition if status is being changed
  if (body.status) {
    const { data: current } = await supabase.from('orders').select('status, payment_status, total_amount, dp_amount, lunas_amount').eq('id', id).single()

    if (!current) {
      return NextResponse.json({ data: null, error: { message: 'Order not found' } }, { status: 404 })
    }

    // Check role-based permission for this transition
    if (!isStatusTransitionAllowed(current.status, body.status, userRole)) {
      return NextResponse.json(
        { data: null, error: { message: `Role "${userRole}" tidak memiliki permission untuk mengubah status dari "${current.status}" ke "${body.status}"` } },
        { status: 403 }
      )
    }

    const allowed = VALID_STATUS_TRANSITIONS[current.status] ?? []
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        { data: null, error: { message: `Invalid status transition from "${current.status}" to "${body.status}". Allowed: ${allowed.join(', ') || 'none'}` } },
        { status: 400 }
      )
    }

    // Payment gate: cannot move to ready/packed/shipped/done unless payment_status is 'paid'
    if (['ready', 'packed', 'shipped', 'done'].includes(body.status)) {
      if (current.payment_status !== 'paid') {
        return NextResponse.json(
          { data: null, error: { message: 'Payment gate: order belum lunas. Finance harus approve pembayaran dulu.' } },
          { status: 403 }
        )
      }
    }
  }

  const { data, error } = await supabase.from('orders').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data: { deleted: true }, error: null })
}