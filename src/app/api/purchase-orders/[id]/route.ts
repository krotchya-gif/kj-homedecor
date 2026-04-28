import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, supplier:suppliers(*), pr:purchase_requests(*)')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  // Handle status transitions
  const updates: any = { ...body }
  if (body.status === 'received') updates.received_at = new Date().toISOString()
  if (body.status === 'paid') {
    const { data: { user } } = await supabase.auth.getUser()
    updates.paid_at = new Date().toISOString()
    updates.paid_by = user?.id
  }

  const { data, error } = await supabase.from('purchase_orders').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}