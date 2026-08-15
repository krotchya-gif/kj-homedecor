/**
 * ID akun COA diambil via `getAccountIdByCode` (kode stabil) — DILARANG hardcode
 * UUID akun di client (UUID bisa berubah saat DB di-reset/drift).
 */
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
