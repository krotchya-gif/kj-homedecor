import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { z } from 'zod'

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

  const { data, error } = await supabase.from('materials').select('*, supplier:suppliers(name)').order('name')
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
  const parsed = CreateMaterialSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ data: null, error: { message: parsed.error.issues[0].message } }, { status: 400 })

  const { data, error } = await supabase.from('materials').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: toClientError(error) } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
