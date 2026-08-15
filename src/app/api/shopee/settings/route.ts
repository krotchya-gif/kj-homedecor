import { type NextRequest, NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { createClient } from '@/utils/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/auth'

// POST /api/shopee/settings — simpan partner credentials (partner_id/partner_key/shop_name).
// RLS "Shopee manage settings" (finance/admin/owner) membatasi baris yang bisa ditulis.
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
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const partnerId = String(body.partner_id ?? '').trim()
  const partnerKey = String(body.partner_key ?? '').trim()
  const shopName = String(body.shop_name ?? '').trim() || null

  if (!partnerId || !partnerKey) {
    return NextResponse.json({ error: 'partner_id dan partner_key wajib diisi' }, { status: 400 })
  }

  try {
    const { data: existing } = await supabase.from('shopee_shop_settings').select('id').limit(1).maybeSingle()
    if (existing) {
      const { error } = await supabase
        .from('shopee_shop_settings')
        .update({
          partner_id: partnerId,
          partner_key: partnerKey,
          shop_name: shopName,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
      if (error) return NextResponse.json({ error: toClientError(error) }, { status: 500 })
      return NextResponse.json({ success: true, id: existing.id, message: 'Kredensial Shopee diperbarui' })
    }

    const { data: inserted, error } = await supabase
      .from('shopee_shop_settings')
      .insert({ partner_id: partnerId, partner_key: partnerKey, shop_name: shopName })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: toClientError(error) }, { status: 500 })
    return NextResponse.json({ success: true, id: inserted.id, message: 'Kredensial Shopee disimpan' })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? toClientError(err) : String(err) }, { status: 500 })
  }
}
