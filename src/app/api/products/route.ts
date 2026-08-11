import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, requireAuthRole, checkRateLimit } from '@/lib/auth'

const ALLOWED_PRODUCT_FIELDS = [
  'name', 'category_id', 'price', 'cost', 'stock', 'images',
  'description', 'is_active',
] as const

const CreateProductSchema = z.object({
  name: z.string().min(1),
  category_id: z.string().uuid().optional(),
  price: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  images: z.array(z.string()).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional()
})

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
  const offset = (page - 1) * limit

  let query = supabase.from('products').select('*, category:categories(name)', { count: 'exact' }).order('name')
  if (category) query = query.eq('category_id', category)

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
  const parsed = CreateProductSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ data: null, error: { message: parsed.error.issues[0].message } }, { status: 400 })

  // Whitelist fields
  const insertData: Record<string, any> = {}
  for (const field of ALLOWED_PRODUCT_FIELDS) {
    if (parsed.data[field as keyof typeof parsed.data] !== undefined) insertData[field] = parsed.data[field as keyof typeof parsed.data]
  }

  const { data, error } = await supabase.from('products').insert(insertData).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
