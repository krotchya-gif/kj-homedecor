import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'

// Xendit webhook handler
export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const supabase = await createClient()

    // Verify HMAC SHA256 signature (Xendit sends signature in header)
    const xenditSignature = request.headers.get('x-xendit-signature')
    const callbackKey = process.env.NEXT_PUBLIC_XENDIT_CALLBACK_KEY

    if (!xenditSignature || !callbackKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Compute expected signature: HMAC-SHA256(callbackKey, rawBody)
    const expectedSig = crypto
      .createHmac('sha256', callbackKey)
      .update(rawBody, 'utf8')
      .digest('hex')

    if (xenditSignature !== expectedSig) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    const { type, data } = body

    if (type === 'payment' || type === 'invoice') {
      const { id, status, amount, payer_email, external_id, payment_method } = data

      // Find the order by external_id (should match order id or payment reference)
      if (!external_id) {
        return NextResponse.json({ error: 'Missing external_id' }, { status: 400 })
      }

      // Determine payment type (DP or lunas) based on amount comparison
      // In a full implementation, you'd track expected amounts per order
      const paymentType = status === 'PAID' ? 'lunas' : 'dp'

      if (status === 'PAID' || status === 'SETTLED') {
        // Find associated order
        const { data: order } = await supabase
          .from('orders')
          .select('id, status, total_amount, dp_amount, lunas_amount')
          .eq('id', external_id)
          .single()

        if (order) {
          const newLunas = order.lunas_amount + amount

          // Check if fully paid
          const isFullyPaid = newLunas >= order.total_amount

          await supabase.from('orders').update({
            lunas_amount: newLunas,
            payment_status: isFullyPaid ? 'paid' : 'partial',
            // Only advance status if coming from payment_ok
            ...(order.status === 'payment_ok' && isFullyPaid ? { status: 'production' } : {}),
          }).eq('id', order.id)

          // Record payment
          await supabase.from('payments').insert({
            order_id: order.id,
            type: paymentType,
            amount,
            date: new Date().toISOString(),
            verified_by: 'system-xendit',
            verified_at: new Date().toISOString(),
          })
        }
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Xendit webhook error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}