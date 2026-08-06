import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Survey } from '@/types'

const BRAND: [number, number, number] = [204, 112, 48]

/**
 * PDF "FORM HASIL SURVEY GORDEN" (SRS section 12).
 * Header brand + info client + per ruangan (autoTable field/value) + footer tanda tangan.
 * Catatan: foto ruangan TIDAK disertakan di MVP PDF (CORS untuk canvas/dataURL tidak
 * dijamin) — foto tetap bisa dilihat di detail survey.
 */
export function generateSurveyPDF(survey: Survey) {
  const doc = new jsPDF()

  // Header
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, 220, 30, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text('KJ HOMEDECOR', 20, 13)
  doc.setFontSize(12)
  doc.text('FORM HASIL SURVEY GORDEN', 20, 21)

  // Meta
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(51, 51, 51)
  doc.text(`No Survey: ${survey.survey_number ?? '-'}`, 130, 13)
  doc.text(`Tanggal: ${survey.survey_date ?? '-'}`, 130, 19)
  doc.text(`Status: ${survey.status ?? '-'}`, 130, 25)

  // Info client
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('INFORMASI CLIENT', 20, 42)
  autoTable(doc, {
    startY: 46,
    head: [['Field', 'Isi']],
    body: [
      ['Nama Client', survey.client_name || '-'],
      ['Alamat', survey.client_address || '-'],
      ['Tanggal Survey', survey.survey_date || '-'],
      ['Surveyor', (survey as any).surveyor?.name || '-']
    ],
    theme: 'striped',
    headStyles: { fillColor: BRAND },
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 125 } }
  })

  // Rooms
  const rooms = survey.rooms ?? []
  let y = (doc as any).lastAutoTable.finalY + 8
  if (rooms.length === 0) {
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text('Belum ada ruangan.', 20, y)
  }

  rooms.forEach((room, i) => {
    if (y > 255) {
      doc.addPage()
      y = 20
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(51, 51, 51)
    doc.text(`RUANGAN ${i + 1}: ${room.room_name || '-'}`, 20, y)
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
      headStyles: { fillColor: [120, 90, 60] },
      columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 125 } }
    })
    y = (doc as any).lastAutoTable.finalY + 8
  })

  // Footer tanda tangan
  if (y > 270) {
    doc.addPage()
    y = 20
  }
  doc.setFontSize(9)
  doc.setTextColor(51, 51, 51)
  doc.setFont('helvetica', 'bold')
  doc.text('Tanda tangan Surveyor:', 20, y + 10)
  doc.setDrawColor(120)
  doc.line(20, y + 14, 90, y + 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 20, y + 24)

  doc.save(`survey-${survey.survey_number ?? survey.id.slice(0, 8)}.pdf`)
}
