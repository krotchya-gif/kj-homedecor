import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Create Xendit payment (VA or QRIS)
export async function POST(request: Request) {
  try {
    const { order_id, amount, payment_type = 'VA', email, customer_name, phone } = await request.json()

    if (!order_id || !amount) {
      return NextResponse.json({ error: 'order_id and amount are required' }, { status: 400 })
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

    // Create Xendit invoice/VA
    const xenditPayload = {
      external_id: order_id,
      amount,
      payer_email: email || order.customer?.email || 'customer@example.com',
      payer_name: customer_name || order.customer?.name || 'Customer',
      description: `Pembayaran Order KJ Homedecor - ${order_id.slice(0, 8)}`,
      payment_methods: payment_type === 'QRIS' ? ['QRIS'] : ['BANK_TRANSFER'],
      ...(payment_type === 'QRIS' ? { payment_method: 'QRIS' } : {}),
    }

    const xenditResponse = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(xenditApiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(xenditPayload),
    })

    if (!xenditResponse.ok) {
      const err = await xenditResponse.text()
      console.error('Xendit API error:', err)
      return NextResponse.json({ error: 'Failed to create Xendit payment' }, { status: 500 })
    }

    const xenditData = await xenditResponse.json()

    // Store payment reference
    await supabase.from('payments').insert({
      order_id,
      type: 'dp', // initial payment
      amount,
      date: new Date().toISOString(),
      notes: `Xendit ${payment_type} - Invoice ${xenditData.id}`,
    })

    return NextResponse.json({
      success: true,
      data: {
        invoice_id: xenditData.id,
        invoice_url: xenditData.invoice_url,
        amount: xenditData.amount,
        status: xenditData.status,
        expiry_date: xenditData.expiry_date,
      }
    })
  } catch (err) {
    console.error('Create payment error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}