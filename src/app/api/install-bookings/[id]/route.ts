import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth, requireAuthRole, checkRateLimit } from '@/lib/auth'

const ALLOWED_INSTALL_BOOKING_FIELDS = [
  'installer_id', 'scheduled_date', 'scheduled_time', 'address', 'notes',
  'actual_date', 'type', 'customer_name', 'customer_phone',
] as const

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { id } = await params

  // IDOR protection: non-admin/owner/finance can only see their own bookings
  const { data: requester } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  const userRole = requester?.role ?? ''

  let query = supabase
    .from('install_bookings')
    .select('*, customer:customers(*), installer:users(name), order:orders(*)')
    .eq('id', id)

  if (userRole !== 'admin' && userRole !== 'owner' && userRole !== 'finance') {
    query = query.eq('installer_id', user.id)
  }

  const { data, error } = await query.single()
  if (error) return NextResponse.json({ data: null, error: { message: 'Not found' } }, { status: 404 })
  return NextResponse.json({ data, error: null })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimit.blocked) return NextResponse.json({ data: null, error: { message: 'Too many requests' } }, { status: 429 })

  const auth = await requireAuthRole(['admin', 'owner', 'installer'])
  if (auth.error) return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
  const { supabase, user, userData } = auth

  const userRole = userData?.role

  const { id } = await params
  const body = await request.json()

  // 1. Auth check
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })
  }

  // 2. Kalau status berubah, panggil RPC `advance_install_booking_status`
  //    untuk atomic cascade ke orders.status
  if (body.status && body.status !== undefined) {
    // Auto-set actual_date when marking done
    if (body.status === 'done' && !allowedUpdate.actual_date) {
      allowedUpdate.actual_date = new Date().toISOString()
    }

    // Panggil RPC — handles status update + orders.status cascade + order_logs insert
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('advance_install_booking_status', {
      p_booking_id: id,
      p_new_status: body.status,
      p_staff_id: user.id
    })

    if (rpcErr) {
      console.error('advance_install_booking_status RPC failed:', rpcErr)
      return NextResponse.json(
        { data: null, error: { message: 'Gagal update booking' } },
        { status: 500 }
      )
    }

    // Kalau ada field lain di body (selain status & actual_date), update manual
    // (mis. notes, installer_id, scheduled_date, scheduled_time)
    const otherFields: Record<string, unknown> = { ...body }
    delete otherFields.status
    delete otherFields.actual_date

    if (Object.keys(otherFields).length > 0) {
      const { error: updateErr } = await supabase.from('install_bookings').update(otherFields).eq('id', id)
      if (updateErr) {
        console.warn('Failed to update other install_bookings fields:', updateErr)
      }
    }

    // Return updated booking
    const { data: updated, error: getErr } = await supabase
      .from('install_bookings')
      .select('*, customer:customers(*), installer:users(name), order:orders(*)')
      .eq('id', id)
      .single()

    if (getErr) {
      return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
    }
    return NextResponse.json({ data: { ...updated, _rpc: rpcResult }, error: null })
  }

  // 3. Kalau TIDAK ada status change (cuma update field lain), update manual
  if (Object.keys(allowedUpdate).length === 0) {
    return NextResponse.json({ data: null, error: { message: 'No valid fields to update' } }, { status: 400 })
  }

  const { data, error } = await supabase.from('install_bookings').update(allowedUpdate).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
