/**
 * ID akun COA tetap (seeded) yang dipakai logika jurnal.
 * Migration 077 (2026-08-13): 1104 "Xendit Cash" di-rename menjadi
 * "E Wallet Tiktok" — settlement marketplace TikTok dicatat ke sini.
 */
export const E_WALLET_TIKTOK_ACCOUNT_ID = '22222222-2222-4222-8222-222222222204'

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Phase 3 (BUG-095): ambil ID akun COA berdasarkan `code` (kode stabil) —
 * BUKAN hardcoded UUID. UUID bisa berubah saat DB di-reset/drift; code tidak.
 * Dipakai menggantikan UUID hardcoded di jurnal client (assets, settings,
 * piutang adj/retur) agar tidak "bom waktu" saat schema berubah.
 */
export async function getAccountIdByCode(
  supabase: SupabaseClient,
  code: string
): Promise<string | null> {
  const { data } = await supabase.from('accounts').select('id').eq('code', code).maybeSingle()
  return data?.id ?? null
}
