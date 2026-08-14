import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit, getClientIp } from '@/lib/auth'

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
    idempotency_key: z.string().max(200).optional().nullable(),
    is_auto: z.boolean().optional().default(false),
    lines: z.array(JournalLineSchema).min(1, 'Minimal 1 baris').max(50, 'Maksimal 50 baris')
  })
  .refine((d) => d.lines.every((l) => (l.debit > 0) !== (l.credit > 0)), {
    message: 'Setiap baris harus punya tepat satu sisi (debit ATAU credit)'
  })

/**
 * Helper function to create a journal entry with lines.
 *
 * F-57/F-19/F-54 fix (2026-08-12):
 * - Insert entry + lines + update saldo kas via SATU RPC atomik
 *   (create_journal_atomic) — bukan 2 query + rollback manual
 * - Idempotency key: retry/klik ganda tidak bikin jurnal ganda
 * - Role check + is_auto selalu server-side (client tidak bisa spoof)
 */
export async function POST(request: Request) {
  if (checkRateLimit(getClientIp(request), 60, 60_000).blocked) {
    return NextResponse.json({ data: null, error: { message: 'Too many requests' } }, { status: 429 })
  }
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

  const { lines, description, reference_type, reference_id, entry_date, idempotency_key, is_auto } = parsed.data

  // is_auto: dikirim oleh createSimpleJournal (jurnal otomatis = true); manual = false.
  // Hanya finance/admin/owner yang bisa POST, jadi label aman dipertahankan dari client.

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

    // F-57/F-19 fix: satu RPC atomik (entry + lines + saldo kas) — bukan 2 query
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_journal_atomic', {
      p_idempotency_key: idempotency_key ?? null,
      p_reference_type: reference_type ?? null,
      p_reference_id: reference_id ?? null,
      p_description: description,
      p_entry_date: entry_date ?? new Date().toISOString().split('T')[0],
      p_is_auto: is_auto,
      p_lines: lines.map((l) => ({
        account_id: l.account_id,
        debit: l.debit,
        credit: l.credit,
        description: l.description ?? null
      })),
      p_created_by: user.id
    })

    if (rpcError) {
      return NextResponse.json(
        { data: null, error: { message: 'Gagal menyimpan jurnal' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: rpcData, error: null }, { status: 201 })
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Internal error' } }, { status: 500 })
  }
}

/**
 * GET - list recent journal entries
 */
export async function GET(request: Request) {
  if (checkRateLimit(getClientIp(request), 120, 60_000).blocked) {
    return NextResponse.json({ data: null, error: { message: 'Too many requests' } }, { status: 429 })
  }
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  // Security fix (2026-08-12): GET jurnal hanya finance/admin/owner aktif —
  // data debit/kredit/saldo tidak boleh bocor ke role operasional.
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active' || !['finance', 'admin', 'owner'].includes(requester.role)) {
    return NextResponse.json({ data: null, error: { message: 'Forbidden: hanya finance/admin/owner' } }, { status: 403 })
  }

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
