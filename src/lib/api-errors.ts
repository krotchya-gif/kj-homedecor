/**
 * Helper untuk meredaksi error mentah (Supabase/Postgres) sebelum dikirim ke client.
 * - Log detail lengkap ke server (console.error) untuk debugging
 * - Kembalikan pesan generik ke client (cegah kebocoran detail skema DB)
 */
export function toClientError(err: unknown, context?: string): string {
  const raw = err instanceof Error ? err.message : String(err ?? 'unknown error')
  if (context) console.error(`[${context}]`, raw)
  else console.error(raw)
  return 'Terjadi kesalahan. Hubungi administrator jika berlanjut.'
}
