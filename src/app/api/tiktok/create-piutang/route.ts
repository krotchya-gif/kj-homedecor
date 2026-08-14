import { type NextRequest, NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { createClient } from '@/utils/supabase/server'
import { getTikTokSettings, getValidToken } from '@/lib/tiktok'
import { checkRateLimit, getClientIp } from '@/lib/auth'

export async function POST(req: NextRequest) {
  // Phase 2 (BUG-091): rate limit — cegah spam backfill piutang (jurnal).
  const rateLimit = checkRateLimit(getClientIp(req))
  if (rateLimit.blocked) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // F-19 fix: hanya owner/admin/finance yang boleh buat piutang settlement
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active' || !['owner', 'admin', 'finance'].includes(requester.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { shop_id, start_date, end_date } = body

  const settings = await getTikTokSettings(shop_id)
  if (!settings) {
    return NextResponse.json({ error: 'TikTok Shop not configured' }, { status: 400 })
  }

  try {
    // Sesi 43 (single-source-of-truth): route ini TIPIS — hanya mencari statement
    // yang belum dibukukan lalu memanggil RPC atomic process_tiktok_settlement_atomic
    // (piutang + jurnal per kategori + kas E-Wallet dalam 1 transaksi). Error = BLOCK.
    let query = supabase
      .from('tiktok_shop_statements')
      .select('id, statement_id, status')
      .is('piutang_id', null)
      .in('status', ['SETTLED', 'SUCCESS', 'PAID', 'COMPLETED'])
    if (start_date) query = query.gte('start_date', start_date)
    if (end_date) query = query.lte('start_date', end_date)

    const { data: statements, error: fetchErr } = await query

    if (fetchErr) {
      return NextResponse.json({ error: toClientError(fetchErr) }, { status: 500 })
    }

    let created = 0
    let skipped = 0

    for (const stmt of statements || []) {
      const { error: rpcErr } = await supabase.rpc('process_tiktok_settlement_atomic', {
        p_statement_id: stmt.id,
        p_actor: user.id
      })
      if (rpcErr) {
        // BLOCK: satu statement gagal → berhenti, jangan lanjut diam-diam
        return NextResponse.json(
          {
            error: `Gagal proses settlement TikTok ${stmt.statement_id?.slice(0, 8) ?? stmt.id}: ${rpcErr.message}`,
            created,
            skipped
          },
          { status: 500 }
        )
      }
      created++
    }

    return NextResponse.json({
      created,
      skipped,
      total: (statements || []).length,
      message: `Created ${created} piutang, ${skipped} already linked`
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? toClientError(err) : String(err) }, { status: 500 })
  }
}
