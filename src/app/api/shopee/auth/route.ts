import { type NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/utils/supabase/server'
import { createShopeeSDK, shopeeCallbackUrl } from '@/lib/shopee'

// GET /api/shopee/auth?code=xxx&shop_id=123&state=nonce → OAuth callback dari Shopee.
// Keamanan callback: code OAuth single-use + state nonce single-use (mirror TikTok BUG-093).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const shopIdRaw = searchParams.get('shop_id')
  const BASE_URL = shopeeCallbackUrl().replace(/\/api\/shopee\/auth$/, '')

  const supabase = createServiceClient()

  if (!code || !state) {
    return NextResponse.redirect(new URL('/owner/shopee?error=missing_params', BASE_URL))
  }

  // Cari settings via oauth_state (nonce single-use) — bukan id (anti replay).
  const { data: settings } = await supabase
    .from('shopee_shop_settings')
    .select('*')
    .eq('oauth_state', state)
    .maybeSingle()

  if (!settings) {
    return NextResponse.redirect(new URL('/owner/shopee?error=settings_not_found', BASE_URL))
  }

  // Hapus nonce SEKARANG — kalau token exchange gagal, user harus re-authorize ulang.
  await supabase.from('shopee_shop_settings').update({ oauth_state: null }).eq('id', settings.id)

  try {
    const shopId = shopIdRaw ? Number(shopIdRaw) : settings.shop_id ? Number(settings.shop_id) : undefined
    // Multi-shop (sesi 55): SDK dibuat untuk SETTING yang match oauth_state — bukan toko pertama
    const { sdk } = (await createShopeeSDK(settings.id)) ?? {}
    if (!sdk) throw new Error('Shopee belum dikonfigurasi (partner_id/partner_key)')
    const token = await sdk.authenticateWithCode(code, shopId)
    if (!token?.access_token) throw new Error('Gagal tukar kode OAuth — cek partner credentials')

    const updateData: Record<string, unknown> = {
      shop_id: String(token.shop_id ?? shopId ?? ''),
      is_active: true,
      updated_at: new Date().toISOString()
    }
    await supabase.from('shopee_shop_settings').update(updateData).eq('id', settings.id)

    return NextResponse.redirect(new URL('/owner/shopee?success=connected', BASE_URL))
  } catch (err) {
    console.error('Shopee OAuth callback error:', err)
    return NextResponse.redirect(
      new URL(`/owner/shopee?error=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`, BASE_URL)
    )
  }
}
