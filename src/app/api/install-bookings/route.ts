import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const CreateInstallBookingSchema = z.object({
  order_id: z.string().uuid(),
  customer_id: z.string().uuid().optional(),
  installer_id: z.string().uuid().optional(),
  scheduled_date: z.string(),
  address: z.string().optional(),
  notes: z.string().optional()
})

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const installer_id = searchParams.get('installer_id')
  const status = searchParams.get('status')

  let query = supabase
    .from('install_bookings')
    .select('*, customer:customers(name, phone, address), installer:users(name), order:orders(id)')
    .order('scheduled_date', { ascending: false })

  if (installer_id) query = query.eq('installer_id', installer_id)
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

  const body = await request.json()
  const parsed = CreateInstallBookingSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ data: null, error: { message: parsed.error.issues[0].message } }, { status: 400 })

  const { data, error } = await supabase.from('install_bookings').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
