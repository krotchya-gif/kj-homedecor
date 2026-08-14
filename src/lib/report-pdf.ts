import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { AutoTableDoc } from '@/lib/pdf-types'
import { drawLogo, drawWatermark } from '@/lib/pdf-logo'

/**
 * Standar PDF laporan (sesi 44, disempurnakan sesi 46):
 * header konsisten (logo + nama perusahaan + judul + periode + tanggal cetak),
 * warna brand mengikuti warna logo KJ (#b37a60), dan nomor halaman + watermark
 * logo transparan di tengah dokumen. SEMUA generator PDF wajib pakai helper ini —
 * jangan buat header sendiri-sendiri (single-source-of-truth, lihat AGENTS.md).
 */

/** Warna brand KJ Homedecor = warna logo (#b37a60) untuk fillColor tabel & aksen. */
export const BRAND_FILL: [number, number, number] = [179, 122, 96]

/** Warna aksen terang untuk baris foot tabel. */
export const BRAND_FOOT_FILL: [number, number, number] = [249, 235, 229]
export const BRAND_FOOT_TEXT: [number, number, number] = [133, 76, 55]

export interface DocHeaderOptions {
  title: string
  /** Baris meta kiri (abu-abu, 9pt). */
  meta?: string[]
  /** Baris meta kanan (rata kanan). */
  metaRight?: string[]
}

/**
 * Header standar dokumen: logo kiri atas + "KJ Homedecor" + judul brand + meta.
 * Dipakai oleh createReportDoc (laporan) dan invoice/surat jalan/faktur/packing
 * list/survey agar SEMUA PDF seragam (sesi 46).
 */
export async function drawDocHeader(doc: jsPDF, opts: DocHeaderOptions): Promise<{ startY: number }> {
  const hasLogo = await drawLogo(doc, 14, 6, 11)
  const textX = hasLogo ? 31 : 14

  // Nama perusahaan
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(31, 41, 55)
  doc.text('KJ Homedecor', textX, 16)

  // Judul dokumen
  doc.setFontSize(13)
  doc.setTextColor(BRAND_FILL[0], BRAND_FILL[1], BRAND_FILL[2])
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

/** Buat dokumen PDF laporan dengan header standar (async — logo dimuat dulu). */
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

/** Render tabel laporan dengan gaya brand; return posisi Y terakhir. */
export function addReportTable(
  doc: jsPDF,
  opts: Parameters<typeof autoTable>[1] & { headStyles?: Partial<Record<string, unknown>> }
): number {
  autoTable(doc, {
    ...opts,
    headStyles: {
      fillColor: BRAND_FILL,
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

/** Nomor halaman + nama perusahaan di footer + watermark logo di tengah SEMUA halaman. */
export async function addPageNumbers(doc: jsPDF): Promise<void> {
  // Watermark logo transparan di tengah dokumen (sesi 46)
  await drawWatermark(doc)

  const pages = doc.getNumberOfPages()
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175)
    doc.text('KJ Homedecor', 14, height - 8)
    doc.text(`Halaman ${i} dari ${pages}`, width - 14, height - 8, { align: 'right' })
    doc.setTextColor(0, 0, 0)
  }
}
