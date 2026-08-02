import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/server'
import crypto from 'crypto'

// Xendit webhook handler
export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    // Server-to-server: no user session → service-role client (bypasses RLS)
    const supabase = createServiceClient()

    // Verify HMAC SHA256 signature (Xendit sends signature in header)
    const xenditSignature = request.headers.get('x-xendit-signature')
    const callbackKey = process.env.XENDIT_CALLBACK_KEY

    if (!xenditSignature || !callbackKey) {
      return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })
    }

    // Compute expected signature: HMAC-SHA256(callbackKey, rawBody)
    const expectedSig = crypto.createHmac('sha256', callbackKey).update(rawBody, 'utf8').digest('hex')

    if (xenditSignature !== expectedSig) {
      return NextResponse.json({ data: null, error: { message: 'Invalid signature' } }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    const { type, data } = body

    if (type === 'payment' || type === 'invoice') {
      const { id, status, amount, external_id } = data

      if (!external_id) {
        return NextResponse.json({ data: null, error: { message: 'Missing external_id' } }, { status: 400 })
      }

      const paymentType = status === 'PAID' ? 'lunas' : 'dp'

      if (status === 'PAID' || status === 'SETTLED') {
        const { data: order } = await supabase
          .from('orders')
          .select('id, status, total_amount, dp_amount, lunas_amount')
          .eq('id', external_id)
          .single()

        if (order) {
          // Idempotency: try INSERT payment first. If xendit_payment_id already exists
          // (unique partial index), this is a webhook retry — skip silently.
          const { data: insertedPayment, error: insertError } = await supabase
            .from('payments')
            .insert({
              order_id: order.id,
              type: paymentType,
              amount,
              date: new Date().toISOString(),
              notes: `Xendit ${type} — ${id}`,
              xendit_payment_id: id // unique dedup key
            })
            .select('id')
            .single()

          // Unique violation = duplicate webhook delivery, idempotent success
          if (insertError) {
            if (insertError.code === '23505') {
              // unique_violation
              console.log(`Xendit webhook: payment ${id} already processed (idempotent)`)
              return NextResponse.json({ data: { success: true, idempotent: true }, error: null })
            }
            console.error('Failed to insert payment record:', insertError)
            return NextResponse.json({ data: null, error: { message: 'Failed to record payment' } }, { status: 500 })
          }

          // Payment successfully inserted — now update order lunas_amount
          const newLunas = order.lunas_amount + amount
          const isFullyPaid = newLunas >= order.total_amount

          // Webhook hanya update payment info (lunas_amount + payment_status).
          // Status pipeline TIDAK di-auto-advance — Admin/Finance yang atur manual.
          await supabase
            .from('orders')
            .update({
              lunas_amount: newLunas,
              payment_status: isFullyPaid ? 'paid' : 'partial'
            })
            .eq('id', order.id)
        }
      }

      return NextResponse.json({ data: { success: true }, error: null })
    }

    return NextResponse.json({ data: { received: true }, error: null })
  } catch (err) {
    console.error('Xendit webhook error:', err)
    return NextResponse.json({ data: null, error: { message: 'Internal error' } }, { status: 500 })
  }
}
