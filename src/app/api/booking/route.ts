import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/auth'

/**
 * POST /api/booking
 *
 * Sesi 59: booking publik dipindah dari panggilan RPC langsung di client
 * (src/app/booking/page.tsx) ke route server + rate limit per IP (5/menit) —
 * sebelumnya anon bisa spam booking tanpa batas.
 * RPC `create_public_booking` tetap SATU-SATUNYA eksekutor write (policy INSERT
 * publik sudah DROP sejak audit 2026-08-14); route ini hanya gate anti-spam.
 */
export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(getClientIp(req), 5, 60_000)
  if (rateLimit.blocked) {
    return NextResponse.json(
      { data: null, error: { message: 'Terlalu banyak permintaan. Coba lagi beberapa saat.' } },
      { status: 429 }
    )
  }

  let body: {
    name?: unknown
    phone?: unknown
    address?: unknown
    date?: unknown
    time?: unknown
    service_type?: unknown
    notes?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Body JSON tidak valid' } }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const serviceType = body.service_type === 'survey' ? 'survey' : 'pasang'
  const address = body.address && serviceType === 'pasang' ? String(body.address).trim() : null
  const date = body.date ? String(body.date) : null
  const time = body.time ? String(body.time) : null
  const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null

  if (!name || !phone) {
    return NextResponse.json(
      { data: null, error: { message: 'Nama dan nomor WhatsApp wajib diisi' } },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_public_booking', {
    p_customer_name: name,
    p_customer_phone: phone,
    p_address: address,
    p_scheduled_date: date,
    p_scheduled_time: time,
    p_type: serviceType,
    p_notes: notes
  })
  if (error) {
    return NextResponse.json({ data: null, error: { message: error.message } }, { status: 400 })
  }

  return NextResponse.json({ data, error: null })
}