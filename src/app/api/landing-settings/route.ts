import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/landing-settings — fetch landing page settings
export async function GET() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('landing_settings')
      .select('*')
      .eq('id', 'hero')
      .single()

    return NextResponse.json(data ?? {})
  } catch (err) {
    console.error('Error fetching landing settings:', err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

// PUT /api/landing-settings — update landing page settings
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: staffData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (staffData?.role !== 'admin' && staffData?.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { hero_title, hero_subtitle, hero_cta_text, hero_cta_link, whatsapp_number, whatsapp_message, trust_badges, hero_image_url } = body

    const { data, error } = await supabase
      .from('landing_settings')
      .update({
        hero_title,
        hero_subtitle,
        hero_cta_text,
        hero_cta_link,
        whatsapp_number,
        whatsapp_message,
        trust_badges,
        hero_image_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'hero')
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Error updating landing settings:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
