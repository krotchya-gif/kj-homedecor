import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

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

  // General update
  const { data, error } = await supabase.from('purchase_requests').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}