import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/auth'

/**
 * POST /api/owner/reset-data
 *
 * Wave 4 (2026-08-15): reset data transaksional dipindah dari panggilan RPC langsung
 * di client (owner/settings) ke route server — fungsi destruktif tidak dipanggil
 * langsung dari browser; RPC `reset_transactional_data` tetap satu-satunya eksekutor
 * (SECURITY DEFINER + guard owner di dalamnya, defense-in-depth).
 *
 * Body: {} — hanya owner aktif yang boleh.
 * Response: { success, counts_before, message }
 */
export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(getClientIp(req), 10, 60_000)
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

  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active' || requester.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden: hanya Owner yang bisa reset data' }, { status: 403 })
  }

  const { data, error } = await supabase.rpc('reset_transactional_data')
  if (error) {
    return NextResponse.json({ error: 'Gagal reset data: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ data, error: null })
}
