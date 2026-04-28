import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const installer_id = searchParams.get('installer_id')
  const status = searchParams.get('status')

  let query = supabase.from('install_bookings').select('*, customer:customers(name, phone, address), installer:users(name), order:orders(id)').order('scheduled_date', { ascending: false })

  if (installer_id) query = query.eq('installer_id', installer_id)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase.from('install_bookings').insert(body).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}