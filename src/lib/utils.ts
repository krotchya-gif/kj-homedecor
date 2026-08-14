import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export function formatRp(amount: number): string {
  return formatCurrency(amount)
}

/**
 * Format tanggal YYYY-MM-DD (string DB / input date) → DD/MM/YYYY.
 * BUG-077 fix (2026-08-13): tampilan tanggal konsisten dd/mm/yyyy di seluruh UI.
 * Aman untuk null/empty/format lain (dikembalikan apa adanya).
 */
export function formatDateDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr) return '-'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  return dateStr
}
