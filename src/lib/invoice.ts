import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Order, OrderItem, Customer , SurveyRoom } from '@/types'
import { drawDocHeader, addPageNumbers, getBrandRgb } from '@/lib/report-pdf'
import { getBrandSettings } from '@/lib/pdf-brand'

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

interface InvoiceData {
  order: Order & {
    customer?: Customer
    order_items?: Array<OrderItem & { product?: { name: string } }>
  }
  orderNumber: string
}

export async function generateInvoicePDF({ order, orderNumber }: InvoiceData) {
  const doc = new jsPDF()

  // Header seragam (sesi 46): logo + KJ Homedecor + judul brand + meta
  await drawDocHeader(doc, {
    title: 'INVOICE',
    meta: ['Jl. Contoh No.1, Jakarta | (021) 123-4567 | kj@homedecor.com'],
    metaRight: [`No: ${orderNumber}`, `Tanggal: ${new Date(order.created_at).toLocaleDateString('id-ID')}`]
  })

  // Bill To
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('TAGIHAN KE:', 20, 48)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(order.customer?.name ?? 'Customer', 20, 55)
  doc.text(order.customer?.phone ?? '—', 20, 61)
  doc.text(order.customer?.address ?? '—', 20, 67)

  // Customer info right side
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('ORDER INFO:', 130, 48)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Source: ${order.source}`, 130, 55)
  doc.text(`Classification: ${order.classification}`, 130, 61)
  doc.text(`Payment: ${order.payment_status}`, 130, 67)

  // Line
  doc.setDrawColor(...getBrandRgb())
  doc.setLineWidth(0.5)
  doc.line(20, 75, 190, 75)

  // Items table
  const items = order.order_items ?? []
  autoTable(doc, {
    startY: 80,
    head: [['No', 'Produk', 'Qty', 'Ukuran', 'Harga', 'Total']],
    body: items.map((item, i) => [
      String(i + 1),
      item.product?.name ?? item.custom_specs ?? '—',
      String(item.qty),
      item.size ?? '—',
      fmt(item.price),
      fmt((item.price ?? 0) * (item.qty ?? 1))
    ]),
    foot: [
      ['', '', '', 'DP Dibayar:', fmt(order.dp_amount ?? 0)],
      ['', '', '', 'Sisa Bayar:', fmt((order.total_amount ?? 0) - (order.dp_amount ?? 0) - (order.lunas_amount ?? 0))],
      ['', '', '', 'TOTAL:', fmt(order.total_amount ?? 0)]
    ],
    theme: 'striped',
    headStyles: { fillColor: getBrandRgb(), textColor: 255 },
    footStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 60 },
      2: { cellWidth: 15 },
      3: { cellWidth: 35 },
      4: { cellWidth: 35, halign: 'right' },
      5: { cellWidth: 35, halign: 'right' }
    }
  })

  // ============ HASIL SURVEY GORDEN (SRS 2026-08-03) ============
  // Tampil kalau order punya survey ter-link (orders.survey_id). Format copy
  // mengikuti SRS section 10 supaya konsisten antara invoice & format WA.
  const survey = order.survey ?? null
  let surveyEndY = (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 10
  if (survey?.rooms?.length) {
    const startY = surveyEndY
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(51, 51, 51)
    doc.text('HASIL SURVEY GORDEN', 20, startY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120)
    const surveyMeta = `No: ${survey.survey_number ?? '-'}  |  Tanggal: ${survey.survey_date ?? '-'}  |  Surveyor: ${survey.surveyor?.name ?? '-'}`
    doc.text(surveyMeta, 20, startY + 5)

    let y = startY + 12
    ;(survey?.rooms ?? []).forEach((r: SurveyRoom, i: number) => {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(51, 51, 51)
      doc.text(`RUANGAN ${i + 1}: ${r.room_name ?? '-'}`, 20, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      const size = r.width_cm || r.height_cm ? `${r.width_cm ?? '-'} × ${r.height_cm ?? '-'} cm` : '-'
      const detailRows = [
        `Ukuran      : ${size}`,
        `Model Gorden: ${r.model_gorden ?? '-'}`,
        `Jenis Kain  : ${r.fabric_name ?? '-'}`,
        `Jenis Vitras: ${r.vitras_name ?? '-'}`,
        `Rel Gorden  : ${r.rel_gorden ?? '-'}`,
        `Rel Vitras  : ${r.rel_vitras ?? '-'}`,
        `Hook        : ${r.hook ?? '-'}`,
        `Catatan     : ${r.notes ?? '-'}`
      ]
      for (const line of detailRows) {
        doc.text(line, 25, y)
        y += 4.5
      }
      y += 5
    })
    surveyEndY = y
    doc.setDrawColor(...getBrandRgb())
    doc.setLineWidth(0.3)
    doc.line(20, surveyEndY - 3, 190, surveyEndY - 3)
  }

  // Footer note
  const finalY = surveyEndY
  // Catatan order (notes) — permintaan: "catatannya ga ikut masuk"
  if (order.notes) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(51, 51, 51)
    doc.text('Catatan:', 20, finalY)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(String(order.notes), 170)
    doc.text(lines, 20, finalY + 5)
  }
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text('Pembayaran dianggap lunas setelah invoice ini dilunasi.', 20, finalY + 15)
  doc.text('Terima kasih atas kepercayaan Anda.', 20, finalY + 20)

  await addPageNumbers(doc)
  doc.save(`${await brandCode()}-invoice-${orderNumber}.pdf`)
}

interface PackingListData {
  order: Order & {
    customer?: Customer
    order_items?: Array<OrderItem & { product?: { name: string } }>
  }
  orderNumber: string
  courier?: string
  waybill?: string
}

export async function generatePackingListPDF({ order, orderNumber, courier, waybill }: PackingListData) {
  const doc = new jsPDF()

  // Header seragam (sesi 46): logo + KJ Homedecor + judul brand + meta
  await drawDocHeader(doc, {
    title: 'PACKING LIST',
    meta: ['Jl. Contoh No.1, Jakarta | (021) 123-4567'],
    metaRight: [`No: ${orderNumber}`, `Tanggal: ${new Date(order.created_at).toLocaleDateString('id-ID')}`]
  })

  // Recipient
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(51, 51, 51)
  doc.text('PENERIMA:', 20, 48)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(order.customer?.name ?? '—', 20, 55)
  doc.text(order.customer?.phone ?? '—', 20, 61)
  doc.text(order.customer?.address ?? '—', 20, 67)

  // Shipping info
  if (courier || waybill) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('PENGIRIMAN:', 130, 48)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    if (courier) doc.text(`Kurir: ${courier}`, 130, 55)
    if (waybill) doc.text(`Resi: ${waybill}`, 130, 61)
  }

  doc.setDrawColor(...getBrandRgb())
  doc.setLineWidth(0.5)
  doc.line(20, 75, 190, 75)

  // Items
  const items = order.order_items ?? []
  autoTable(doc, {
    startY: 80,
    head: [['No', 'Produk', 'Qty', 'Ukuran', 'Berat (kg)', 'Catatan']],
    body: items.map((item, i) => [
      String(i + 1),
      item.product?.name ?? item.custom_specs ?? '—',
      String(item.qty),
      item.size ?? '—',
      item.meter_gorden ? `${(Number(item.meter_gorden) * 0.4).toFixed(2)} kg` : '—',
      item.ready ? '✅ Siap' : '⏳ Proses'
    ]),
    theme: 'striped',
    headStyles: { fillColor: getBrandRgb(), textColor: 255 },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 65 },
      2: { cellWidth: 15 },
      3: { cellWidth: 40 },
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 30, halign: 'center' }
    }
  })

  const finalY = (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 10
  // Catatan order (notes) — permintaan: "catatannya ga ikut masuk"
  if (order.notes) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(51, 51, 51)
    doc.text('Catatan:', 20, finalY)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(String(order.notes), 170)
    doc.text(lines, 20, finalY + 5)
  }
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 20, finalY + 15)
  doc.setTextColor(...getBrandRgb())
  doc.text(`${(await getBrandSettings()).name.toUpperCase()} — Packing List`, 130, finalY + 15)

  await addPageNumbers(doc)
  doc.save(`${await brandCode()}-packinglist-${orderNumber}.pdf`)
}

// ============ FAKTUR (Penjualan) ============
// Format faktur penjualan: kop brand, tabel item, DP/Sisa/TOTAL, blok tanda tangan.
// Tanpa PPN (bisnis non-PKP). Nomor: KJ-FAKTUR-<orderNumber>.
export async function generateFakturPDF({ order, orderNumber }: InvoiceData) {
  const doc = new jsPDF()

  // Header seragam (sesi 46): logo + KJ Homedecor + judul brand + meta
  await drawDocHeader(doc, {
    title: 'FAKTUR',
    meta: ['Jl. Contoh No.1, Jakarta | (021) 123-4567 | kj@homedecor.com'],
    metaRight: [`No: ${(await getBrandSettings()).short.toUpperCase()}-FAKTUR-${orderNumber}`, `Tanggal: ${new Date(order.created_at).toLocaleDateString('id-ID')}`]
  })

  // Bill To
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('TAGIHAN KE:', 20, 48)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(order.customer?.name ?? 'Customer', 20, 55)
  doc.text(order.customer?.phone ?? '—', 20, 61)
  doc.text(order.customer?.address ?? '—', 20, 67)

  // Order info right side
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('ORDER INFO:', 130, 48)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Source: ${order.source}`, 130, 55)
  doc.text(`Classification: ${order.classification}`, 130, 61)
  doc.text(`Payment: ${order.payment_status}`, 130, 67)

  // Line
  doc.setDrawColor(...getBrandRgb())
  doc.setLineWidth(0.5)
  doc.line(20, 75, 190, 75)

  // Items table
  const items = order.order_items ?? []
  autoTable(doc, {
    startY: 80,
    head: [['No', 'Produk', 'Qty', 'Ukuran', 'Harga', 'Total']],
    body: items.map((item, i) => [
      String(i + 1),
      item.product?.name ?? item.custom_specs ?? '—',
      String(item.qty),
      item.size ?? '—',
      fmt(item.price),
      fmt((item.price ?? 0) * (item.qty ?? 1))
    ]),
    foot: [
      ['', '', '', 'DP Dibayar:', fmt(order.dp_amount ?? 0)],
      ['', '', '', 'Sisa Bayar:', fmt((order.total_amount ?? 0) - (order.dp_amount ?? 0) - (order.lunas_amount ?? 0))],
      ['', '', '', 'TOTAL:', fmt(order.total_amount ?? 0)]
    ],
    theme: 'striped',
    headStyles: { fillColor: getBrandRgb(), textColor: 255 },
    footStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 60 },
      2: { cellWidth: 15 },
      3: { cellWidth: 35 },
      4: { cellWidth: 35, halign: 'right' },
      5: { cellWidth: 35, halign: 'right' }
    }
  })

  let y = (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 20

  // Signature blocks
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(51, 51, 51)
  doc.text('Penerima,', 35, y)
  doc.text('Hormat kami,', 150, y)
  doc.setDrawColor(120)
  doc.setLineWidth(0.3)
  doc.line(30, y + 30, 90, y + 30) // garis tanda tangan kiri
  doc.line(145, y + 30, 205, y + 30) // garis tanda tangan kanan
  doc.text('(___________________)', 35, y + 36)
  doc.text('(___________________)', 150, y + 36)

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text('Pembayaran dianggap lunas setelah faktur ini dilunasi.', 20, y + 50)
  doc.text('Terima kasih atas kepercayaan Anda.', 20, y + 55)

  await addPageNumbers(doc)
  doc.save(`${await brandCode()}-faktur-${orderNumber}.pdf`)
}

