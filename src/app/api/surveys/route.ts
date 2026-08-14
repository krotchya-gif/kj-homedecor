import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { logSurveyActivity } from '@/lib/survey-log'
import { checkRateLimit, getClientIp } from '@/lib/auth'

interface RoomPayload {
  id?: string
  room_name: string
  width_cm?: number | null
  height_cm?: number | null
  model_gorden?: string | null
  fabric_name?: string | null
  fabric_photo?: string | null
  vitras_name?: string | null
  vitras_photo?: string | null
  rel_gorden?: string | null
  rel_vitras?: string | null
  hook?: string | null
  notes?: string | null
  sort_order?: number
  photos?: { url: string; sort_order?: number }[]
}

export interface SurveyPayload {
  client_name: string
  client_address?: string | null
  survey_date?: string
  status?: 'draft' | 'tersimpan' | 'diproses' | 'selesai'
  gps_lat?: number | null
  gps_lng?: number | null
  notes?: string | null
  signature?: string | null
  signature_name?: string | null
  rooms?: RoomPayload[]
}

/** Log aktivitas survey (non-blocking — kegagalan log TIDAK menggagalkan operasi utama). */

async function getCurrentUserRole(supabase: SupabaseClient) {
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  // Security fix (2026-08-12): user tanpa profil users = role null → DENY (bukan fail-open 'admin')
  return { user, role: data?.status === 'active' ? ((data?.role as string | undefined) ?? null) : null }
}

/**
 * POST /api/surveys — buat survey baru (status draft default) + rooms + photos.
 * surveyor_id SELALU dari auth (server), tidak bisa di-spoof dari body.
 */
export async function POST(request: Request) {
  if (checkRateLimit(getClientIp(request), 30, 60_000).blocked) {
    return NextResponse.json({ error: { message: 'Too many requests' } }, { status: 429 })
  }
  const supabase = await createClient()
  const auth = await getCurrentUserRole(supabase)
  if (!auth) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
  // Security fix (2026-08-12): hanya surveyor/admin/owner aktif yang boleh buat survey
  if (!auth.role || !['surveyor', 'admin', 'owner'].includes(auth.role)) {
    return NextResponse.json({ error: { message: 'Forbidden: hanya surveyor/admin/owner' } }, { status: 403 })
  }

  const body: SurveyPayload = await request.json()
  if (!body.client_name?.trim()) {
    return NextResponse.json({ error: { message: 'Nama client wajib diisi' } }, { status: 400 })
  }

  const { data: surveyNumber } = await supabase.rpc('generate_survey_number')
  if (!surveyNumber) {
    return NextResponse.json({ error: { message: 'Gagal generate nomor survey' } }, { status: 500 })
  }

  const { data: survey, error: sErr } = await supabase
    .from('surveys')
    .insert({
      survey_number: surveyNumber,
      client_name: body.client_name.trim(),
      client_address: body.client_address ?? null,
      survey_date: body.survey_date ?? new Date().toISOString().split('T')[0],
      surveyor_id: auth.user.id,
      status: body.status ?? 'draft',
      gps_lat: body.gps_lat ?? null,
      gps_lng: body.gps_lng ?? null,
      notes: body.notes ?? null,
      signature: body.signature ?? null,
      signature_name: body.signature_name ?? null
    })
    .select()
    .single()
  if (sErr) {
    return NextResponse.json({ error: { message: 'Gagal simpan survey: ' + toClientError(sErr) } }, { status: 500 })
  }

  const roomsErr = await insertRooms(supabase, survey.id, body.rooms ?? [])
  if (roomsErr) {
    await supabase.from('surveys').delete().eq('id', survey.id)
    return NextResponse.json({ error: { message: roomsErr } }, { status: 500 })
  }

  await logSurveyActivity(supabase, survey.id, auth.user.id, 'created', `Survey ${surveyNumber} dibuat`)

  // Notifikasi ke Admin & Owner ketika survey baru dikirim (SRS 13) — non-blocking
  if (body.status && body.status !== 'draft') {
    const { data: admins } = await supabase.from('users').select('id, role').in('role', ['admin', 'owner'])
    for (const a of admins ?? []) {
      const link = a.role === 'owner' ? '/owner/surveys' : '/admin/surveys'
      await supabase.from('notifications').insert({
        user_id: a.id,
        title: '📋 Survey Baru',
        message: `Survey ${surveyNumber} oleh ${body.client_name ?? '-'} dikirim (${body.status})`,
        type: 'survey',
        link
      })
    }
  }

  return NextResponse.json({ data: survey, error: null }, { status: 201 })
}

async function insertRooms(supabase: SupabaseClient, surveyId: string, rooms: RoomPayload[]) {
  for (let i = 0; i < rooms.length; i++) {
    const r = rooms[i]
    const { data: room, error: rErr } = await supabase
      .from('survey_rooms')
      .insert({
        survey_id: surveyId,
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
    if (rErr) return `Gagal simpan ruangan ${i + 1}: ${toClientError(rErr)}`

    for (const p of r.photos ?? []) {
      const { error: pErr } = await supabase.from('survey_room_photos').insert({
        room_id: room.id,
        url: p.url,
        sort_order: p.sort_order ?? 0
      })
      if (pErr) return `Gagal simpan foto ruangan ${i + 1}: ${toClientError(pErr)}`
    }
  }
  return null
}

/**
 * GET /api/surveys?client_name=&survey_date=&status=&surveyor_id=&limit=&offset=
 * Role gate: surveyor hanya survey milik sendiri (RLS juga enforce).
 */
export async function GET(request: Request) {
  if (checkRateLimit(getClientIp(request), 120, 60_000).blocked) {
    return NextResponse.json({ error: { message: 'Too many requests' } }, { status: 429 })
  }
  const supabase = await createClient()
  const auth = await getCurrentUserRole(supabase)
  if (!auth) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
  // Security fix (2026-08-12): deny kalau tanpa profil / role di luar surveyor/admin/owner
  if (!auth.role || !['surveyor', 'admin', 'owner'].includes(auth.role)) {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const clientName = searchParams.get('client_name')?.trim()
  const surveyDate = searchParams.get('survey_date')
  const status = searchParams.get('status')
  const surveyorId = searchParams.get('surveyor_id')
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100)
  const offset = Number(searchParams.get('offset') ?? 0)

  let q = supabase
    .from('surveys')
    .select('*, surveyor:users(name), rooms:survey_rooms(count)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (auth.role === 'surveyor') q = q.eq('surveyor_id', auth.user.id)
  if (surveyorId) q = q.eq('surveyor_id', surveyorId)
  if (clientName) q = q.ilike('client_name', `%${clientName}%`)
  if (surveyDate) q = q.eq('survey_date', surveyDate)
  if (status) q = q.eq('status', status)
  q = q.range(offset, offset + limit - 1)

  const { data, error, count } = await q
  if (error) return NextResponse.json({ error: { message: toClientError(error) } }, { status: 500 })
  return NextResponse.json({ data: data ?? [], count, error: null })
}
