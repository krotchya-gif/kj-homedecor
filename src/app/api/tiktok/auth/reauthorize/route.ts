import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'
import { checkRateLimit, getClientIp } from '@/lib/auth'

// Normalisasi trailing slash: env NEXT_PUBLIC_BASE_URL sering di-set dengan trailing
// slash (mis. https://kjhomedecor.com/) → concat mentah menghasilkan redirect_uri
// double slash (//api/...) yang DITOLAK TikTok OAuth (exact-match) dengan Forbidden.
const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://kjhomedecor.com').replace(/\/+$/, '')

// POST /api/tiktok/auth/reauthorize — get OAuth URL for an existing shop
export async function POST(req: NextRequest) {
  // Phase 2 (BUG-091): rate limit — cegah spam generate OAuth URL.
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

  // F-19 fix: owner/admin/finance yang boleh re-authorize kredensial TikTok
  // (finance = pengelola transaksi TikTok: token expired harus bisa diperbarui sendiri)
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active' || !['owner', 'admin', 'finance'].includes(requester.role)) {
    return NextResponse.json(
      {
        error:
          'Hanya role owner/admin/finance yang dapat re-authorize TikTok. Login dengan akun owner, admin, atau finance (menu Staff).',
        code: 'FORBIDDEN_ROLE',
      },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { shop_id } = body

  if (!shop_id) {
    return NextResponse.json({ error: 'shop_id is required' }, { status: 400 })
  }

  const { data: settings } = await supabase.from('tiktok_shop_settings').select('*').eq('id', shop_id).single()

  if (!settings) {
    return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
  }

  // Phase 2 (BUG-093): state OAuth = random nonce single-use, bukan shop_id (predictable).
  const oauthState = crypto.randomBytes(24).toString('hex')
  await supabase.from('tiktok_shop_settings').update({ oauth_state: oauthState }).eq('id', settings.id)

  // Build OAuth URL with required scopes
  const redirectUri = `${BASE_URL}/api/tiktok/auth`
  const scope = ['seller.order.info', 'seller.finance.info', 'seller.authorization.info', 'seller.shop.info'].join(',')
  const oauthUrl = `https://auth.tiktok-shops.com/api/v2/oauth/authorize?app_key=${settings.app_key}&state=${oauthState}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`

  return NextResponse.json({
    oauth_url: oauthUrl,
    seller_name: settings.seller_name
  })
}
