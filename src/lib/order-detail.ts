// ============================================================
// Logika murni halaman detail order (admin/orders/[id])
// Di-extract dari monolitik page.tsx agar bisa di-unit-test.
// TIDAK berisi fetch/state/JSX — hanya fungsi & konstanta murni.
// ============================================================

export type ItemType = 'gorden' | 'perabot' | 'laundry'

export interface SurveyCand {
  id: string
  survey_number?: string
  client_name: string
  survey_date: string
  rooms?: { count?: number }[] | null
}

export type MeterRow = {
  meter_gorden?: number
  meter_vitras?: number
  meter_roman?: number
  meter_kupu_kupu?: number
  meter?: number
}

export interface OrderLog {
  id: string
  order_id: string
  action: string
  notes?: string | null
  created_at: string
  staff?: { name: string } | null
}

export interface OrderPhoto {
  id: string
  order_id: string
  photo_url: string
  stage?: string | null
  created_at: string
}

export interface BomRow {
  id: string
  product_id?: string
  material_id?: string
  qty?: number
  qty_per_unit?: number
  material?: { name: string; unit?: string; cost_per_unit?: number; stock_gudang?: number; min_stock_level?: number } | null
}

export const PAYMENT_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef2f2', text: '#991b1b' },
  partial: { bg: '#fffbeb', text: '#92400e' },
  paid: { bg: '#d1fae5', text: '#065f46' }
}

// Role → stage yang boleh di-LANJUTKAN (mirror API di /api/orders/[id]/route.ts)
// Setiap role hanya boleh klik "Lanjut" di stage yang menjadi tanggung jawabnya.
// Source of truth: matrix di dokumentasi pipeline.
export const ROLE_NEXT_ALLOWED: Record<string, string[]> = {
  // Admin: escape hatch — semua stage (align dengan API route.ts:40). BUG-003 fix 2026-08-11.
  admin: ['new', 'payment_ok', 'sorted', 'production', 'steam', 'ready', 'packed', 'shipped'],
  // Owner: escape hatch — semua stage
  owner: ['new', 'payment_ok', 'sorted', 'production', 'steam', 'ready', 'packed', 'shipped', 'done'],
  // Gudang: sortir (setelah approve finance) + produksi + QC jahitan + packing
  gudang: ['payment_ok', 'sorted', 'production', 'steam', 'ready', 'packed'],
  // Finance: approve pembayaran di DEPAN (new → payment_ok)
  finance: ['new'],
  // Installer: shipping akhir
  installer: ['packed', 'shipped']
  // Penjahit: TIDAK boleh klik "Lanjut" di order detail (kerjakan via /penjahit/jobs)
}

export function canRoleAdvanceNext(role: string, currentStatus: string): boolean {
  // Owner adalah escape hatch — boleh semua
  if (role === 'owner') return true
  const allowed = ROLE_NEXT_ALLOWED[role] ?? []
  return allowed.includes(currentStatus)
}

/** List role yang bertanggung jawab advance dari currentStatus (untuk info UI). */
export function getResponsibleRoles(currentStatus: string): string {
  const responsibles: string[] = []
  for (const [role, stages] of Object.entries(ROLE_NEXT_ALLOWED)) {
    if (stages.includes(currentStatus)) responsibles.push(role)
  }
  // Owner selalu termasuk (escape hatch)
  if (!responsibles.includes('owner')) responsibles.push('owner')
  return responsibles.join(', ')
}

/**
 * Parse ukuran "lebar x tinggi" cm → meter tinggi. Cth "120 x 250" → 2.5.
 * Mengembalikan 0 jika format tidak cocok.
 */
export function parseGordenMeter(size: string): number {
  const m = size.match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/)
  if (!m) return 0
  return Number(m[2]) / 100
}

/**
 * Map status order → action di tabel order_logs (constraint chk_action).
 * Phase 6B-1: dipindah dari page.tsx (logika murni, bisa di-unit-test).
 * PENTING: semua action harus masuk constraint — fallback 'status_changed'.
 */
export const LOG_ACTION: Record<string, string> = {
  new: 'created',
  payment_ok: 'payment_verified',
  sorted: 'sorted',
  production: 'production_started',
  steam: 'steam_qc_pass',
  ready: 'qc_pass',
  packed: 'packed',
  shipped: 'shipped',
  done: 'done',
  cancelled: 'cancelled'
}

export function getOrderLogAction(newStatus: string): string {
  return LOG_ACTION[newStatus] ?? 'status_changed'
}

/** Checklist persiapan default (order_preparation_checklists). Phase 6B-1. */
export const DEFAULT_CHECKLIST: { key: string; label: string; done: boolean; notes: string }[] = [
  { key: 'besi', label: 'Besi', done: false, notes: '' },
  { key: 'endcup_rollet', label: 'Endcup Rolet', done: false, notes: '' },
  { key: 'tutup_vitrase', label: 'Tutup Vitrase', done: false, notes: '' },
  { key: 'braket', label: 'Braket', done: false, notes: '' },
  { key: 'hook', label: 'Hook', done: false, notes: '' },
  { key: 'roda', label: 'Roda', done: false, notes: '' }
]
