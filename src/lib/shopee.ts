import { createClient } from '@/utils/supabase/server'
import { ShopeeSDK } from '@congminh1254/shopee-sdk'
import type { TokenStorage } from '@congminh1254/shopee-sdk/storage/token-storage.interface'
import type { AccessToken } from '@congminh1254/shopee-sdk/schemas/access-token'

// SESI 53: wrapper Shopee Open Platform API v2 — pakai @congminh1254/shopee-sdk
// (sign HMAC otomatis, token refresh otomatis, region GLOBAL = partner.shopeemobile.com).
// Token disimpan di tabel `shopee_shop_settings` (SupabaseTokenStorage) — satu sumber
// kebenaran dengan halaman /owner/shopee. Semua panggilan API dari server route
// (client tidak pernah memegang partner_key).

export interface ShopeeSettingsRow {
  id: string
  partner_id: string
  partner_key: string
  shop_id: string | null
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  seller_name?: string | null
  shop_name?: string | null
  oauth_state?: string | null
  is_active: boolean
}

/** TokenStorage SDK → kolom shopee_shop_settings. */
export class SupabaseTokenStorage implements TokenStorage {
  constructor(private settingsId: string) {}

  async store(token: AccessToken): Promise<void> {
    const supabase = await createClient()
    await supabase
      .from('shopee_shop_settings')
      .update({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_expires_at: token.expired_at
          ? new Date(token.expired_at * 1000).toISOString()
          : token.expire_in
            ? new Date(Date.now() + token.expire_in * 1000).toISOString()
            : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.settingsId)
  }

  async get(): Promise<AccessToken | null> {
    const supabase = await createClient()
    const { data } = await supabase
      .from('shopee_shop_settings')
      .select('access_token, refresh_token, token_expires_at, shop_id')
      .eq('id', this.settingsId)
      .maybeSingle()
    if (!data?.access_token) return null
    const expiredAt = data.token_expires_at ? Math.floor(new Date(data.token_expires_at).getTime() / 1000) : undefined
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? '',
      expire_in: expiredAt ? expiredAt - Math.floor(Date.now() / 1000) : 14400,
      request_id: '',
      error: '',
      message: '',
      shop_id: data.shop_id ? Number(data.shop_id) : undefined,
      expired_at: expiredAt
    }
  }

  async clear(): Promise<void> {
    const supabase = await createClient()
    await supabase
      .from('shopee_shop_settings')
      .update({ access_token: null, refresh_token: null, token_expires_at: null, is_active: false })
      .eq('id', this.settingsId)
  }
}

export async function getShopeeSettings(): Promise<ShopeeSettingsRow | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('shopee_shop_settings').select('*').limit(1).maybeSingle()
  return (data ?? null) as ShopeeSettingsRow | null
}

/** Buat SDK instance (region GLOBAL = partner.shopeemobile.com, berlaku untuk ID). */
export async function createShopeeSDK(): Promise<{ sdk: ShopeeSDK; settings: ShopeeSettingsRow } | null> {
  const settings = await getShopeeSettings()
  if (!settings) return null
  const partnerId = Number(settings.partner_id)
  if (!Number.isFinite(partnerId) || !settings.partner_key) return null
  const sdk = new ShopeeSDK(
    {
      partner_id: partnerId,
      partner_key: settings.partner_key,
      shop_id: settings.shop_id ? Number(settings.shop_id) : undefined
    },
    new SupabaseTokenStorage(settings.id)
  )
  return { sdk, settings }
}

/** Callback OAuth (tanpa trailing slash — Shopee exact-match redirect_uri). */
export function shopeeCallbackUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'https://kjhomedecor.com').replace(/\/+$/, '') + '/api/shopee/auth'
}
