import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { requireAuthRole, checkRateLimit } from '@/lib/auth'

// Create Xendit payment (VA or QRIS)
export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown')
    if (rateLimit.blocked) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const auth = await requireAuthRole(['admin', 'owner', 'finance'])
    if (auth.error) return auth.error

    const { order_id, amount, payment_type = 'VA', email, customer_name, phone } = await request.json()

    if (!order_id || !amount) {
      return NextResponse.json({ error: 'order_id and amount are required' }, { status: 400 })
    }

    // Validate amount is positive
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const xenditApiKey = process.env.XENDIT_API_KEY
    if (!xenditApiKey) {
      return NextResponse.json({ error: 'Xendit not configured' }, { status: 500 })
    }

    // Get order details
    const supabase = await createClient()
    const { data: order } = await supabase
      .from('orders')
      .select('*, customer:customers(name, phone, email)')
      .eq('id', order_id)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Amount validation: amount must not exceed total_amount - total paid
    const totalPaid = order.lunas_amount ?? 0
    const remainingAmount = (order.total_amount ?? 0) - totalPaid
    if (amount > remainingAmount) {
      return NextResponse.json({
        error: `Amount exceeds remaining balance. Order total: ${order.total_amount}, already paid: ${totalPaid}, remaining: ${remainingAmount}`,
      }, { status: 400 })
    }

    // Create Xendit invoice/VA
    const xenditPayload = {
      external_id: order_id,
      amount,
      payer_email: email || order.customer?.email || 'customer@example.com',
      payer_name: customer_name || order.customer?.name || 'Customer',
      description: `Pembayaran Order KJ Homedecor - ${order_id.slice(0, 8)}`,
      payment_methods: payment_type === 'QRIS' ? ['QRIS'] : ['BANK_TRANSFER'],
      ...(payment_type === 'QRIS' ? { payment_method: 'QRIS' } : {})
    }

    const xenditResponse = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(xenditApiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(xenditPayload)
    })

    if (!xenditResponse.ok) {
      const err = await xenditResponse.text()
      console.error('Xendit API error:', err)
      return NextResponse.json({ error: 'Failed to create Xendit payment' }, { status: 500 })
    }

    const xenditData = await xenditResponse.json()

    // Determine payment type based on amount vs total
    const isFullPayment = amount >= (order.total_amount ?? 0)
    const paymentType = isFullPayment ? 'lunas' : 'dp'

    // Store payment reference
    const { error: insertError } = await supabase.from('payments').insert({
      order_id,
      type: paymentType,
      amount,
      date: new Date().toISOString(),
      notes: `Xendit ${payment_type} - Invoice ${xenditData.id}`
    })

    if (insertError) {
      console.error('Failed to record payment:', insertError)
      return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        invoice_id: xenditData.id,
        invoice_url: xenditData.invoice_url,
        amount: xenditData.amount,
        status: xenditData.status,
        expiry_date: xenditData.expiry_date
      }
    })
  } catch (err) {
    console.error('Create payment error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
