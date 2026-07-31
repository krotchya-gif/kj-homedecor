import type { OrderClassification, OrderStatus } from '@/types'

/**
 * V3 Pipeline: Single source of truth untuk pipeline stages per classification.
 *
 * - 'kirim'  : delivery only (8 stages, last = shipped)
 * - 'pasang' : delivery + installation (9 stages, last = installing -> done)
 *
 * Import ini dipakai di:
 * - src/app/(dashboard)/admin/orders/[id]/page.tsx (ORDER_STATUSES constant)
 * - src/app/(dashboard)/gudang/steam/page.tsx
 * - src/app/(dashboard)/admin/shipping/page.tsx
 * - src/app/(dashboard)/admin/booking/page.tsx
 */

export const ORDER_STAGES_BY_CLASSIFICATION: Record<OrderClassification, readonly OrderStatus[]> = {
  kirim: ['new', 'payment_ok', 'sorted', 'production', 'steam', 'ready', 'packed', 'shipped', 'done'],
  pasang: ['new', 'payment_ok', 'sorted', 'production', 'steam', 'ready', 'packed', 'scheduled', 'installing', 'done']
}

/**
 * Stages yang WAJIB upload foto bukti (untuk accountability).
 * Tiap transition ke stage ini butuh minimal 1 foto.
 *
 * V3: tambah 'steam' (QC jahitan) & 'scheduled' (jadwal pasang) untuk
 * accountability + audit trail yang lebih kuat.
 */
export const PHOTO_REQUIRED_STAGES: readonly OrderStatus[] = [
  'sorted', // foto barang pesanan
  'steam', // foto hasil QC jahitan
  'shipped', // foto + resi (kirim flow)
  'scheduled' // foto jadwal + alamat pasang (pasang flow)
] as const

/**
 * Get the next stage in pipeline for given classification.
 * Returns null if currentStage is the last stage.
 */
export function getNextStage(currentStage: OrderStatus, classification: OrderClassification): OrderStatus | null {
  const stages = ORDER_STAGES_BY_CLASSIFICATION[classification]
  const idx = stages.indexOf(currentStage)
  if (idx === -1 || idx === stages.length - 1) return null
  return stages[idx + 1]
}

/**
 * Check if a stage requires photo upload before transition.
 */
export function isPhotoRequired(stage: OrderStatus): boolean {
  return PHOTO_REQUIRED_STAGES.includes(stage)
}

/**
 * Get human-readable label untuk next stage button.
 * Mis. "Input Resi" untuk kirim packed->shipped, "Jadwalkan Pasang" untuk pasang packed->scheduled.
 */
export function getNextStageButtonLabel(currentStage: OrderStatus, classification: OrderClassification): string {
  if (currentStage === 'new') return 'Approve Pembayaran' // 2026-07-31: new → payment_ok (finance/admin)
  if (currentStage === 'packed' && classification === 'kirim') return 'Input Resi'
  if (currentStage === 'packed' && classification === 'pasang') return 'Jadwalkan Pasang'
  if (currentStage === 'ready') return 'QC Pass'
  if (currentStage === 'steam') return 'QC Pass'
  if (currentStage === 'sorted') return 'Mulai Produksi'
  if (currentStage === 'production') return 'Submit Report'
  return 'Lanjut'
}
