import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { logSurveyActivity } from '@/lib/survey-log'

// Security fix (2026-08-11): tambah ownership check — surveyor hanya bisa
// akses survey milik sendiri; admin/owner boleh semua.

async function canAccess(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, surveyId: string): Promise<{ ok: boolean; role?: string; error?: NextResponse }> {
  const { data: me } = await supabase.from('users').select('role').eq('id', userId).single()
  if (!me) return { ok: false, error: NextResponse.json({ error: { message: 'Staff tidak ditemukan' } }, { status: 403 }) }
  if (['admin', 'owner'].includes(me.role)) return { ok: true, role: me.role }

  const { data: survey } = await supabase.from('surveys').select('surveyor_id').eq('id', surveyId).single()
  if (!survey || survey.surveyor_id !== userId) {
    return { ok: false, error: NextResponse.json({ error: { message: 'Forbidden — bukan survey Anda' } }, { status: 403 }) }
  }
  return { ok: true, role: me.role }
}

/** GET /api/surveys/[id] — detail survey (rooms + photos + surveyor) */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })

  const access = await canAccess(supabase, user.id, id)
  if (!access.ok) return access.error

  const { data, error } = await supabase
    .from('surveys')
    .select('*, surveyor:users(name), rooms:survey_rooms(*, photos:survey_room_photos(url, sort_order))')
    .eq('id', id)
    .order('sort_order', { referencedTable: 'survey_rooms' })
    .single()
  if (error) return NextResponse.json({ error: { message: toClientError(error) } }, { status: 404 })
  return NextResponse.json({ data, error: null })
}

/**
 * PATCH /api/surveys/[id] — update header + REPLACE rooms/photos.
 * Body: { client_name?, client_address?, survey_date?, status?, gps_lat?, gps_lng?, notes?, rooms? }
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })

  const access = await canAccess(supabase, user.id, id)
  if (!access.ok) return access.error

  const body = await request.json()

  const patch: Record<string, unknown> = {}
  for (const k of ['client_name', 'client_address', 'survey_date', 'status', 'gps_lat', 'gps_lng', 'notes', 'signature', 'signature_name']) {
    if (k in body) patch[k] = body[k]
  }
  if (Object.keys(patch).length > 0) {
    const { error: uErr } = await supabase.from('surveys').update(patch).eq('id', id)
    if (uErr) return NextResponse.json({ error: { message: 'Gagal update survey: ' + toClientError(uErr) } }, { status: 500 })
  }

  if (Array.isArray(body.rooms)) {
    // replace rooms + photos
    const { error: delErr } = await supabase.from('survey_rooms').delete().eq('survey_id', id)
    if (delErr) {
      return NextResponse.json({ error: { message: 'Gagal hapus ruangan lama: ' + toClientError(delErr) } }, { status: 500 })
    }
    for (let i = 0; i < body.rooms.length; i++) {
      const r = body.rooms[i]
      const { data: room, error: rErr } = await supabase
        .from('survey_rooms')
        .insert({
          survey_id: id,
          room_name: r.room_name,
          width_cm: r.width_cm ?? null,
          height_cm: r.height_cm ?? null,
          model_gorden: r.model_gorden ?? null,
          fabric_name: r.fabric_name ?? null,
          fabric_photo: r.fabric_photo ?? null,
          vitras_name: r.vitras_name ?? null,
          vitras_photo: r.vitras_photo ?? null,
          rel_gorden: r.rel_gorden ?? null,
          rel_vitras: r.rel_vitras ?? null,
          hook: r.hook ?? null,
          notes: r.notes ?? null,
          sort_order: r.sort_order ?? i
        })
        .select()
        .single()
      if (rErr) {
        return NextResponse.json({ error: { message: `Gagal simpan ruangan ${i + 1}: ${toClientError(rErr)}` } }, { status: 500 })
      }
      for (const p of r.photos ?? []) {
        const { error: pErr } = await supabase.from('survey_room_photos').insert({
          room_id: room.id,
          url: p.url,
          sort_order: p.sort_order ?? 0
        })
        if (pErr) {
          return NextResponse.json({ error: { message: `Gagal simpan foto ruangan ${i + 1}: ${toClientError(pErr)}` } }, { status: 500 })
        }
      }
    }
  }

  const { data, error } = await supabase
    .from('surveys')
    .select('*, surveyor:users(name), rooms:survey_rooms(*, photos:survey_room_photos(url, sort_order))')
    .eq('id', id)
    .order('sort_order', { referencedTable: 'survey_rooms' })
    .single()
  if (error) return NextResponse.json({ error: { message: toClientError(error) } }, { status: 500 })

  // Log aktivitas: hanya save final (status tersimpan) atau ada tanda tangan — auto-save draft TIDAK di-log (anti-spam)
  const isFinal = body.status === 'tersimpan' || 'signature' in body || 'signature_name' in body
  if (isFinal) {
    await logSurveyActivity(supabase, id, user.id, 'updated', `Data survey diperbarui${body.status === 'tersimpan' ? ' & disimpan' : ''}`)
  }

  return NextResponse.json({ data, error: null })
}

/** DELETE /api/surveys/[id] — hapus survey (rooms/photos cascade) */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })

  const access = await canAccess(supabase, user.id, id)
  if (!access.ok) return access.error

  const { data: surveyInfo } = await supabase.from('surveys').select('survey_number').eq('id', id).maybeSingle()
  const { error } = await supabase.from('surveys').delete().eq('id', id)
  if (error) return NextResponse.json({ error: { message: 'Gagal hapus survey: ' + toClientError(error) } }, { status: 500 })
  await logSurveyActivity(supabase, id, user.id, 'deleted', `Survey ${surveyInfo?.survey_number ?? ''} dihapus`)
  return NextResponse.json({ data: { ok: true }, error: null })
}
