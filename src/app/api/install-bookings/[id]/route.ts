import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('install_bookings')
    .select('*, customer:customers(*), installer:users(name), order:orders(*)')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
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
    if (body.status === 'done' && !body.actual_date) {
      body.actual_date = new Date().toISOString()
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
        { data: null, error: { message: 'Gagal update booking: ' + rpcErr.message } },
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
      return NextResponse.json({ data: null, error: { message: getErr.message } }, { status: 500 })
    }
    return NextResponse.json({ data: { ...updated, _rpc: rpcResult }, error: null })
  }

  // 3. Kalau TIDAK ada status change (cuma update field lain), update manual
  const { data, error } = await supabase.from('install_bookings').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
