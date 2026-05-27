import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const CreateProductSchema = z.object({
  name: z.string().min(1),
  category_id: z.string().uuid().optional(),
  price: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  images: z.array(z.string()).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
})

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  let query = supabase.from('products').select('*, category:categories(name)').order('name')
  if (category) query = query.eq('category_id', category)

  const { data, error } = await query
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const body = await request.json()
  const parsed = CreateProductSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: { message: parsed.error.issues[0].message } }, { status: 400 })

  const { data, error } = await supabase.from('products').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}