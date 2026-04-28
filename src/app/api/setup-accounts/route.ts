import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/setup-accounts — create initial admin & owner accounts
// Uses signUp instead of admin API (no service role key needed)
export async function POST(request: Request) {
  try {
    const { email, password, name, role } = await request.json()

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['admin', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Role must be admin or owner' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if any user with this role already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('role', role)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: `${role} account already exists` }, { status: 409 })
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
      return NextResponse.json({ error: authError.message }, { status: 500 })
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
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${role} account created`,
      credentials: { email, password }
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