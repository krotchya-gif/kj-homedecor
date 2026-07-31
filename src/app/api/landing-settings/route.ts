import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/landing-settings — fetch landing page settings
export async function GET() {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('landing_settings').select('*').eq('id', 'hero').single()

    return NextResponse.json({ data: data ?? null, error: null })
  } catch (err) {
    console.error('Error fetching landing settings:', err)
    return NextResponse.json({ data: null, error: { message: 'Failed to fetch' } }, { status: 500 })
  }
}

// PUT /api/landing-settings — update landing page settings
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })
    }

    // Check admin role
    const { data: staffData } = await supabase.from('users').select('role').eq('id', user.id).single()

    if (staffData?.role !== 'admin' && staffData?.role !== 'owner') {
      return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
    }

    const {
      hero_title,
      hero_subtitle,
      hero_cta_text,
      hero_cta_link,
      whatsapp_number,
      whatsapp_message,
      trust_badges,
      hero_image_url,
      hero_video_url,
      instagram,
      facebook,
      tiktok,
      shopee,
      tokopedia,
      address,
      phone,
      categories_label,
      categories_title,
      categories_subtitle,
      whyus_label,
      whyus_title,
      whyus_subtitle,
      whyus_card1_title,
      whyus_card1_desc,
      whyus_card2_title,
      whyus_card2_desc,
      whyus_card3_title,
      whyus_card3_desc,
      whyus_card4_title,
      whyus_card4_desc,
      portfolio_label,
      portfolio_title,
      portfolio_subtitle,
      cta_badge,
      cta_title,
      cta_subtitle,
      // Theme customization fields
      theme_primary_color,
      theme_secondary_color,
      theme_accent_color,
      theme_background_color,
      theme_text_color,
      theme_preset,
      hero_background_image,
      hero_background_overlay_opacity,
      theme_border_radius,
      theme_font_heading,
      theme_font_body
    } = body

    // Validate HEX colors if provided
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/
    const colorFields = [
      { name: 'theme_primary_color', value: theme_primary_color },
      { name: 'theme_secondary_color', value: theme_secondary_color },
      { name: 'theme_accent_color', value: theme_accent_color },
      { name: 'theme_background_color', value: theme_background_color },
      { name: 'theme_text_color', value: theme_text_color }
    ]

    for (const field of colorFields) {
      if (field.value && !hexColorRegex.test(field.value)) {
        return NextResponse.json(
          { data: null, error: { message: `Invalid ${field.name}: must be HEX format (#RRGGBB)` } },
          { status: 400 }
        )
      }
    }

    // Validate theme preset if provided
    const validPresets = ['default', 'modern', 'gold', 'green', 'purple', 'custom']
    if (theme_preset && !validPresets.includes(theme_preset)) {
      return NextResponse.json(
        { data: null, error: { message: `Invalid theme_preset: must be one of ${validPresets.join(', ')}` } },
        { status: 400 }
      )
    }

    // Validate overlay opacity if provided
    if (
      hero_background_overlay_opacity !== undefined &&
      (hero_background_overlay_opacity < 0 || hero_background_overlay_opacity > 1)
    ) {
      return NextResponse.json(
        { data: null, error: { message: 'Invalid hero_background_overlay_opacity: must be between 0 and 1' } },
        { status: 400 }
      )
    }

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
        hero_video_url,
        instagram,
        facebook,
        tiktok,
        shopee,
        tokopedia,
        address,
        phone,
        categories_label,
        categories_title,
        categories_subtitle,
        whyus_label,
        whyus_title,
        whyus_subtitle,
        whyus_card1_title,
        whyus_card1_desc,
        whyus_card2_title,
        whyus_card2_desc,
        whyus_card3_title,
        whyus_card3_desc,
        whyus_card4_title,
        whyus_card4_desc,
        portfolio_label,
        portfolio_title,
        portfolio_subtitle,
        cta_badge,
        cta_title,
        cta_subtitle,
        // Theme customization fields
        theme_primary_color,
        theme_secondary_color,
        theme_accent_color,
        theme_background_color,
        theme_text_color,
        theme_preset,
        hero_background_image,
        hero_background_overlay_opacity,
        theme_border_radius,
        theme_font_heading,
        theme_font_body,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'hero')
      .select()
      .single()

    if (error) {
      return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
    }

    return NextResponse.json({ data, error: null })
  } catch (err) {
    console.error('Error updating landing settings:', err)
    return NextResponse.json({ data: null, error: { message: 'Internal error' } }, { status: 500 })
  }
}
