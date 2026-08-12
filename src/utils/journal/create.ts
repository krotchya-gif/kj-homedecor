import { createClient } from '@/utils/supabase/client'
import { formatRp } from '@/lib/utils'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface JournalLineInput {
  account_id: string
  debit?: number
  credit?: number
  description?: string
}

export interface CreateJournalOptions {
  reference_type?: string
  reference_id?: string
  description: string
  entry_date?: string
  idempotency_key?: string
  lines: JournalLineInput[]
  is_auto?: boolean
  baseUrl?: string
  /** Server client (ber-session / service role). Kalau ada, jurnal dibuat via RPC
   *  langsung — menghindari 401 karena route /api/journal wajib cookie session. */
  supabase?: SupabaseClient
}

/**
 * Create a journal entry.
 * BUG-009 fix (2026-08-11): di server context (Next.js route handler / Node 18+),
 * `fetch` TIDAK mendukung URL relatif — `fetch('/api/journal')` throw
 * "Failed to parse URL" sehingga semua jurnal server (order_created, purchase,
 * expense_paid) diam-diam gagal. Solusi: pemanggil server wajib kirim `baseUrl`
 * (biasanya process.env.NEXT_PUBLIC_BASE_URL); di browser cukup relative.
 *
 * BUG-058 fix (2026-08-13): kalau pemanggil mengirim `supabase` (server client),
 * jurnal dipanggil LANGSUNG via RPC `create_journal_atomic` — karena route
 * /api/journal tetap fetch HTTP TANPA cookie (fetch tidak membawa cookie dari
 * route handler) → selalu 401 → jurnal server tak pernah tersimpan. RPC jalan
 * di sesi yang sama (token user / service role) sehingga aman & idempotent.
 */
export async function createJournalEntry(options: CreateJournalOptions) {
  const { supabase } = options

  if (supabase) {
    const { data } = await supabase.auth.getUser()
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_journal_atomic', {
      p_idempotency_key: options.idempotency_key ?? null,
      p_reference_type: options.reference_type ?? null,
      p_reference_id: options.reference_id ?? null,
      p_description: options.description,
      p_entry_date: options.entry_date ?? new Date().toISOString().split('T')[0],
      p_is_auto: options.is_auto ?? false,
      p_lines: options.lines.map((l) => ({
        account_id: l.account_id,
        debit: l.debit ?? 0,
        credit: l.credit ?? 0,
        description: l.description ?? null
      })),
      p_created_by: data?.user?.id ?? null
    })
    if (rpcError) throw new Error(rpcError.message)
    return rpcData
  }

  const baseUrl = options.baseUrl?.replace(/\/$/, '')
  const url = baseUrl ? `${baseUrl}/api/journal` : '/api/journal'
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Failed to create journal entry')
  return json.data
}

/**
 * Get account mapping by transaction type.
 * BUG-009 fix (2026-08-11): terima `supabase` client opsional — di server context
 * browser client TANPA session tidak bisa baca account_mappings (RLS authenticated-only)
 * → mapping null → jurnal gagal. Pemanggil server wajib kirim server client (ber-session).
 */
export async function getAccountMapping(transactionType: string, supabase?: SupabaseClient) {
  const db = supabase ?? createClient()
  const { data } = await db
    .from('account_mappings')
    .select(
      '*, debit_account:accounts!debit_account_id(id, code, name), credit_account:accounts!credit_account_id(id, code, name)'
    )
    .eq('transaction_type', transactionType)
    .eq('is_active', true)
    .single()
  return data
}

/**
 * Create a simple 2-line journal (debit + credit) using an account mapping.
 * Falls back to manual accounts if mapping not configured.
 * F-12 fix: `debit_account_id`/`credit_account_id` yang DIKIRIM eksplisit
 * (mis. pilihan akun kas di form pembayaran) menang atas mapping — mapping
 * hanya jadi fallback saat tidak dikirim.
 */
export async function createSimpleJournal(options: {
  transaction_type: string
  reference_type: string
  reference_id: string
  description: string
  amount: number
  debit_account_id?: string
  credit_account_id?: string
  entry_date?: string
  idempotency_key?: string
  baseUrl?: string
  supabase?: SupabaseClient
}) {
  const { transaction_type, reference_type, reference_id, description, amount, entry_date, baseUrl, supabase } = options

  const mapping = await getAccountMapping(transaction_type, supabase)
  // F-12: akun eksplisit dari pemanggil (mis. pilihan akun kas di UI) > mapping
  const debitAccountId = options.debit_account_id ?? mapping?.debit_account_id
  const creditAccountId = options.credit_account_id ?? mapping?.credit_account_id

  if (!debitAccountId || !creditAccountId) {
    throw new Error(
      `No mapping or fallback accounts for transaction type "${transaction_type}" — configure in /finance/accounts/mapping`
    )
  }

  return createJournalEntry({
    reference_type,
    reference_id,
    description,
    entry_date: entry_date ?? new Date().toISOString().split('T')[0],
    idempotency_key: options.idempotency_key,
    is_auto: true,
    baseUrl: options.baseUrl,
    supabase,
    lines: [
      { account_id: debitAccountId, debit: amount, credit: 0 },
      { account_id: creditAccountId, debit: 0, credit: amount }
    ]
  })
}
