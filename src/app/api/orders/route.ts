import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const source = searchParams.get('source')

  let query = supabase.from('orders').select('*, customer:customers(name, phone, address), order_items(count)').order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (source) query = query.eq('source', source)

  const { data, error } = await query
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const body = await request.json()

  // Validate required fields
  const validSources = ['shopee', 'tokopedia', 'tiktok', 'offline', 'landing_page']
  const validClassifications = ['kirim', 'pasang']

  if (body.source && !validSources.includes(body.source)) {
    return NextResponse.json({ data: null, error: { message: 'Invalid source' } }, { status: 400 })
  }
  if (body.classification && !validClassifications.includes(body.classification)) {
    return NextResponse.json({ data: null, error: { message: 'Invalid classification' } }, { status: 400 })
  }
  if (body.total_amount !== undefined && (typeof body.total_amount !== 'number' || body.total_amount < 0)) {
    return NextResponse.json({ data: null, error: { message: 'total_amount must be a non-negative number' } }, { status: 400 })
  }

  // Generate order number via RPC
  const { data: orderNum } = await supabase.rpc('generate_order_number')
  const orderNumber = typeof orderNum === 'string' ? orderNum : null

  const orderData = { ...body, order_number: orderNumber }
  const { data, error } = await supabase.from('orders').insert(orderData).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}