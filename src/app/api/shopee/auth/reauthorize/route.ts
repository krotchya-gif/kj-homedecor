import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'
import { checkRateLimit, getClientIp } from '@/lib/auth'
import { createShopeeSDK, shopeeCallbackUrl } from '@/lib/shopee'

// POST /api/shopee/auth/reauthorize — buat OAuth URL (state nonce single-use).
export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(getClientIp(req))
  if (rateLimit.blocked) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active' || !['owner', 'admin', 'finance'].includes(requester.role)) {
    return NextResponse.json(
      { error: 'Hanya role owner/admin/finance yang dapat re-authorize Shopee', code: 'FORBIDDEN_ROLE' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { shop_id } = body

  const { data: settings } = await supabase
    .from('shopee_shop_settings')
    .select('*')
    .eq('id', shop_id ?? '')
    .maybeSingle()
  if (!settings) {
    return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
  }

  const oauthState = crypto.randomBytes(24).toString('hex')
  await supabase.from('shopee_shop_settings').update({ oauth_state: oauthState }).eq('id', settings.id)

  // Multi-shop (sesi 55): SDK dibuat untuk shop yang di-reauthorize, bukan toko pertama
  const { sdk } = (await createShopeeSDK(settings.id)) ?? {}
  if (!sdk) throw new Error('Shopee belum dikonfigurasi')

  const oauthUrl = sdk.getAuthorizationUrl(shopeeCallbackUrl(), { state: oauthState })

  return NextResponse.json({ oauth_url: oauthUrl, seller_name: settings.seller_name })
}
