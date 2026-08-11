import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// BUG-019/security fix (2026-08-11): route ini SEBELUMNYA TANPA AUTH sama sekali
// (GET publik + POST raw mass-assignment). Sekarang: wajib login + role gudang/admin/owner
// + whitelist field + validasi zod.

const CreatePurchaseOrderSchema = z.object({
  pr_id: z.string().uuid().optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
  material_id: z.string().uuid().optional().nullable(),
  qty: z.number().positive().optional(),
  actual_cost: z.number().min(0).optional(),
  status: z.string().max(20).optional(),
  notes: z.string().max(500).optional().nullable()
})

const ALLOWED_ROLES = ['gudang', 'admin', 'owner']

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('purchase_orders')
    .select('*, supplier:suppliers(name), pr:purchase_requests(material:materials(name))')
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const { data: requester } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!requester || !ALLOWED_ROLES.includes(requester.role)) {
    return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Body tidak valid' } }, { status: 400 })
  }
  const parsed = CreatePurchaseOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: { message: parsed.error.issues[0].message } }, { status: 400 })
  }

  const { data, error } = await supabase.from('purchase_orders').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
