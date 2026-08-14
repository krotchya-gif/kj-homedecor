import { jsPDF, GState } from 'jspdf'

/**
 * Logo KJ Homedecor untuk PDF (sesi 46).
 * `public/kjlogo.png` (transparan) — dipakai di header (kiri atas) dan sebagai
 * watermark transparan di tengah dokumen. Fail-safe: kalau logo gagal dimuat
 * (offline/CDN), PDF tetap jalan tanpa logo.
 */

const LOGO_URL = '/kjlogo.png'

let logoCache: { dataUrl: string; ratio: number } | null = null
let logoFailed = false

/** Muat logo sekali per sesi (cache) → { dataUrl, ratio }. Gagal → null. */
export async function loadLogo(): Promise<{ dataUrl: string; ratio: number } | null> {
  if (logoCache) return logoCache
  if (logoFailed) return null
  try {
    const res = await fetch(LOGO_URL)
    if (!res.ok) throw new Error(`logo fetch ${res.status}`)
    const blob = await res.blob()
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
    if (!dataUrl) throw new Error('logo decode')
    const img = new Image()
    img.src = dataUrl
    await new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.onerror = () => resolve()
    })
    const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1
    logoCache = { dataUrl, ratio }
    return logoCache
  } catch {
    logoFailed = true
    return null
  }
}

/** Gambar logo di header (x, y = kiri atas; h = tinggi mm, lebar mengikuti rasio). */
export async function drawLogo(doc: jsPDF, x: number, y: number, h: number): Promise<boolean> {
  const logo = await loadLogo()
  if (!logo) return false
  try {
    doc.addImage(logo.dataUrl, 'PNG', x, y, h * logo.ratio, h)
    return true
  } catch {
    return false
  }
}

/**
 * Watermark: logo di TENGAH dokumen, opacity ~9%, digambar di SEMUA halaman.
 * Dipanggil di akhir (sebelum save) — overlay tipis, tidak mengganggu tabel.
 */
export async function drawWatermark(doc: jsPDF): Promise<void> {
  const logo = await loadLogo()
  if (!logo) return
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  try {
    let w = 70 * logo.ratio
    if (w > pageW - 30) w = pageW - 30
    const h = w / logo.ratio
    for (let i = 1; i <= doc.getNumberOfPages(); i++) {
      doc.setPage(i)
      doc.setGState(new GState({ opacity: 0.09 }))
      doc.addImage(logo.dataUrl, 'PNG', (pageW - w) / 2, (pageH - h) / 2, w, h)
      doc.setGState(new GState({ opacity: 1 }))
    }
  } catch {
    /* watermark opsional — kegagalan tidak menggagalkan PDF */
  }
}
