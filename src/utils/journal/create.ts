import { createClient } from '@/utils/supabase/client'
import { createClient as createServerClient } from '@/utils/supabase/server'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

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
  lines: JournalLineInput[]
  is_auto?: boolean
}

/**
 * Create a journal entry via API route.
 * Returns the created entry on success, throws on failure.
 *
 * In browser context: uses fetch to /api/journal (client-side safe).
 * In server context: calls Supabase directly (avoids double-fetch).
 */
export async function createJournalEntry(options: CreateJournalOptions) {
  // Use direct Supabase call in server context (async createClient)
  // Fall back to fetch in browser context
  const isServer = typeof window === 'undefined'

  if (isServer) {
    const supabase = await createServerClient()
    const { lines, description, reference_type, reference_id, entry_date, is_auto = false } = options

    const totalDebit = lines.reduce((s, l) => s + (l.debit ?? 0), 0)
    const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0)

    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        entry_date: entry_date ?? new Date().toISOString().split('T')[0],
        description,
        reference_type: reference_type ?? null,
        reference_id: reference_id ?? null,
        total_debit: totalDebit,
        total_credit: totalCredit,
        is_auto,
      })
      .select()
      .single()

    if (entryError) throw new Error(entryError.message)

    const linesToInsert = lines.map(l => ({
      entry_id: entry.id,
      account_id: l.account_id,
      debit: l.debit ?? 0,
      credit: l.credit ?? 0,
      description: l.description ?? null,
    }))

    const { error: linesError } = await supabase.from('journal_lines').insert(linesToInsert)
    if (linesError) {
      await supabase.from('journal_entries').delete().eq('id', entry.id)
      throw new Error(linesError.message)
    }

    return entry
  }

  // Browser context: use API route
  const res = await fetch('/api/journal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Failed to create journal entry')
  return json.data
}

/**
 * Get account mapping by transaction type.
 */
export async function getAccountMapping(transactionType: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('account_mappings')
    .select('*, debit_account:accounts!debit_account_id(id, code, name), credit_account:accounts!credit_account_id(id, code, name)')
    .eq('transaction_type', transactionType)
    .eq('is_active', true)
    .single()
  return data
}

/**
 * Create a simple 2-line journal (debit + credit) using an account mapping.
 * Falls back to manual accounts if mapping not configured.
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
}) {
  const { transaction_type, reference_type, reference_id, description, amount, entry_date } = options

  // Try to get mapping
  const mapping = await getAccountMapping(transaction_type)
  const debitAccountId = mapping?.debit_account_id ?? options.debit_account_id
  const creditAccountId = mapping?.credit_account_id ?? options.credit_account_id

  if (!debitAccountId || !creditAccountId) {
    throw new Error(`No mapping or fallback accounts for transaction type "${transaction_type}" — configure in /finance/accounts/mapping`)
  }

  return createJournalEntry({
    reference_type,
    reference_id,
    description,
    entry_date: entry_date ?? new Date().toISOString().split('T')[0],
    is_auto: true,
    lines: [
      { account_id: debitAccountId, debit: amount, credit: 0 },
      { account_id: creditAccountId, debit: 0, credit: amount },
    ],
  })
}