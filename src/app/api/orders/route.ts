import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { createSimpleJournal } from '@/utils/journal/create'
import { z } from 'zod'

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

  let query = supabase
    .from('orders')
    .select('*, customer:customers(name, phone, address), order_items(count)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (source) query = query.eq('source', source)

  const { data, error } = await query
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
  const parsed = CreateOrderSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ data: null, error: { message: parsed.error.issues[0].message } }, { status: 400 })
  }

  const data = parsed.data

  // Generate order number via RPC
  const { data: orderNum } = await supabase.rpc('generate_order_number')
  const orderNumber = typeof orderNum === 'string' ? orderNum : null

  const orderData = { ...data, order_number: orderNumber }
  const { data: order, error } = await supabase.from('orders').insert(orderData).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: toClientError(error) } }, { status: 500 })

  // Auto-create journal entry for new order (piutang usaha debit, penjualan kredit)
  // BUG-009: wajib baseUrl di server context (fetch relatif throw di Node/Next route handler)
  // F-62 fix: kegagalan jurnal TIDAK boleh diam-diam — return warning agar terlihat di client
  let journalWarning: string | null = null
  if (order && data.total_amount && data.total_amount > 0) {
    try {
      await createSimpleJournal({
        transaction_type: 'order_created',
        reference_type: 'order',
        reference_id: order.id,
        description: `Order baru ${orderNumber ?? order.id.slice(0, 8)} — ${data.customer_id ?? ''}`,
        amount: data.total_amount,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
        // F-54 fix: idempotent per order — retry tidak bikin jurnal ganda
        idempotency_key: `order_created:${order.id}`,
        supabase
      })
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e)
      console.error('Gagal buat jurnal order_created:', errMsg)
      journalWarning = 'Order tersimpan, TAPI jurnal order_created GAGAL: ' + errMsg
    }
  }

  return NextResponse.json({ data: order, error: null, warning: journalWarning })
}
