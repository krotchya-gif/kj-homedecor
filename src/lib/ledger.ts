import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Hitung saldo akun LIVE dari journal_lines (bukan kolom `accounts.balance`
 * yang tidak pernah di-update otomatis).
 *
 * Kolom `accounts.balance` (migration 055) tidak pernah di-touch oleh API journal
 * (POST /api/journal cuma insert journal_entries + journal_lines) → laporan
 * neraca/laba-rugi/buku-besar yang pakai `a.balance` selalu tampil 0.
 *
 * Formula (double-entry):
 *   akun normal debit  (asset, expense)    → balance = Σ(debit) − Σ(credit)
 *   akun normal credit (liability, equity, revenue) → balance = Σ(credit) − Σ(debit)
 *
 * @param supabase client (browser/server)
 * @param startDate ISO date 'YYYY-MM-DD' (inklusif) — default 2020-01-01
 * @param endDate   ISO date 'YYYY-MM-DD' (inklusif) — default 2099-12-31
 * @param types     filter tipe akun (mis. ['revenue','expense'] untuk laba-rugi)
 */
export async function fetchAccountBalances(
  supabase: SupabaseClient,
  startDate = '2020-01-01',
  endDate = '2099-12-31',
  types?: string[]
) {
  let q = supabase.from('accounts').select('*').order('code')
  if (types && types.length > 0) q = q.in('type', types)

  const { data: accounts, error } = await q
  if (error) return { data: [], error }

  const { data: lines, error: lineError } = await supabase
    .from('journal_lines')
    .select('account_id, debit, credit, entry:journal_entries!inner(entry_date)')
    .gte('entry.entry_date', startDate)
    .lte('entry.entry_date', endDate)

  if (lineError) return { data: [], error: lineError }

  const sums = new Map<string, { debit: number; credit: number }>()
  for (const l of lines ?? []) {
    const cur = sums.get(l.account_id) ?? { debit: 0, credit: 0 }
    cur.debit += Number(l.debit ?? 0)
    cur.credit += Number(l.credit ?? 0)
    sums.set(l.account_id, cur)
  }

  const data = (accounts ?? []).map((a) => {
    const s = sums.get(a.id) ?? { debit: 0, credit: 0 }
    const raw = s.debit - s.credit
    const balance = a.normal_side === 'credit' ? -raw : raw
    return { ...a, balance }
  })

  return { data, error: null }
}
