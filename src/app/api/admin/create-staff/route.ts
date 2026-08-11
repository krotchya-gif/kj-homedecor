import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { requireAuthRole, checkRateLimit } from '@/lib/auth'

const CreateStaffSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter').max(100),
  role: z.enum(['admin', 'gudang', 'penjahit', 'finance', 'installer', 'surveyor', 'owner'], {
    message: 'Role tidak valid'
  })
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimit = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown')
    if (rateLimit.blocked) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Auth + role check — only admin/owner can create staff
    const auth = await requireAuthRole(['admin', 'owner'])
    if (auth.error) return auth.error

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
    if (requester) {
      const { data: requesterData } = await supabase.from('users').select('role').eq('id', requester.id).single()
      if (requesterData?.role !== 'admin' && requesterData?.role !== 'owner') {
        return NextResponse.json({ error: 'Hanya Admin yang dapat membuat akun staff' }, { status: 403 })
      }
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
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
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `Akun ${name} berhasil dibuat`, user: { id: authData.user!.id } })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
