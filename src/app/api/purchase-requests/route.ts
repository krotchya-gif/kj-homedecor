import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { z } from 'zod'

const CreatePurchaseRequestSchema = z.object({
  material_id: z.string().uuid(),
  qty: z.number().min(1),
  notes: z.string().optional(),
  urgency: z.enum(['normal', 'urgent']).optional()
})

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('purchase_requests')
    .select('*, material:materials(name, cost_per_unit)')
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ data: null, error: { message: toClientError(error) } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const body = await request.json()
  const parsed = CreatePurchaseRequestSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ data: null, error: { message: parsed.error.issues[0].message } }, { status: 400 })

  const dataWithCreator = { ...parsed.data, created_by: user.id }
  const { data, error } = await supabase.from('purchase_requests').insert(dataWithCreator).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: toClientError(error) } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
