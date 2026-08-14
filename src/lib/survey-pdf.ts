import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Survey } from '@/types'
import { drawDocHeader, addPageNumbers } from '@/lib/report-pdf'

// Warna brand = warna logo KJ (#b37a60) — konsisten dengan semua PDF (sesi 46)
const BRAND: [number, number, number] = [179, 122, 96]

/**
 * PDF "FORM HASIL SURVEY GORDEN" (SRS section 12).
 * Header brand + info client + per ruangan (autoTable field/value + foto) + footer tanda tangan.
 * Foto ruangan di-fetch ke dataURL (storage Supabase punya CORS `*`) lalu dimasukkan.
 */

/** Fetch gambar (CORS-friendly) → dataURL. Gagal/offline → null. */
async function toDataURL(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

async function addPhoto(doc: jsPDF, dataUrl: string | null, x: number, y: number, w: number, h: number) {
  if (!dataUrl) {
    doc.setDrawColor(200)
    doc.setFillColor(245, 245, 245)
    doc.rect(x, y, w, h, 'FD')
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text('foto tidak tersedia', x + 2, y + h / 2)
    return
  }
  try {
    doc.addImage(dataUrl, x, y, w, h)
  } catch {
    doc.setDrawColor(200)
    doc.rect(x, y, w, h, 'S')
  }
}

interface AutoTableDoc {
  lastAutoTable: { finalY: number }
}

export async function generateSurveyPDF(survey: Survey) {
  const doc = new jsPDF()

  // Header seragam (sesi 46): logo + KJ Homedecor + judul brand + meta
  await drawDocHeader(doc, {
    title: 'FORM HASIL SURVEY GORDEN',
    meta: ['KJ Homedecor — hasil survey pelanggan'],
    metaRight: [
      `No Survey: ${survey.survey_number ?? '-'}`,
      `Tanggal: ${survey.survey_date ?? '-'}`,
      `Status: ${survey.status ?? '-'}`
    ]
  })

  // Info client
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(51, 51, 51)
  doc.text('INFORMASI CLIENT', 20, 42)
  autoTable(doc, {
    startY: 46,
    head: [['Field', 'Isi']],
    body: [
      ['Nama Client', survey.client_name || '-'],
      ['Alamat', survey.client_address || '-'],
      ['Tanggal Survey', survey.survey_date || '-'],
      ['Surveyor', survey.surveyor?.name || '-']
    ],
    theme: 'striped',
    headStyles: { fillColor: BRAND },
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 125 } }
  })

  // Rooms
  const rooms = survey.rooms ?? []
  let y = (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 8
  if (rooms.length === 0) {
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text('Belum ada ruangan.', 20, y)
  }

  for (let ri = 0; ri < rooms.length; ri++) {
    const room = rooms[ri]
    if (y > 255) {
      doc.addPage()
      y = 20
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(51, 51, 51)
    doc.text(`RUANGAN ${ri + 1}: ${room.room_name || '-'}`, 20, y)
    y += 3

    const hasSize = room.width_cm || room.height_cm
    autoTable(doc, {
      startY: y + 3,
      head: [['Field', 'Isi']],
      body: [
        ['Ukuran', hasSize ? `${room.width_cm ?? '-'} × ${room.height_cm ?? '-'} cm` : '-'],
        ['Model Gorden', room.model_gorden || '-'],
        ['Jenis Kain', room.fabric_name || '-'],
        ['Jenis Vitras', room.vitras_name || '-'],
        ['Rel Gorden', room.rel_gorden || '-'],
        ['Rel Vitras', room.rel_vitras || '-'],
        ['Hook', room.hook || '-'],
        ['Catatan', room.notes || '-']
      ],
      theme: 'striped',
      headStyles: { fillColor: BRAND },
      columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 125 } }
    })
    y = (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 8

    // Foto ruangan + foto kain + foto vitras (SRS 12: tiap ruangan tampilkan foto)
    const photoUrls = [
      ...(room.photos ?? []).slice(0, 2).map((p) => p.url),
      room.fabric_photo,
      room.vitras_photo
    ].filter((u): u is string => !!u)

    if (photoUrls.length > 0 && y + 50 > 280) {
      doc.addPage()
      y = 20
    }
    if (photoUrls.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(80)
      doc.text('Foto:', 20, y)
      const imgW = 55
      const imgH = 40
      let x = 20
      const maxCols = Math.min(3, photoUrls.length)
      for (let pi = 0; pi < photoUrls.length; pi++) {
        const dataUrl = await toDataURL(photoUrls[pi])
        await addPhoto(doc, dataUrl, x, y + 3, imgW, imgH)
        x += imgW + 4
        if (x + imgW > 195) {
          x = 20
          y += imgH + 6
        }
      }
      y = Math.max(y, (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 8) + imgH + 6
      void maxCols
    }
  }

  // Footer tanda tangan
  if (y > 270) {
    doc.addPage()
    y = 20
  }
  doc.setFontSize(9)
  doc.setTextColor(51, 51, 51)
  doc.setFont('helvetica', 'bold')
  doc.text('Tanda tangan Surveyor:', 20, y + 10)
  const signature = survey.signature as string | undefined
  if (signature) {
    // dataURL dari DB — aman tanpa CORS (beda dengan foto ruangan yang URL eksternal)
    try {
      doc.addImage(signature, 'PNG', 20, y + 12, 60, 22)
    } catch {
      doc.setDrawColor(120)
      doc.line(20, y + 14, 90, y + 14)
    }
  } else {
    doc.setDrawColor(120)
    doc.line(20, y + 14, 90, y + 14)
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 20, y + 24)

  await addPageNumbers(doc)
  doc.save(`survey-${survey.survey_number ?? survey.id.slice(0, 8)}.pdf`)
}
