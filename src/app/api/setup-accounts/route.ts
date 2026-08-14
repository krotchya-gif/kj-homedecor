import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { requireAuth, checkRateLimit, getClientIp } from '@/lib/auth'

// POST /api/setup-accounts — create initial admin & owner accounts
// Uses signUp instead of admin API (no service role key needed)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Rate limit di SEMUA path (bootstrap & guarded) — cegah spam/race
    const rateLimit = checkRateLimit(getClientIp(request))
    if (rateLimit.blocked) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // If any user already exists, require auth + admin/owner role
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })
    if (count && count > 0) {
      const auth = await requireAuth()
      if (auth.error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

      const { data: requester } = await supabase
        .from('users')
        .select('role')
        .eq('id', auth.user.id)
        .single()

      if (!['admin', 'owner'].includes(requester?.role ?? '')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { email, password, name, role } = await request.json()

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // SESI 52 (audit): password minimum 8 karakter (konsisten dengan create-staff)
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 })
    }

    if (!['admin', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Role must be admin or owner' }, { status: 400 })
    }

    // Check if any user with this role already exists
    const { data: existing } = await supabase.from('users').select('id').eq('role', role).maybeSingle()

    if (existing) {
      return NextResponse.json({ error: `${role} account already exists` }, { status: 409 })
    }

    // Anti-race (2026-08-12): double-check count sesaat sebelum signUp —
    // jika sudah ada user (bootstrap kedua jalan bersamaan), tolak.
    const { count: reCount } = await supabase.from('users').select('*', { count: 'exact', head: true })
    if (reCount && reCount > 0) {
      return NextResponse.json({ error: 'Akun sudah ada — bootstrap hanya untuk database kosong' }, { status: 409 })
    }

    // Create auth user via signUp (not admin API)
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role }
      }
    })

    if (authError) {
      return NextResponse.json({ error: toClientError(authError) }, { status: 500 })
    }

    if (!authUser?.user) {
      return NextResponse.json({ error: 'Failed to create auth user' }, { status: 500 })
    }

    // Insert into public.users
    const { error: dbError } = await supabase.from('users').insert({
      id: authUser.user.id,
      name,
      role,
      status: 'active'
    })

    if (dbError) {
      return NextResponse.json({ error: toClientError(dbError) }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${role} account created`
      // 2026-08-12: kredensial TIDAK dikembalikan lagi — password sudah diinput
      // pengguna di form setup; echo di response tidak berguna & membocorkannya ke log.
    })
  } catch (err) {
    console.error('Setup error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// GET /api/setup-accounts — check if accounts can be created
export async function GET() {
  try {
    const supabase = await createClient()

    // If any user exists, require auth
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })
    if (count && count > 0) {
      const auth = await requireAuth()
      if (auth.error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [{ data: admins }, { data: owners }] = await Promise.all([
      supabase.from('users').select('id').eq('role', 'admin').limit(1).maybeSingle(),
      supabase.from('users').select('id').eq('role', 'owner').limit(1).maybeSingle()
    ])

    return NextResponse.json({
      canCreateAdmin: !admins,
      canCreateOwner: !owners,
      existingAccounts: {
        admin: !!admins,
        owner: !!owners
      }
    })
  } catch (err) {
    return NextResponse.json({ error: 'Check failed' }, { status: 500 })
  }
}
