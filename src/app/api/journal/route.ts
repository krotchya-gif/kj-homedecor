import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

interface JournalLine {
  account_id: string
  debit: number
  credit: number
  description?: string
}

interface CreateJournalOptions {
  reference_type?: string
  reference_id?: string
  description: string
  entry_date?: string
  lines: JournalLine[]
  is_auto?: boolean
}

/**
 * Helper function to create a journal entry with lines.
 * Automatically reads account_mappings to resolve debit/credit accounts
 * when transaction_type is provided.
 *
 * Usage:
 * POST /api/journal { reference_type, reference_id, description, lines }
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: CreateJournalOptions = await request.json()

  try {
    const { lines, description, reference_type, reference_id, entry_date, is_auto = false } = body

    if (!lines || lines.length === 0) {
      return NextResponse.json({ error: 'Journal lines required' }, { status: 400 })
    }

    // Validate balanced entries
    const totalDebit = lines.reduce((s, l) => s + (l.debit ?? 0), 0)
    const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0)
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({
        error: `Journal not balanced — debit ${totalDebit}, credit ${totalCredit}`,
      }, { status: 400 })
    }

    // Create journal entry
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

    if (entryError) {
      return NextResponse.json({ error: entryError.message }, { status: 500 })
    }

    // Create journal lines
    const linesToInsert = lines.map(l => ({
      entry_id: entry.id,
      account_id: l.account_id,
      debit: l.debit ?? 0,
      credit: l.credit ?? 0,
      description: l.description ?? null,
    }))

    const { error: linesError } = await supabase.from('journal_lines').insert(linesToInsert)
    if (linesError) {
      // Rollback: delete entry
      await supabase.from('journal_entries').delete().eq('id', entry.id)
      return NextResponse.json({ error: linesError.message }, { status: 500 })
    }

    return NextResponse.json({ data: entry, error: null }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err ?? 'Unknown error')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET - list recent journal entries
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get('limit') ?? 50)

  const { data, error } = await supabase
    .from('journal_entries')
    .select('*, lines:journal_lines(count)')
    .order('entry_date', { ascending: false })
    .limit(limit)

  return NextResponse.json({ data: data ?? [], error })
}