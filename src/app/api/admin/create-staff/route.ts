import { NextResponse, type NextRequest } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit, getClientIp } from '@/lib/auth'

const CreateStaffSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  email: z.string().email('Email tidak valid'),
  // Phase 2 (BUG-092): password min 8 (sebelumnya 6 — terlalu lemah utk akun backend).
  password: z.string().min(8, 'Password minimal 8 karakter').max(100),
  // Phase 2 (BUG-092): tambah 'laundry' — role ada di DB & UI tapi absen dari enum
  // → admin tidak bisa buat akun laundry via API (inconsistent dgn 8 role).
  role: z.enum(['admin', 'gudang', 'penjahit', 'finance', 'installer', 'surveyor', 'owner', 'laundry'], {
    message: 'Role tidak valid'
  })
})

export async function POST(request: NextRequest) {
  try {
    // Phase 2 (BUG-092): rate limit — cegah brute-force akun / email enumeration.
    const rateLimit = checkRateLimit(getClientIp(request))
    if (rateLimit.blocked) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = CreateStaffSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { name, email, password, role } = parsed.data

    // Use service role to create user
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        }
      }
    })

    // Verify requester is admin
    const {
      data: { user: requester }
    } = await supabase.auth.getUser()
    // BUG (security): wajib login — kalau requester null, jangan lanjut!
    if (!requester) {
      return NextResponse.json({ error: 'Unauthorized — silakan login' }, { status: 401 })
    }
    // Phase 2 (BUG-092): cek status='active' — admin/owner yang dinonaktifkan
    // tidak boleh membuat akun (sebelumnya hanya cek role).
    const { data: requesterData } = await supabase
      .from('users')
      .select('role, status')
      .eq('id', requester.id)
      .single()
    if (
      !requesterData ||
      requesterData.status !== 'active' ||
      (requesterData.role !== 'admin' && requesterData.role !== 'owner')
    ) {
      return NextResponse.json({ error: 'Hanya Admin aktif yang dapat membuat akun staff' }, { status: 403 })
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      // Phase 2 (BUG-092): anti-enumeration — error auth (mis. "email already registered")
      // DI-REDAKSI ke pesan generik; detail hanya di log server.
      console.error('create-staff auth error:', authError.message)
      return NextResponse.json({ error: 'Gagal membuat akun. Periksa kembali data.' }, { status: 400 })
    }

    // Create user record
    const { error: dbError } = await supabase.from('users').insert({
      id: authData.user!.id,
      name,
      role,
      status: 'active'
    })

    if (dbError) {
      // Rollback auth user
      await supabase.auth.admin.deleteUser(authData.user!.id)
      return NextResponse.json({ error: toClientError(dbError) }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `Akun ${name} berhasil dibuat`, user: { id: authData.user!.id } })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
