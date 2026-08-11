import type { Survey } from '@/types'

const DIVIDER = '━━━━━━━━━━━━━━'

/**
 * Format hasil survey menjadi teks (SRS section 10 — format copy/WA).
 * Surveyor tinggal paste di WhatsApp.
 */
export function formatSurveyText(survey: Survey): string {
  const lines: string[] = []
  lines.push(`Nama Client: ${survey.client_name || '-'}`)
  lines.push(`Alamat: ${survey.client_address || '-'}`)
  lines.push(`Tanggal: ${survey.survey_date || '-'}`)
  lines.push(`Surveyor: ${survey.surveyor?.name || '-'}`)
  lines.push('')

  const rooms = survey.rooms ?? []
  rooms.forEach((room, i) => {
    lines.push(DIVIDER)
    lines.push('')
    lines.push(`RUANGAN ${i + 1}`)
    lines.push(`Nama Ruangan: ${room.room_name || '-'}`)
    const hasSize = room.width_cm || room.height_cm
    lines.push(`Ukuran: ${hasSize ? `${room.width_cm ?? '-'} × ${room.height_cm ?? '-'} cm` : '-'}`)
    lines.push(`Model Gorden: ${room.model_gorden || '-'}`)
    lines.push(`Jenis Kain: ${room.fabric_name || '-'}`)
    lines.push(`Jenis Vitras: ${room.vitras_name || '-'}`)
    lines.push(`Rel Gorden: ${room.rel_gorden || '-'}`)
    lines.push(`Rel Vitras: ${room.rel_vitras || '-'}`)
    lines.push(`Hook: ${room.hook || '-'}`)
    lines.push(`Catatan: ${room.notes || '-'}`)
    lines.push('')
  })

  return lines.join('\n').trim()
}

/**
 * URL WhatsApp dengan isi chat sudah terisi hasil survey (SRS section 11).
 * Tanpa phone → wa.me/?text=... (user pilih nomor tujuan sendiri).
 */
export function buildWhatsAppUrl(survey: Survey, phone?: string): string {
  const text = encodeURIComponent(formatSurveyText(survey))
  return phone ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${text}` : `https://wa.me/?text=${text}`
}

/** Ringkasan 1 baris untuk list/table: "KJ-20260806-001 · Ruang Tamu, Kamar Utama · 2 ruangan" */
export function surveySummary(survey: Survey): string {
  const rooms = survey.rooms ?? []
  const names = rooms.slice(0, 2).map((r) => r.room_name).filter(Boolean).join(', ')
  const extra = rooms.length > 2 ? ` +${rooms.length - 2}` : ''
  return `${survey.survey_number ?? '-'} · ${names}${extra} · ${rooms.length} ruangan`
}
