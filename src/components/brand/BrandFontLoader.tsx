'use client'

import { useEffect, useState } from 'react'
import { getBrandSettings, DEFAULT_BRAND, type BrandSettings } from '@/lib/pdf-brand'

/**
 * Brand dinamis di web (sesi 47): nama, warna & font diambil dari
 * landing_settings (sama seperti PDF — satu sumber kebenaran).
 * - `useBrandSettings()`: hook untuk membaca nama/warna/font brand.
 * - `<BrandFontLoader/>`: injeksi @font-face (font brand) + CSS var
 *   `--brand-color` — pasang sekali di root layout.
 */

export function useBrandSettings(): BrandSettings {
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_BRAND)
  useEffect(() => {
    let alive = true
    getBrandSettings()
      .then((b) => {
        if (alive) setBrand(b)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return brand
}

export default function BrandFontLoader() {
  const brand = useBrandSettings()

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--brand-color', brand.color)
    if (brand.fontUrl) {
      let el = document.getElementById('brand-font-face') as HTMLStyleElement | null
      if (!el) {
        el = document.createElement('style')
        el.id = 'brand-font-face'
        document.head.appendChild(el)
      }
      el.textContent = `@font-face{font-family:'BrandFont';src:url('${brand.fontUrl}') format('truetype');font-display:swap}.brand-font{font-family:'BrandFont',var(--font-sans),sans-serif}`
    }
  }, [brand])

  return null
}
