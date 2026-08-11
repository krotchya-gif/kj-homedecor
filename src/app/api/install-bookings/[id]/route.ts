import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // F-18 fix: GET wajib login (sebelumnya tanpa auth check sama sekali)
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })
  }

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

  // F-18 fix: role check — admin/owner bebas; installer hanya booking miliknya
  // dan hanya status lanjutan (in_progress/done/revision); lainnya ditolak.
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  const role = requester?.role ?? ''
  const isAdmin = requester?.status === 'active' && ['admin', 'owner'].includes(role)
  const isInstaller = requester?.status === 'active' && role === 'installer'

  if (!isAdmin && !isInstaller) {
    return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
  }

  if (isInstaller) {
    const { data: booking } = await supabase
      .from('install_bookings')
      .select('installer_id')
      .eq('id', id)
      .single()
    if (!booking || booking.installer_id !== user.id) {
      return NextResponse.json({ data: null, error: { message: 'Forbidden: bukan booking Anda' } }, { status: 403 })
    }
    if (body.status && !['in_progress', 'done', 'revision'].includes(body.status)) {
      return NextResponse.json({ data: null, error: { message: 'Installer hanya bisa: in_progress / done / revision' } }, { status: 403 })
    }
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
