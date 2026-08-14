import { createClient } from '@/utils/supabase/client'
import { jsPDF } from 'jspdf'

/**
 * Brand dinamis (sesi 47): nama, singkatan, warna & font diambil dari
 * `landing_settings` (key='hero') — diatur Admin di Landing Settings dan
 * dipakai oleh website + SEMUA PDF. Fail-safe: DB error/offline → default.
 */

export interface BrandSettings {
  name: string
  short: string
  color: string
  fontUrl: string | null
  logoUrl: string | null
}

export const DEFAULT_BRAND: BrandSettings = {
  name: 'KJ Homedecor',
  short: 'KJ',
  color: '#b37a60',
  fontUrl: '/bright-darling-sans.ttf',
  logoUrl: '/kjlogo.png'
}

let cache: BrandSettings | null = null
let failed = false

export async function getBrandSettings(): Promise<BrandSettings> {
  if (cache) return cache
  if (failed) return DEFAULT_BRAND
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('landing_settings')
      .select('brand_name, brand_short, brand_color, brand_font_url, brand_logo_url')
      .eq('key', 'hero')
      .maybeSingle()
    cache = {
      name: data?.brand_name || DEFAULT_BRAND.name,
      short: (data?.brand_short || DEFAULT_BRAND.short).trim() || DEFAULT_BRAND.short,
      color: data?.brand_color || DEFAULT_BRAND.color,
      fontUrl: data?.brand_font_url || null,
      logoUrl: data?.brand_logo_url || DEFAULT_BRAND.logoUrl
    }
    return cache
  } catch {
    failed = true
    return DEFAULT_BRAND
  }
}

/** '#b37a60' → [179,122,96]. Input tidak valid → default. */
export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return [179, 122, 96]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// ---- Font brand untuk jsPDF ----
// jsPDF HANYA mendukung TrueType (header 0x00010000 / 'true', tabel glyf).
// OTF (CFF) / WOFF / WOFF2 tidak didukung → fallback 'helvetica'.
// Sesi 52: register PER-DOKUMEN (WeakSet) — flag global membuat PDF ke-2+
// dalam sesi yang sama kehilangan font (VFS jsPDF per-doc).
let fontFailed = false
export const BRAND_FONT_NAME = 'BrandFont'
const registeredDocs = new WeakSet<jsPDF>()

export async function registerBrandFont(doc: jsPDF, fontUrl: string | null): Promise<string> {
  if (registeredDocs.has(doc)) return BRAND_FONT_NAME
  if (fontFailed) return 'helvetica'
  if (!fontUrl) {
    fontFailed = true
    return 'helvetica'
  }
  try {
    const res = await fetch(fontUrl)
    if (!res.ok) throw new Error(`font fetch ${res.status}`)
    const buf = await res.arrayBuffer()
    if (buf.byteLength < 4) throw new Error('font terlalu kecil')
    const dv = new DataView(buf)
    const tag = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3))
    const isTrueType = tag === '\u0000\u0001\u0000\u0000' || tag === 'true'
    if (!isTrueType) {
      fontFailed = true
      return 'helvetica'
    }
    let binary = ''
    const bytes = new Uint8Array(buf)
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    doc.addFileToVFS('brand-font.ttf', btoa(binary))
    doc.addFont('brand-font.ttf', BRAND_FONT_NAME, 'normal')
    registeredDocs.add(doc)
    return BRAND_FONT_NAME
  } catch {
    fontFailed = true
    return 'helvetica'
  }
}
