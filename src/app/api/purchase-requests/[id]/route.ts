import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuthRole, checkRateLimit } from '@/lib/auth'

const ALLOWED_PR_UPDATE_FIELDS = [
  'material_id', 'qty', 'notes', 'urgency',
] as const

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimit.blocked) return NextResponse.json({ data: null, error: { message: 'Too many requests' } }, { status: 429 })

  const auth = await requireAuthRole(['admin', 'owner', 'gudang'])
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { id } = await params
  const body = await request.json()

  // Support approve/reject action
  if (body.action === 'approve' || body.action === 'reject') {
    const status = body.action === 'approve' ? 'approved' : 'rejected'
    const { data, error } = await supabase
      .from('purchase_requests')
      .update({ status, approved_by: user.id })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
    return NextResponse.json({ data, error: null })
  }

  // Whitelist fields for general update
  const updateData: Record<string, any> = {}
  for (const field of ALLOWED_PR_UPDATE_FIELDS) {
    if (body[field] !== undefined) updateData[field] = body[field]
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ data: null, error: { message: 'No valid fields to update' } }, { status: 400 })
  }

  const { data, error } = await supabase.from('purchase_requests').update(updateData).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}