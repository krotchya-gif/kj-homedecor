'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Scale, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { formatRp } from '@/lib/utils'


interface DiffRow {
  label: string
  a: number
  b: number
  diff: number
  desc: string
}

export default function RekonsiliasiPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<DiffRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        // 1. Piutang: tabel piutang vs orders (sisa tagihan)
        const [{ data: piutang }, { data: orders }] = await Promise.all([
          supabase.from('piutang').select('amount, paid_amount, return_amount, fee_amount').in('status', ['pending', 'partial']),
          supabase
            .from('orders')
            .select('total_amount, dp_amount, lunas_amount, payment_status, status')
            .neq('payment_status', 'paid')
            .neq('status', 'cancelled')
        ])
        const piutangTabel = (piutang ?? []).reduce(
          (s, p) =>
            s +
            Math.max(
              0,
              Number(p.amount ?? 0) - Number(p.paid_amount ?? 0) - Number(p.return_amount ?? 0) - Number(p.fee_amount ?? 0)
            ),
          0
        )
        const piutangOrders = (orders ?? []).reduce(
          (s, o) => s + Math.max(0, Number(o.total_amount ?? 0) - Number(o.dp_amount ?? 0) - Number(o.lunas_amount ?? 0)),
          0
        )

        // 2. Kas: journal_lines (akun kas) vs cash_accounts.balance
        const [{ data: cashAcc }, { data: cashLines }] = await Promise.all([
          supabase.from('cash_accounts').select('balance'),
          supabase.from('journal_lines').select('debit, credit, account:accounts!inner(id, is_cash_account)')
        ])
        const kasBalance = (cashAcc ?? []).reduce((s, c) => s + Number(c.balance ?? 0), 0)
        const kasJournal = (cashLines ?? [])
          .filter((l) => (l.account as unknown as { is_cash_account?: boolean } | null)?.is_cash_account)
          .reduce((s, l) => s + Number(l.debit ?? 0) - Number(l.credit ?? 0), 0)

        // 3. Revenue: orders (omzet) vs journal_lines akun revenue
        const [{ data: omzetOrders }, { data: revLines }] = await Promise.all([
          supabase.from('orders').select('total_amount').neq('status', 'cancelled'),
          supabase.from('journal_lines').select('debit, credit, account:accounts!inner(id, type)')
        ])
        const omzetOrdersSum = (omzetOrders ?? []).reduce((s, o) => s + Number(o.total_amount ?? 0), 0)
        const revJournal = (revLines ?? [])
          .filter((l) => (l.account as unknown as { type?: string } | null)?.type === 'revenue')
          .reduce((s, l) => s + Number(l.credit ?? 0) - Number(l.debit ?? 0), 0)

        // 4. Hutang: tabel hutang vs journal_lines akun liability (2101)
        const [{ data: hutang }, { data: hutangLines }] = await Promise.all([
          supabase.from('hutang').select('amount, paid_amount, return_amount').in('status', ['pending', 'partial']),
          supabase
            .from('journal_lines')
            .select('debit, credit, account:accounts!inner(id, code)')
            .eq('account.code', '2101')
        ])
        const hutangTabel = (hutang ?? []).reduce(
          (s, h) => s + Math.max(0, Number(h.amount ?? 0) - Number(h.paid_amount ?? 0) - Number(h.return_amount ?? 0)),
          0
        )
        const hutangJournal = (hutangLines ?? []).reduce(
          (s, l) => s + Number(l.credit ?? 0) - Number(l.debit ?? 0),
          0
        )

        setRows([
          {
            label: 'Piutang',
            a: piutangTabel,
            b: piutangOrders,
            diff: piutangTabel - piutangOrders,
            desc: 'Tabel piutang (faktur + settlement) vs orders belum lunas. Selisih = order belum difakturkan / faktur tanpa order.'
          },
          {
            label: 'Kas',
            a: kasJournal,
            b: kasBalance,
            diff: kasJournal - kasBalance,
            desc: 'Journal lines akun kas vs cash_accounts.balance. Selisih = jurnal gagal / edit saldo manual lama.'
          },
          {
            label: 'Revenue',
            a: revJournal,
            b: omzetOrdersSum,
            diff: revJournal - omzetOrdersSum,
            desc: 'Journal lines akun Penjualan vs omzet orders. Selisih = order tanpa jurnal / jurnal dobel.'
          },
          {
            label: 'Hutang',
            a: hutangTabel,
            b: hutangJournal,
            diff: hutangTabel - hutangJournal,
            desc: 'Tabel hutang vs journal lines akun 2101. Selisih = tagihan tanpa jurnal / bayar tidak tercatat jurnal.'
          }
        ])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gagal memuat data')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#cc7030' }} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Rekonsiliasi" subtitle="Cek keselarasan antar sumber data keuangan (read-only)" />

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem', padding: '1rem', color: '#b91c1c', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        {rows.map((r) => {
          const ok = Math.abs(r.diff) < 1
          return (
            <div
              key={r.label}
              style={{
                background: 'var(--surface)',
                border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: '0.875rem',
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {ok ? <CheckCircle2 size={18} style={{ color: '#16a34a' }} /> : <AlertTriangle size={18} style={{ color: '#dc2626' }} />}
                <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--neutral-800)', margin: 0 }}>{r.label}</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--neutral-600)' }}>Sumber A</span>
                  <span style={{ fontWeight: '700' }}>{formatRp(r.a)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--neutral-600)' }}>Sumber B</span>
                  <span style={{ fontWeight: '700' }}>{formatRp(r.b)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #e5e7eb',
                    marginTop: '0.35rem',
                    paddingTop: '0.35rem'
                  }}
                >
                  <span style={{ color: 'var(--neutral-600)' }}>Selisih</span>
                  <span style={{ fontWeight: '800', color: ok ? '#16a34a' : '#dc2626' }}>{formatRp(r.diff)}</span>
                </div>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', marginTop: '0.75rem', lineHeight: 1.5 }}>{r.desc}</p>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--neutral-500)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Scale size={14} />
        Selisih yang tampil adalah informasi — halaman ini read-only. Perbaikan otomatis belum tersedia.
      </div>
    </div>
  )
}
