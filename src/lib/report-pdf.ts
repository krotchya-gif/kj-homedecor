import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { AutoTableDoc } from '@/lib/pdf-types'
import { drawLogo, drawWatermark } from '@/lib/pdf-logo'
import { getBrandSettings, hexToRgb, registerBrandFont, DEFAULT_BRAND, type BrandSettings } from '@/lib/pdf-brand'

/**
 * Standar PDF (sesi 44–47): header konsisten (logo + nama brand + judul +
 * periode + tanggal cetak), warna & font brand DINAMIS dari landing_settings
 * (diatur Admin → Landing Settings → Brand), nomor halaman + watermark logo
 * transparan di tengah dokumen. SEMUA generator PDF wajib pakai helper ini —
 * jangan buat header sendiri (single-source-of-truth, lihat AGENTS.md).
 */

/** Default brand (warna logo #b37a60) — di-override oleh settings saat render. */
export const BRAND_FILL: [number, number, number] = [179, 122, 96]

export const BRAND_FOOT_FILL: [number, number, number] = [249, 235, 229]
export const BRAND_FOOT_TEXT: [number, number, number] = [133, 76, 55]

/** Brand aktif saat render (di-set drawDocHeader). */
let activeBrand: BrandSettings = DEFAULT_BRAND

/** RGB brand aktif (dipakai headStyles tabel & aksen). */
export function getBrandRgb(): [number, number, number] {
  return hexToRgb(activeBrand.color)
}

export interface DocHeaderOptions {
  title: string
  /** Baris meta kiri (abu-abu, 9pt). */
  meta?: string[]
  /** Baris meta kanan (rata kanan). */
  metaRight?: string[]
}

/**
 * Header standar dokumen: logo kiri atas + nama brand (font brand kalau TTF)
 * + judul brand + meta. Dipakai oleh createReportDoc (laporan) dan
 * invoice/faktur/surat jalan/packing list/survey (sesi 46-47).
 */
export async function drawDocHeader(doc: jsPDF, opts: DocHeaderOptions): Promise<{ startY: number }> {
  activeBrand = await getBrandSettings()
  const brandRgb = hexToRgb(activeBrand.color)

  const hasLogo = await drawLogo(doc, 14, 6, 11)
  // Gap konsisten 6mm di belakang logo (berapa pun rasio logo-nya)
  const textX = hasLogo > 0 ? 14 + hasLogo + 6 : 14

  // Nama brand — font custom kalau TTF tersedia, fallback helvetica
  const brandFont = await registerBrandFont(doc, activeBrand.fontUrl)
  doc.setFont(brandFont, 'normal')
  doc.setFontSize(20)
  doc.setTextColor(31, 41, 55)
  doc.text(activeBrand.name, textX, 16)
  doc.setFont('helvetica', 'normal')

  // Judul dokumen
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(brandRgb[0], brandRgb[1], brandRgb[2])
  doc.text(opts.title, 14, 24)

  // Meta
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  let y = 30
  for (const m of opts.meta ?? []) {
    doc.text(m, 14, y)
    y += 5
  }
  ;(opts.metaRight ?? []).forEach((m, i) => {
    doc.text(m, 196, 30 + i * 5, { align: 'right' })
  })
  doc.setTextColor(0, 0, 0)

  return { startY: Math.max(y, 40) + 6 }
}

export interface ReportDocOptions {
  title: string
  /** Teks periode, mis. "2026-07-01 s/d 2026-07-31" atau "Juli 2026". */
  period: string
  /** Subjudul opsional (baris tambahan di bawah periode). */
  subtitle?: string
}

/** Buat dokumen PDF laporan dengan header standar (async — brand dimuat dulu). */
export async function createReportDoc({ title, period, subtitle }: ReportDocOptions): Promise<{ doc: jsPDF; startY: number }> {
  const doc = new jsPDF()
  const { startY } = await drawDocHeader(doc, {
    title,
    meta: [
      `Periode: ${period}`,
      ...(subtitle ? [subtitle] : []),
      `Dicetak: ${new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })}`
    ]
  })
  return { doc, startY }
}

/** Render tabel laporan dengan gaya brand aktif; return posisi Y terakhir. */
export function addReportTable(
  doc: jsPDF,
  opts: Parameters<typeof autoTable>[1] & { headStyles?: Partial<Record<string, unknown>> }
): number {
  const brandRgb = getBrandRgb()
  autoTable(doc, {
    ...opts,
    headStyles: {
      fillColor: brandRgb,
      textColor: 255,
      fontStyle: 'bold',
      ...(opts.headStyles as object)
    },
    footStyles: {
      fillColor: BRAND_FOOT_FILL,
      textColor: BRAND_FOOT_TEXT,
      fontStyle: 'bold',
      ...(opts.footStyles as object)
    }
  })
  return (doc as unknown as AutoTableDoc).lastAutoTable?.finalY ?? (opts.startY as number) ?? 20
}

/** Nomor halaman + nama brand di footer + watermark logo di tengah SEMUA halaman. */
export async function addPageNumbers(doc: jsPDF): Promise<void> {
  // Watermark logo transparan di tengah dokumen (sesi 46)
  await drawWatermark(doc)

  const brandName = activeBrand.name || DEFAULT_BRAND.name
  const pages = doc.getNumberOfPages()
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175)
    doc.text(brandName, 14, height - 8)
    doc.text(`Halaman ${i} dari ${pages}`, width - 14, height - 8, { align: 'right' })
    doc.setTextColor(0, 0, 0)
  }
}
