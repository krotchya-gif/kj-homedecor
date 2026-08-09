import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getTikTokSettings, getValidToken } from '@/lib/tiktok'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { shop_id } = body

  const settings = await getTikTokSettings(shop_id)
  if (!settings) {
    return NextResponse.json({ error: 'TikTok Shop not configured' }, { status: 400 })
  }

  try {
    // Ambil semua statement yang belum punya piutang_id, status SETTLED
    const { data: statements, error: fetchErr } = await supabase
      .from('tiktok_shop_statements')
      .select('*')
      .is('piutang_id', null)
      .eq('status', 'SETTLED')

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    let created = 0
    let skipped = 0

    for (const stmt of statements || []) {
      // Cek duplikat invoice_number
      const invoiceNum = `TTK-${stmt.statement_id.slice(0, 8)}`
      const { data: existing } = await supabase
        .from('piutang')
        .select('id')
        .eq('invoice_number', invoiceNum)
        .maybeSingle()

      if (existing) {
        // Update langsung piutang_id di statement
        await supabase.from('tiktok_shop_statements').update({ piutang_id: existing.id }).eq('id', stmt.id)
        skipped++
        continue
      }

      const { data: piutang, error: insertErr } = await supabase
        .from('piutang')
        .insert({
          customer_id: null,
          invoice_number: invoiceNum,
          invoice_date: stmt.start_date || new Date().toISOString().split('T')[0],
          amount: Number(stmt.total_amount),
          remaining: Number(stmt.total_amount),
          channel: 'tiktok',
          description: `TikTok Shop settlement ${stmt.statement_id.slice(0, 8)}`,
          status: 'pending'
        })
        .select()
        .single()

      if (insertErr) {
        console.error('Failed to insert piutang:', insertErr)
        continue
      }

      // Update piutang_id di statement
      await supabase.from('tiktok_shop_statements').update({ piutang_id: piutang.id }).eq('id', stmt.id)

      created++
    }

    return NextResponse.json({
      created,
      skipped,
      total: (statements || []).length,
      message: `Created ${created} piutang, ${skipped} already linked`
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
