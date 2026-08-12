import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/server'
import crypto from 'crypto'

// Xendit webhook handler
export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    // Server-to-server: no user session → service-role client (bypasses RLS)
    const supabase = createServiceClient()

    // Helper (2026-08-12): update lunas_amount order dengan optimistic guard.
    // Dipakai di jalur normal DAN jalur retry (idempoten) — supaya order tidak
    // pernah tertinggal unpaid saat webhook retry setelah jurnal gagal.
    async function updateOrderPayment(orderId: string, amount: number) {
      let updated = false
      for (let attempt = 0; attempt < 3 && !updated; attempt++) {
        const { data: freshOrder } = await supabase
          .from('orders')
          .select('dp_amount, lunas_amount, total_amount')
          .eq('id', orderId)
          .single()
        if (!freshOrder) break
        const newLunas = (freshOrder.lunas_amount ?? 0) + amount
        const isFullyPaid = newLunas >= (freshOrder.total_amount ?? 0)
        const { error: updErr } = await supabase
          .from('orders')
          .update({
            lunas_amount: newLunas,
            payment_status: isFullyPaid ? 'paid' : 'partial'
          })
          .eq('id', orderId)
          .eq('lunas_amount', freshOrder.lunas_amount)
        if (!updErr) {
          updated = true
        } else if (attempt === 2) {
          console.error('Xendit webhook: gagal update order setelah 3 percobaan:', updErr)
        }
      }
    }

    // Verify HMAC SHA256 signature (Xendit sends signature in header)
    const xenditSignature = request.headers.get('x-xendit-signature')
    const callbackKey = process.env.XENDIT_CALLBACK_KEY

    if (!xenditSignature || !callbackKey) {
      return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })
    }

    // Compute expected signature: HMAC-SHA256(callbackKey, rawBody)
    const expectedSig = crypto.createHmac('sha256', callbackKey).update(rawBody, 'utf8').digest('hex')

    // Timing-safe comparison to prevent timing attacks
    if (typeof expectedSig === 'string' && typeof xenditSignature === 'string') {
      try {
        const sigBuffer = Buffer.from(xenditSignature, 'utf-8')
        const expectedBuffer = Buffer.from(expectedSig, 'utf-8')
        if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
          return NextResponse.json({ data: null, error: { message: 'Invalid signature' } }, { status: 401 })
        }
      } catch {
        return NextResponse.json({ data: null, error: { message: 'Invalid signature' } }, { status: 401 })
      }
    } else {
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
          // Idempotency (2026-08-12): cek payment terlebih dahulu — kalau xendit_payment_id
          // sudah ada, ini webhook retry → skip (jalur 23505 di bawah tetap jadi backstop).
          const { data: alreadyProcessed } = await supabase
            .from('payments')
            .select('id')
            .eq('xendit_payment_id', id)
            .maybeSingle()
          if (alreadyProcessed) {
            return NextResponse.json({ data: { success: true, idempotent: true }, error: null })
          }

          // Validasi amount (2026-08-12): amount webhook tidak boleh melebihi sisa tagihan.
          const remaining = (order.total_amount ?? 0) - (order.dp_amount ?? 0) - (order.lunas_amount ?? 0)
          if (amount > remaining + 0.01) {
            console.error(
              `Xendit webhook: amount ${amount} melebihi sisa tagihan ${remaining} untuk order ${external_id}`
            )
            return NextResponse.json(
              { data: null, error: { message: 'Amount exceeds remaining' } },
              { status: 400 }
            )
          }

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
              verified_by: null, // verified saat webhook (system) — tidak ada user session
              verified_at: new Date().toISOString(),
              xendit_payment_id: id // unique dedup key
            })
            .select('id')
            .single()

          // Unique violation = duplicate webhook delivery, idempotent success
          if (insertError) {
            if (insertError.code === '23505') {
              console.log(`Xendit webhook: payment ${id} already processed (idempotent)`)
              // F-12 fix: kalau jurnal pertama GAGAL (mis. mapping error), retry
              // webhook tidak boleh meng-skip jurnal selamanya — cek & buat ulang.
              const { data: existingJournal } = await supabase
                .from('journal_entries')
                .select('id')
                .eq('idempotency_key', `xendit:${id}`)
                .maybeSingle()
              if (!existingJournal) {
                try {
                  const { createSimpleJournal } = await import('@/utils/journal/create')
                  await createSimpleJournal({
                    transaction_type: 'payment_received',
                    reference_type: 'order',
                    reference_id: order.id,
                    description: `Pembayaran Xendit ${type} — ${id}`,
                    amount,
                    baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
                    supabase,
                    idempotency_key: `xendit:${id}`
                  })
                  console.log(`Xendit webhook: jurnal retry berhasil untuk ${id}`)
                } catch (jErr) {
                  // 2026-08-12: jurnal retry GAGAL → balas 500 agar Xendit retry lagi
                  console.error('Gagal buat jurnal Xendit (retry path):', jErr)
                  return NextResponse.json(
                    { data: null, error: { message: 'Journal repair failed' } },
                    { status: 500 }
                  )
                }
              }
              // Retry path: pastikan order juga ter-update (bisa tertinggal kalau
              // attempt pertama gagal SEBELUM update order).
              await updateOrderPayment(order.id, amount)
              return NextResponse.json({ data: { success: true, idempotent: true }, error: null })
            }
            console.error('Failed to insert payment record:', insertError)
            return NextResponse.json({ data: null, error: { message: 'Failed to record payment' } }, { status: 500 })
          }

          // F-12 fix: jurnal dibuat SEKALI per payment (idempotency key = xendit id).
          // 2026-08-12: kalau jurnal GAGAL → balas 500 (bukan 200) supaya Xendit retry;
          // retry akan lewat jalur 23505 di atas → repair jurnal + update order.
          try {
            const { createSimpleJournal } = await import('@/utils/journal/create')
            await createSimpleJournal({
              transaction_type: 'payment_received',
              reference_type: 'order',
              reference_id: order.id,
              description: `Pembayaran Xendit ${type} — ${id}`,
              amount,
              baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
              supabase,
              idempotency_key: `xendit:${id}`
            })
          } catch (jErr) {
            console.error('Gagal buat jurnal Xendit payment:', jErr)
            return NextResponse.json(
              { data: null, error: { message: 'Journal creation failed' } },
              { status: 500 }
            )
          }

          await updateOrderPayment(order.id, amount)
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
