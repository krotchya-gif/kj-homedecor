import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const JournalLineSchema = z.object({
  account_id: z.string().uuid('account_id tidak valid'),
  debit: z.number().min(0).max(1e15).optional().default(0),
  credit: z.number().min(0).max(1e15).optional().default(0),
  description: z.string().max(255).optional().nullable()
})

const CreateJournalSchema = z
  .object({
    reference_type: z.string().max(50).optional().nullable(),
    reference_id: z.string().uuid('reference_id harus UUID').optional().nullable(),
    description: z.string().min(1, 'Deskripsi wajib').max(500),
    entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'entry_date format YYYY-MM-DD').optional(),
    lines: z.array(JournalLineSchema).min(1, 'Minimal 1 baris').max(50, 'Maksimal 50 baris')
  })
  .refine((d) => d.lines.every((l) => (l.debit > 0) !== (l.credit > 0)), {
    message: 'Setiap baris harus punya tepat satu sisi (debit ATAU credit)'
  })

/**
 * Helper function to create a journal entry with lines.
 *
 * BUG-019 fix (2026-08-11):
 * - Role check: hanya finance/admin/owner yang boleh menulis jurnal
 * - Validasi Zod: UUID, non-negatif, balanced, max 50 baris
 * - `is_auto` SELALU di-set server (client tidak bisa spoof)
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  // Role check — BUG-019
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  const allowed = requester && requester.status === 'active' && ['finance', 'admin', 'owner'].includes(requester.role)
  if (!allowed) {
    return NextResponse.json({ data: null, error: { message: 'Forbidden: hanya finance/admin/owner' } }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Body tidak valid' } }, { status: 400 })
  }

  const parsed = CreateJournalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: { message: parsed.error.issues[0].message } }, { status: 400 })
  }

  const { lines, description, reference_type, reference_id, entry_date } = parsed.data

  // BUG-019: is_auto SELALU server-side (false untuk POST manual)
  const isAuto = false

  try {
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0)
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0)
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        {
          data: null,
          error: { message: `Journal tidak balance — debit ${totalDebit}, credit ${totalCredit}` }
        },
        { status: 400 }
      )
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
        is_auto: isAuto,
        created_by: user.id
      })
      .select()
      .single()

    if (entryError) {
      return NextResponse.json({ data: null, error: { message: 'Gagal menyimpan jurnal' } }, { status: 500 })
    }

    // Create journal lines
    const linesToInsert = lines.map((l) => ({
      entry_id: entry.id,
      account_id: l.account_id,
      debit: l.debit,
      credit: l.credit,
      description: l.description ?? null
    }))

    const { error: linesError } = await supabase.from('journal_lines').insert(linesToInsert)
    if (linesError) {
      await supabase.from('journal_entries').delete().eq('id', entry.id)
      return NextResponse.json({ data: null, error: { message: 'Gagal menyimpan baris jurnal' } }, { status: 500 })
    }

    return NextResponse.json({ data: entry, error: null }, { status: 201 })
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Internal error' } }, { status: 500 })
  }
}

/**
 * GET - list recent journal entries
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limitRaw = Number(searchParams.get('limit') ?? 50)
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 50

  const { data, error } = await supabase
    .from('journal_entries')
    .select('*, lines:journal_lines(count)')
    .order('entry_date', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ data: [], error: { message: 'Gagal memuat jurnal' } }, { status: 500 })
  return NextResponse.json({ data: data ?? [], error: null })
}
