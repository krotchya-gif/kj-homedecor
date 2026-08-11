import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, requireAuthRole, checkRateLimit } from '@/lib/auth'

const ALLOWED_PR_FIELDS = [
  'material_id', 'qty', 'notes', 'urgency',
] as const

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
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
  const offset = (page - 1) * limit

  let query = supabase
    .from('purchase_requests')
    .select('*, material:materials(name, cost_per_unit)')
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)

  const { data, error, count } = await query.range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  return NextResponse.json({ data, pagination: { page, limit, total: count ?? 0 }, error: null })
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

  // Whitelist fields + add creator
  const insertData: Record<string, any> = {}
  for (const field of ALLOWED_PR_FIELDS) {
    if (parsed.data[field as keyof typeof parsed.data] !== undefined) insertData[field] = parsed.data[field as keyof typeof parsed.data]
  }
  insertData.created_by = user.id

  const { data, error } = await supabase.from('purchase_requests').insert(insertData).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
