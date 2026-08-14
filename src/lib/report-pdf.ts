import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { AutoTableDoc } from '@/lib/pdf-types'

/**
 * Standar PDF laporan (sesi 44): header konsisten (nama perusahaan + judul +
 * periode + tanggal cetak), warna brand, dan nomor halaman di footer.
 * SEMUA generator PDF laporan wajib pakai helper ini — jangan buat header
 * sendiri-sendiri (single-source-of-truth, lihat AGENTS.md).
 */

/** Warna brand KJ Homedecor (#cc7030) untuk fillColor tabel. */
export const BRAND_FILL: [number, number, number] = [204, 112, 48]

export interface ReportDocOptions {
  title: string
  /** Teks periode, mis. "2026-07-01 s/d 2026-07-31" atau "Juli 2026". */
  period: string
  /** Subjudul opsional (baris tambahan di bawah periode). */
  subtitle?: string
}

/** Buat dokumen PDF laporan dengan header standar. `startY` awal = setelah header. */
export function createReportDoc({ title, period, subtitle }: ReportDocOptions): { doc: jsPDF; startY: number } {
  const doc = new jsPDF()

  // Nama perusahaan
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(31, 41, 55)
  doc.text('KJ Homedecor', 14, 16)

  // Judul laporan
  doc.setFontSize(13)
  doc.setTextColor(BRAND_FILL[0], BRAND_FILL[1], BRAND_FILL[2])
  doc.text(title, 14, 24)

  // Periode & tanggal cetak
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text(`Periode: ${period}`, 14, 30)
  if (subtitle) doc.text(subtitle, 14, 35)
  const dicetak = `Dicetak: ${new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })}`
  doc.text(dicetak, 14, subtitle ? 40 : 35)
  doc.setTextColor(0, 0, 0)

  return { doc, startY: subtitle ? 46 : 41 }
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
      fillColor: [255, 237, 213],
      textColor: [154, 52, 18],
      fontStyle: 'bold',
      ...(opts.footStyles as object)
    }
  })
  return (doc as unknown as AutoTableDoc).lastAutoTable?.finalY ?? (opts.startY as number) ?? 20
}

/** Tambah nomor halaman + nama perusahaan di footer SEMUA halaman. Panggil SEBELUM doc.save(). */
export function addPageNumbers(doc: jsPDF): void {
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
