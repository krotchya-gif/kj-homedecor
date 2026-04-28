import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role } = await request.json()

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 })
    }

    const validRoles = ['admin', 'gudang', 'penjahit', 'finance', 'installer', 'owner']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 })
    }

    // Use service role to create user
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {}
          },
        },
      }
    )

    // Verify requester is admin
    const { data: { user: requester } } = await supabase.auth.getUser()
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
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Create user record
    const { error: dbError } = await supabase.from('users').insert({
      id: authData.user!.id,
      name,
      role,
      status: 'active',
    })

    if (dbError) {
      // Rollback auth user
      await supabase.auth.admin.deleteUser(authData.user!.id)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `Akun ${name} berhasil dibuat` })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
