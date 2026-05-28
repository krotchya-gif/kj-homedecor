import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Order, OrderItem, Customer } from '@/types'

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

interface InvoiceData {
  order: Order & {
    customer?: Customer
    order_items?: Array<OrderItem & { product?: { name: string } }>
  }
  orderNumber: string
}

export function generateInvoicePDF({ order, orderNumber }: InvoiceData) {
  const doc = new jsPDF()

  // Header
  doc.setFillColor(204, 112, 48)
  doc.rect(0, 0, 220, 35, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text('KJ HOMEDECOR', 20, 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Jl. Contoh No.1, Jakarta | (021) 123-4567 | kj@homedecor.com', 20, 24)

  // Invoice title
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(51, 51, 51)
  doc.text(`INVOICE`, 150, 16)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`No: ${orderNumber}`, 150, 23)
  doc.text(`Tanggal: ${new Date(order.created_at).toLocaleDateString('id-ID')}`, 150, 29)

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
  doc.setDrawColor(204, 112, 48)
  doc.setLineWidth(0.5)
  doc.line(20, 75, 190, 75)

  // Items table
  const items = order.order_items ?? []
  autoTable(doc, {
    startY: 80,
    head: [['No', 'Produk', 'Qty', 'Ukuran', 'Harga', 'Total']],
    body: items.map((item, i) => [
      String(i + 1),
      item.product?.name ?? '—',
      String(item.qty),
      item.size ?? '—',
      fmt(item.price),
      fmt((item.price ?? 0) * (item.qty ?? 1)),
    ]),
    foot: [
      ['', '', '', 'DP Dibayar:', fmt(order.dp_amount ?? 0)],
      ['', '', '', 'Sisa Bayar:', fmt((order.total_amount ?? 0) - (order.dp_amount ?? 0) - (order.lunas_amount ?? 0))],
      ['', '', '', 'TOTAL:', fmt(order.total_amount ?? 0)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [204, 112, 48], textColor: 255 },
    footStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 60 },
      2: { cellWidth: 15 },
      3: { cellWidth: 35 },
      4: { cellWidth: 35, halign: 'right' },
      5: { cellWidth: 35, halign: 'right' },
    },
  })

  // Footer note
  const finalY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text('Pembayaran dianggap lunas setelah invoice ini dilunasi.', 20, finalY)
  doc.text('Terima kasih atas kepercayaan Anda.', 20, finalY + 5)

  doc.save(`kj-invoice-${orderNumber}.pdf`)
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

export function generatePackingListPDF({ order, orderNumber, courier, waybill }: PackingListData) {
  const doc = new jsPDF()

  // Header
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, 220, 35, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text('KJ HOMEDECOR', 20, 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Jl. Contoh No.1, Jakarta | (021) 123-4567', 20, 24)

  // Title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 64, 175)
  doc.text('PACKING LIST', 150, 16)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`No: ${orderNumber}`, 150, 23)
  doc.text(`Tanggal: ${new Date(order.created_at).toLocaleDateString('id-ID')}`, 150, 29)

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

  doc.setDrawColor(30, 64, 175)
  doc.setLineWidth(0.5)
  doc.line(20, 75, 190, 75)

  // Items
  const items = order.order_items ?? []
  autoTable(doc, {
    startY: 80,
    head: [['No', 'Produk', 'Qty', 'Ukuran', 'Berat (kg)', 'Catatan']],
    body: items.map((item, i) => [
      String(i + 1),
      item.product?.name ?? '—',
      String(item.qty),
      item.size ?? '—',
      item.meter_gorden ? `${(Number(item.meter_gorden) * 0.4).toFixed(2)} kg` : '—',
      item.ready ? '✅ Siap' : '⏳ Proses',
    ]),
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 65 },
      2: { cellWidth: 15 },
      3: { cellWidth: 40 },
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 30, halign: 'center' },
    },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 20, finalY)
  doc.text('KJ HOMEDECOR — Packing List', 130, finalY)

  doc.save(`kj-packinglist-${orderNumber}.pdf`)
}
