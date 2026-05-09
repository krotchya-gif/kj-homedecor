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
  const body = await request.json()

  // Validate status transition if status is being changed
  if (body.status) {
    const { data: current } = await supabase.from('orders').select('status').eq('id', id).single()
    if (current) {
      const allowed = VALID_STATUS_TRANSITIONS[current.status] ?? []
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          { data: null, error: { message: `Invalid status transition from "${current.status}" to "${body.status}". Allowed: ${allowed.join(', ') || 'none'}` } },
          { status: 400 }
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