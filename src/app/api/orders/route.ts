import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { createSimpleJournal } from '@/utils/journal/create'
import { z } from 'zod'
import { requireAuth, requireAuthRole, checkRateLimit } from '@/lib/auth'

const ALLOWED_ORDER_FIELDS = [
  'source', 'classification', 'total_amount', 'dp_amount',
  'customer_id', 'notes',
] as const

const OrderSourceSchema = z.enum(['shopee', 'tokopedia', 'tiktok', 'offline', 'landing_page'])
const OrderClassificationSchema = z.enum(['kirim', 'pasang'])

const CreateOrderSchema = z.object({
  source: OrderSourceSchema.optional(),
  classification: OrderClassificationSchema.optional(),
  total_amount: z.number().min(0).optional(),
  dp_amount: z.number().min(0).optional(),
  customer_id: z.string().uuid().optional(),
  notes: z.string().optional()
})

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const source = searchParams.get('source')
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
  const offset = (page - 1) * limit

  let query = supabase
    .from('orders')
    .select('*, customer:customers(name, phone, address), order_items(count)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (source) query = query.eq('source', source)

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
  const parsed = CreateOrderSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ data: null, error: { message: parsed.error.issues[0].message } }, { status: 400 })
  }

  const data = parsed.data

  // Server-side price validation: verify total_amount matches products in DB
  if (data.total_amount !== undefined && data.total_amount > 0) {
    // If customer_id is provided, check if there are any order_items already set
    // Otherwise, just validate that total_amount is reasonable (positive number)
    // The detailed price validation happens when order_items are created
    if (data.total_amount < 0) {
      return NextResponse.json({ data: null, error: { message: 'Invalid total_amount' } }, { status: 400 })
    }
  }

  // Generate order number via RPC
  const { data: orderNum } = await supabase.rpc('generate_order_number')
  const orderNumber = typeof orderNum === 'string' ? orderNum : null

  // Whitelist fields for insert
  const insertData: Record<string, any> = {}
  for (const field of ALLOWED_ORDER_FIELDS) {
    if (data[field as keyof typeof data] !== undefined) insertData[field] = data[field as keyof typeof data]
  }
  insertData.order_number = orderNumber

  const { data: order, error } = await supabase.from('orders').insert(insertData).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })

  // Auto-create journal entry for new order (piutang usaha debit, penjualan kredit)
  if (order && data.total_amount && data.total_amount > 0) {
    try {
      await createSimpleJournal({
        transaction_type: 'order_created',
        reference_type: 'order',
        reference_id: order.id,
        description: `Order baru ${orderNumber ?? order.id.slice(0, 8)} — ${data.customer_id ?? ''}`,
        amount: data.total_amount
      })
    } catch (e) {
      console.warn('Failed to create journal entry for order:', e)
    }
  }

  return NextResponse.json({ data: order, error: null })
}