// ============ SURAT JALAN ============
// Format surat jalan: kop biru, blok PENERIMA + PENGIRIMAN (kurir/resi),
// tabel item, blok tanda tangan Diterima oleh / Pengirim Gudang.
// Nomor: KJ-SURATJALAN-<orderNumber>.
export async function generateSuratJalanPDF({ order, orderNumber, courier, waybill }: PackingListData) {
  const doc = new jsPDF()

  // Header seragam (sesi 46): logo + KJ Homedecor + judul brand + meta
  await drawDocHeader(doc, {
    title: 'SURAT JALAN',
    meta: ['Jl. Contoh No.1, Jakarta | (021) 123-4567'],
    metaRight: [`No: ${(await getBrandSettings()).short.toUpperCase()}-SURATJALAN-${orderNumber}`, `Tanggal: ${new Date(order.created_at).toLocaleDateString('id-ID')}`]
  })

  // Recipient
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(51, 51, 51)
  doc.text('PENERIMA:', 20, 48)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(order.customer?.name ?? '—', 20, 55)
  doc.text(order.customer?.phone ?? '—', 20, 61)
  doc.text(order.customer?.address ?? '—', 20, 67)

  // Shipping info
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('PENGIRIMAN:', 130, 48)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(courier ? `Kurir: ${courier}` : 'Kurir: —', 130, 55)
  doc.text(waybill ? `Resi: ${waybill}` : 'Resi: —', 130, 61)
  doc.text(`Tanggal Kirim: ${new Date(order.created_at).toLocaleDateString('id-ID')}`, 130, 67)

  doc.setDrawColor(...getBrandRgb())
  doc.setLineWidth(0.5)
  doc.line(20, 75, 190, 75)

  // Items
  const items = order.order_items ?? []
  autoTable(doc, {
    startY: 80,
    head: [['No', 'Produk', 'Qty', 'Ukuran', 'Catatan']],
    body: items.map((item, i) => [
      String(i + 1),
      item.product?.name ?? item.custom_specs ?? '—',
      String(item.qty),
      item.size ?? '—',
      item.ready ? 'Siap Kirim' : 'Proses'
    ]),
    theme: 'striped',
    headStyles: { fillColor: getBrandRgb(), textColor: 255 },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 70 },
      2: { cellWidth: 15 },
      3: { cellWidth: 40 },
      4: { cellWidth: 45 }
    }
  })

  let y = (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 20

  // Signature blocks
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(51, 51, 51)
  doc.text('Diterima oleh,', 35, y)
  doc.text('Pengirim / Gudang,', 150, y)
  doc.setDrawColor(120)
  doc.setLineWidth(0.3)
  doc.line(30, y + 30, 90, y + 30)
  doc.line(145, y + 30, 205, y + 30)
  doc.text('(___________________)', 35, y + 36)
  doc.text('(___________________)', 150, y + 36)
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 20, y + 46)

  await addPageNumbers(doc)
  doc.save(`${await brandCode()}-suratjalan-${orderNumber}.pdf`)
}
