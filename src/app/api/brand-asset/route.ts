import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/auth'

// SESI 52 (BUG-131): proxy asset brand (font TTF & logo) — CDN link.kjhomedecor.com
// TIDAK mengirim header CORS (Access-Control-Allow-Origin) → browser memblokir
// @font-face & fetch cross-origin → font brand & logo yang diupload gagal dimuat
// di web header & SEMUA PDF (sebelumnya logo pakai /kjlogo.png same-origin, jalan).
// Solusi: route ini fetch asset dari CDN SERVER-SIDE (tidak kena CORS) lalu
// kembalikan dengan ACAO + cache. Dipakai oleh BrandFontLoader (@font-face),
// registerBrandFont (PDF) & loadLogo (PDF) — satu sumber kebenaran tetap
// landing_settings.brand_font_url / brand_logo_url (diatur Admin).
const CONTENT_TYPES: Record<string, string> = {
  font: 'font/ttf',
  logo: 'image/png'
}

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(getClientIp(req), 240, 60_000)
  if (rateLimit.blocked) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const kind = new URL(req.url).searchParams.get('kind')
  if (kind !== 'font' && kind !== 'logo') {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('landing_settings')
    .select('brand_font_url, brand_logo_url')
    .eq('key', 'hero')
    .maybeSingle()

  const assetUrl = kind === 'font' ? data?.brand_font_url : data?.brand_logo_url
  if (!assetUrl) {
    return NextResponse.json({ error: `${kind} belum di-upload di Landing Settings` }, { status: 404 })
  }

  try {
    // Fetch server-side — tidak kena CORS browser
    const res = await fetch(assetUrl, { cache: 'force-cache' })
    if (!res.ok) {
      return NextResponse.json(
        { error: `CDN ${kind} tidak tersedia (${res.status})` },
        { status: res.status >= 400 && res.status < 500 ? res.status : 502 }
      )
    }
    const buf = await res.arrayBuffer()
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': CONTENT_TYPES[kind],
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Content-Length': String(buf.byteLength)
      }
    })
  } catch (err) {
    console.error('brand-asset fetch error:', err)
    return NextResponse.json({ error: 'Gagal mengambil asset brand' }, { status: 502 })
  }
}
