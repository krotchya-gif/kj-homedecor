import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, requireAuthRole, checkRateLimit } from '@/lib/auth'

const ALLOWED_INSTALL_BOOKING_FIELDS = [
  'order_id', 'customer_id', 'installer_id', 'scheduled_date', 'scheduled_time',
  'address', 'notes', 'type', 'customer_name', 'customer_phone',
] as const

const CreateInstallBookingSchema = z.object({
  order_id: z.string().uuid(),
  customer_id: z.string().uuid().optional(),
  installer_id: z.string().uuid().optional(),
  scheduled_date: z.string(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  // IDOR protection: non-admin/owner/finance can only see their own bookings
  const { data: requester } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  const userRole = requester?.role ?? ''

  const { searchParams } = new URL(request.url)
  const installer_id = searchParams.get('installer_id')
  const status = searchParams.get('status')
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
  const offset = (page - 1) * limit

  let query = supabase.from('install_bookings')
    .select('*, customer:customers(name, phone, address), installer:users(name), order:orders(id)', { count: 'exact' })
    .order('scheduled_date', { ascending: false })

  if (userRole !== 'admin' && userRole !== 'owner' && userRole !== 'finance') {
    query = query.eq('installer_id', user.id)
  }
  if (installer_id) query = query.eq('installer_id', installer_id)
  if (status) query = query.eq('status', status)

  const { data, error, count } = await query.range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  return NextResponse.json({ data, pagination: { page, limit, total: count ?? 0 }, error: null })
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimit.blocked) return NextResponse.json({ data: null, error: { message: 'Too many requests' } }, { status: 429 })

  const auth = await requireAuthRole(['admin', 'owner', 'installer'])
  if (auth.error) return auth.error
  const { supabase, user, userData } = auth

  const userRole = userData?.role

  const body = await request.json()
  const parsed = CreateInstallBookingSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: { message: parsed.error.issues[0].message } }, { status: 400 })

  // Restrict installer_id: installer role can only set their own ID
  if (userRole === 'installer' && body.installer_id && body.installer_id !== user.id) {
    return NextResponse.json({ data: null, error: { message: 'Installer can only create bookings for themselves' } }, { status: 403 })
  }

  // Whitelist fields
  const insertData: Record<string, any> = {}
  for (const field of ALLOWED_INSTALL_BOOKING_FIELDS) {
    if (parsed.data[field as keyof typeof parsed.data] !== undefined) insertData[field] = parsed.data[field as keyof typeof parsed.data]
  }

  // Force installer_id to own ID for installer role
  if (userRole === 'installer') {
    insertData.installer_id = user.id
  }

  const { data, error } = await supabase.from('install_bookings').insert(insertData).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}