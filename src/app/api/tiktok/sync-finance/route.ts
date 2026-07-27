import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getTikTokSettings, getValidToken } from '@/lib/tiktok'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { shop_id, start_date, end_date, auto_create_piutang } = body

  const settings = await getTikTokSettings(shop_id)
  if (!settings) {
    return NextResponse.json({ error: 'TikTok Shop not configured' }, { status: 400 })
  }

  const token = await getValidToken(settings)
  if (!token) {
    return NextResponse.json({ error: 'Access token not available' }, { status: 400 })
  }

  try {
    // Call TikTok Shop Finance API to get statements/payments
    // Use time range for filtering
    const now = Math.floor(Date.now() / 1000)
    const timeGe = start_date ? Math.floor(new Date(start_date).getTime() / 1000) : now - 30 * 86400
    const timeLt = end_date ? Math.floor(new Date(end_date).getTime() / 1000) : now

    const paymentsRes = await fetch(
      `https://open-api.tiktokglobalshop.com/finance/202309/payments?sort_field=create_time&create_time_ge=${timeGe}&create_time_lt=${timeLt}&page_size=100`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-tts-access-token': token,
        },
      }
    )

    const paymentsData = await paymentsRes.json()

    if (!paymentsData.data?.payments) {
      return NextResponse.json({ synced: 0, message: 'No payments found' })
    }

    let synced = 0
    let created_piutang = 0

    for (const payment of paymentsData.data.payments) {
      const { data: existing } = await supabase
        .from('tiktok_shop_statements')
        .select('id')
        .eq('statement_id', payment.id)
        .maybeSingle()

      if (existing) continue

      let piutangId: string | null = null

      // Auto-create piutang if enabled
      if (auto_create_piutang && payment.status === 'SUCCESS') {
        const { data: piutang } = await supabase.from('piutang').insert({
          customer_id: null, // TikTok Shop - no customer record
          invoice_number: `TTK-${payment.id.slice(0, 8)}`,
          invoice_date: new Date(payment.create_time * 1000).toISOString().split('T')[0],
          amount: payment.total_amount,
          channel: 'tiktok',
          description: `TikTok Shop settlement ${payment.id.slice(0, 8)}`,
        }).select().single()

        if (piutang) {
          piutangId = piutang.id
          created_piutang++
        }
      }

      await supabase.from('tiktok_shop_statements').insert({
        statement_id: payment.id,
        statement_type: payment.type || 'SETTLEMENT',
        total_amount: payment.total_amount,
        status: payment.status,
        currency: payment.currency || 'IDR',
        start_date: new Date(payment.create_time * 1000).toISOString().split('T')[0],
        paid_at: payment.paid_time ? new Date(payment.paid_time * 1000).toISOString() : null,
        transaction_count: payment.transaction_count || 0,
        statement_data: payment,
        is_synced: true,
        piutang_id: piutangId,
      })
      synced++
    }

    return NextResponse.json({
      synced,
      created_piutang,
      message: `Synced ${synced} statements, created ${created_piutang} piutang`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
