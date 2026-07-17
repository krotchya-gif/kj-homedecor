import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, requireAuthRole, checkRateLimit } from '@/lib/auth'

const ALLOWED_CUSTOMER_FIELDS = ['name', 'phone', 'address', 'city', 'notes'] as const

const CreateCustomerSchema = z.object({
  name: z.string().min(1, 'Nama minimal 1 karakter'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { supabase } = auth

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
  const offset = (page - 1) * limit

  let query = supabase.from('customers').select('*', { count: 'exact' }).order('created_at', { ascending: false })
  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error, count } = await query.range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  return NextResponse.json({ data, pagination: { page, limit, total: count ?? 0 }, error: null })
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimit.blocked) return NextResponse.json({ data: null, error: { message: 'Too many requests' } }, { status: 429 })

  const auth = await requireAuthRole(['admin', 'owner', 'gudang', 'finance', 'installer', 'penjahit'])
  if (auth.error) return auth.error
  const { supabase } = auth

  const body = await request.json()
  const parsed = CreateCustomerSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: { message: parsed.error.issues[0].message } }, { status: 400 })

  // Whitelist fields
  const insertData: Record<string, any> = {}
  for (const field of ALLOWED_CUSTOMER_FIELDS) {
    if (parsed.data[field] !== undefined) insertData[field] = parsed.data[field]
  }

  const { data, error } = await supabase.from('customers').insert(insertData).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}