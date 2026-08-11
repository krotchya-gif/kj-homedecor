import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  // F-19 fix: role check — approve/reject & edit PR hanya gudang/admin/owner
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active' || !['gudang', 'admin', 'owner'].includes(requester.role)) {
    return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
  }

  // Support approve/reject action
  if (body.action === 'approve' || body.action === 'reject') {
    const status = body.action === 'approve' ? 'approved' : 'rejected'
    const { data, error } = await supabase
      .from('purchase_requests')
      .update({ status, approved_by: user.id })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
    return NextResponse.json({ data, error: null })
  }

  // F-19 fix: whitelist field (anti mass-assignment) — cegah injeksi kolom
  // seperti status/approved_by/created_by yang tidak boleh diubah langsung.
  const allowedFields: Record<string, unknown> = {}
  const FIELD_WHITELIST = [
    'material_id',
    'qty',
    'notes',
    'priority',
    'requested_by',
    'needed_by_date'
  ] as const
  for (const f of FIELD_WHITELIST) {
    if (f in body) allowedFields[f] = body[f]
  }

  const { data, error } = await supabase
    .from('purchase_requests')
    .update(allowedFields)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
