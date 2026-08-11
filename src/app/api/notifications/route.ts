import { NextResponse, type NextRequest } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { createClient } from '@/utils/supabase/server'

/**
 * Notifikasi in-app (SRS Survey 13: notifikasi ke Admin/Owner saat survey baru).
 * GET  /api/notifications            → daftar + unread count (limit 30)
 * PATCH /api/notifications           → tandai semua sudah dibaca
 * PATCH /api/notifications?id=<id>   → tandai satu sudah dibaca
 */
export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const { data: rows, error } = await supabase
    .from('notifications')
    .select('id, title, message, type, link, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) return NextResponse.json({ data: null, error: { message: toClientError(error) } }, { status: 500 })

  return NextResponse.json({ data: rows ?? [], unread: count ?? 0, error: null })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  const query = supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
  if (id) query.eq('id', id)

  const { error } = await query
  if (error) return NextResponse.json({ data: null, error: { message: toClientError(error) } }, { status: 500 })

  return NextResponse.json({ data: { ok: true }, error: null })
}
