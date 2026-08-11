import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, requireAuthRole, checkRateLimit } from '@/lib/auth'

const ALLOWED_MATERIAL_FIELDS = [
  'name', 'supplier_id', 'stock_gudang', 'stock_toko', 'unit',
  'cost_per_unit', 'min_stock',
] as const

const CreateMaterialSchema = z.object({
  name: z.string().min(1, 'Nama material minimal 1 karakter'),
  supplier_id: z.string().uuid().optional(),
  stock_gudang: z.number().min(0).optional(),
  stock_toko: z.number().min(0).optional(),
  unit: z.string().optional(),
  cost_per_unit: z.number().min(0).optional(),
  min_stock: z.number().min(0).optional()
})

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('materials')
    .select('*, supplier:suppliers(name)', { count: 'exact' })
    .order('name')
    .range(offset, offset + limit - 1)
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
  const parsed = CreateMaterialSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ data: null, error: { message: parsed.error.issues[0].message } }, { status: 400 })

  // Whitelist fields
  const insertData: Record<string, any> = {}
  for (const field of ALLOWED_MATERIAL_FIELDS) {
    if (parsed.data[field as keyof typeof parsed.data] !== undefined) insertData[field] = parsed.data[field as keyof typeof parsed.data]
  }

  const { data, error } = await supabase.from('materials').insert(insertData).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
