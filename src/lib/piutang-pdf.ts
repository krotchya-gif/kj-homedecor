import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { drawDocHeader, addPageNumbers, getBrandRgb } from '@/lib/report-pdf'
import { getBrandSettings, companyContactLine } from '@/lib/pdf-brand'
import { piutangSisa } from '@/lib/ledger'

// Kode brand untuk nama file & nomor dokumen (sesi 47): "KJ Homedecor" → "kj".
async function brandCode(): Promise<string> {
  const brand = await getBrandSettings()
  return brand.short.toLowerCase().replace(/[^a-z0-9]/g, '') || 'kj'
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

interface AutoTableDoc {
  lastAutoTable: { finalY: number }
}

export interface PiutangFakturRow {
  invoice_number?: string | null
  invoice_date?: string | null
  channel?: string | null
  status?: string | null
  amount?: number
  fee_amount?: number
  paid_amount?: number
  return_amount?: number
  notes?: string | null
  customer?: { name?: string; phone?: string; address?: string } | null
  order?: { order_number?: string } | null
}

// Faktur piutang PDF — mengikuti pola generator dokumen lain (invoice.ts):
// header seragam via drawDocHeader + kontak dari landing_settings + nomor halaman.
export async function generatePiutangFakturPDF(p: PiutangFakturRow) {
  const doc = new jsPDF()
  const brand = await getBrandSettings()

  await drawDocHeader(doc, {
    title: 'FAKTUR PIUTANG',
    meta: [companyContactLine(brand)],
    metaRight: [
      `No: ${p.invoice_number ?? '—'}`,
      `Tanggal: ${p.invoice_date ? new Date(p.invoice_date).toLocaleDateString('id-ID') : '—'}`
    ]
  })

  // Bill To
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('TAGIHAN KE:', 20, 48)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(p.customer?.name ?? 'Customer', 20, 55)
  doc.text(p.customer?.phone ?? '—', 20, 61)
  doc.text(p.customer?.address ?? '—', 20, 67)

  // Informasi faktur (kanan)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('INFORMASI FAKTUR:', 130, 48)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Channel: ${p.channel ?? '—'}`, 130, 55)
  doc.text(`Status: ${p.status ?? '—'}`, 130, 61)
  doc.text(`Order: ${p.order?.order_number ?? '—'}`, 130, 67)

  // Garis aksen
  doc.setDrawColor(...getBrandRgb())
  doc.setLineWidth(0.5)
  doc.line(20, 75, 190, 75)

  const sisa = piutangSisa(p)
  autoTable(doc, {
    startY: 80,
    head: [['Keterangan', 'Nilai']],
    body: [
      ['Jumlah Faktur', fmt(p.amount ?? 0)],
      ['Fee / Potongan', fmt(p.fee_amount ?? 0)],
      ['Sudah Dibayar', fmt(p.paid_amount ?? 0)],
      ['Retur', fmt(p.return_amount ?? 0)]
    ],
    foot: [['SISA TAGIHAN', fmt(sisa)]],
    theme: 'striped',
    headStyles: { fillColor: getBrandRgb(), textColor: 255 },
    footStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' },
    columnStyles: { 1: { cellWidth: 60, halign: 'right' } }
  })

  let y = (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 20

  if (p.notes) {
    doc.setFontSize(9)
    doc.setTextColor(51, 51, 51)
    doc.text(`Catatan: ${p.notes}`, 20, y)
    y += 6
  }

  // Blok tanda tangan
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(51, 51, 51)
  doc.text('Penerima,', 35, y)
  doc.text('Hormat kami,', 150, y)
  doc.setDrawColor(120)
  doc.setLineWidth(0.3)
  doc.line(30, y + 30, 90, y + 30)
  doc.line(145, y + 30, 205, y + 30)
  doc.text('(___________________)', 35, y + 36)
  doc.text('(___________________)', 150, y + 36)

  // Catatan kaki
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text('Pembayaran dianggap lunas setelah faktur ini dilunasi.', 20, y + 50)
  doc.text('Terima kasih atas kepercayaan Anda.', 20, y + 55)

  await addPageNumbers(doc)
  doc.save(
    `${await brandCode()}-faktur-piutang-${String(p.invoice_number ?? 'x').replace(/[^a-zA-Z0-9-_]/g, '')}.pdf`
  )
}