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
    // BUG-010 fix (2026-08-11): kolom `accounts.normal_side` TIDAK pernah diisi di
    // migration (058 menyebut "kolom mati") → semua akun dulu dianggap debit-normal
    // sehingga saldo liability/equity/revenue TERBALIK TANDA.
    // Sekarang hitung tanda dari `accounts.type` (konsisten dgn halaman CoA):
    //   asset / expense → normal debit  (balance = Σdebit − Σcredit)
    //   liability / equity / revenue → normal credit (balance = Σcredit − Σdebit)
    // `normal_side` (jika suatu saat diisi) tetap jadi override.
    const isDebitNormal = a.normal_side ? a.normal_side === 'debit' : ['asset', 'expense'].includes(a.type)
    const balance = isDebitNormal ? raw : -raw
    return { ...a, balance }
  })

  return { data, error: null }
}

export interface AccountLine {
  entry_date: string
  description: string
  reference_type: string | null
  debit: number
  credit: number
  running_balance: number
}

/**
 * Phase 4 (BUG-100): SATU sumber kebenaran untuk sisa piutang.
 * Dipakai oleh umur-piutang, finance dashboard, payments, channel, rekonsiliasi,
 * settings — agar tidak ada lagi "3 rumus piutang" yang beda-beda (F-61 & BUG-034).
 * Formula: amount − paid − return − fee (fee marketplace dipotong dari tagihan).
 * Hasil dikunci ≥ 0 (piutang tidak negatif).
 */
export function piutangSisa(p: {
  amount?: number | null
  paid_amount?: number | null
  return_amount?: number | null
  fee_amount?: number | null
}): number {
  const sisa = Number(p.amount ?? 0) - Number(p.paid_amount ?? 0) - Number(p.return_amount ?? 0) - Number(p.fee_amount ?? 0)
  return Math.max(0, sisa)
}

/**
 * F-58 fix: ambil DETAIL transaksi (journal_lines) per akun untuk Buku Besar,
 * diurutkan per tanggal dengan running balance.
 * Tanda saldo mengikuti normal-side akun (asset/expense debit; liability/equity/revenue credit).
 */
export async function fetchAccountLines(
  supabase: SupabaseClient,
  accountId: string,
  startDate = '2020-01-01',
  endDate = '2099-12-31'
): Promise<{ data: AccountLine[]; error: unknown }> {
  const { data: account, error: accErr } = await supabase.from('accounts').select('type, normal_side').eq('id', accountId).single()
  if (accErr) return { data: [], error: accErr }

  const { data: lines, error: lineError } = await supabase
    .from('journal_lines')
    .select('debit, credit, description, entry:journal_entries!inner(entry_date, description, reference_type)')
    .eq('account_id', accountId)
    .gte('entry.entry_date', startDate)
    .lte('entry.entry_date', endDate)
    .order('entry_date', { foreignTable: 'entry' })

  if (lineError) return { data: [], error: lineError }

  const isDebitNormal = account?.normal_side ? account.normal_side === 'debit' : ['asset', 'expense'].includes(account?.type)
  let running = 0
  const data = (lines ?? [])
    .map((l) => {
      const entry = Array.isArray(l.entry) ? l.entry[0] : l.entry
      const debit = Number(l.debit ?? 0)
      const credit = Number(l.credit ?? 0)
      const delta = isDebitNormal ? debit - credit : credit - debit
      running += delta
      return {
        entry_date: String(entry?.entry_date ?? ''),
        description: String(entry?.description ?? l.description ?? ''),
        reference_type: (entry?.reference_type as string | null) ?? null,
        debit,
        credit,
        running_balance: running
      }
    })
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))

  return { data, error: null }
}
