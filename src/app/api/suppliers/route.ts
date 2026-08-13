import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { z } from 'zod'

const CreateSupplierSchema = z.object({
  name: z.string().min(1, 'Nama supplier minimal 1 karakter'),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional()
})

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  // Phase 1 (BUG-089): GET supplier membawa data kontak (PII) — batasi ke admin/owner/gudang
  // (role yang mengelola pembelian), konsisten dengan POST.
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active' || !['admin', 'owner', 'gudang'].includes(requester.role)) {
    return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
  }

  const { data, error } = await supabase.from('suppliers').select('*').order('name')
  if (error) return NextResponse.json({ data: null, error: { message: toClientError(error) } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  // Role check (defense-in-depth): hanya admin/owner yang boleh buat data via API
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active' || !['admin', 'owner'].includes(requester.role)) {
    return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
  }

  const body = await request.json()
  const parsed = CreateSupplierSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ data: null, error: { message: parsed.error.issues[0].message } }, { status: 400 })

  const { data, error } = await supabase.from('suppliers').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: toClientError(error) } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
