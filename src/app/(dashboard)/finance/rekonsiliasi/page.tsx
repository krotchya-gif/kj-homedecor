'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Scale, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { formatRp } from '@/lib/utils'


interface DiffRow {
  label: string
  sumberA: string
  sumberB: string
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
            sumberA: 'Piutang (tabel faktur & settlement)',
            sumberB: 'Sisa tagihan (orders belum lunas)',
            a: piutangTabel,
            b: piutangOrders,
            diff: piutangTabel - piutangOrders,
            desc: 'Membandingkan total sisa tagihan yang tercatat di tabel piutang dengan sisa tagihan yang dihitung dari pesanan. Selisih muncul kalau ada pesanan yang belum dibuatkan faktur piutang, atau faktur tanpa pesanan terkait.'
          },
          {
            label: 'Kas',
            sumberA: 'Saldo kas (dari jurnal)',
            sumberB: 'Saldo kas (tabel cash_accounts)',
            a: kasJournal,
            b: kasBalance,
            diff: kasJournal - kasBalance,
            desc: 'Membandingkan total saldo kas yang dihitung dari jurnal dengan saldo yang tersimpan di tabel kas. Selisih muncul kalau ada jurnal yang gagal tersimpan, atau saldo pernah diubah manual.'
          },
          {
            label: 'Revenue',
            sumberA: 'Penjualan (dari jurnal)',
            sumberB: 'Omzet (total pesanan)',
            a: revJournal,
            b: omzetOrdersSum,
            diff: revJournal - omzetOrdersSum,
            desc: 'Membandingkan total penjualan yang tercatat di jurnal dengan total omzet dari pesanan. Selisih muncul kalau ada pesanan tanpa jurnal, atau jurnal dicatat dua kali.'
          },
          {
            label: 'Hutang',
            sumberA: 'Hutang (tabel tagihan)',
            sumberB: 'Hutang (jurnal akun 2101)',
            a: hutangTabel,
            b: hutangJournal,
            diff: hutangTabel - hutangJournal,
            desc: 'Membandingkan total hutang di tabel tagihan dengan hutang yang tercatat di jurnal. Selisih muncul kalau ada tagihan tanpa jurnal, atau pembayaran tidak dicatat ke jurnal.'
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

  const okCount = rows.filter((r) => Math.abs(r.diff) < 1).length
  const allOk = okCount === rows.length

  return (
    <div>
      <PageHeader title="Rekonsiliasi" subtitle="Cek keselarasan antar sumber data keuangan (read-only)" />

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem', padding: '1rem', color: '#b91c1c', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Kesimpulan */}
      <div
        style={{
          background: allOk ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${allOk ? '#bbf7d0' : '#fde68a'}`,
          borderRadius: '0.75rem',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}
      >
        {allOk ? (
          <CheckCircle2 size={22} style={{ color: '#16a34a', flexShrink: 0 }} />
        ) : (
          <AlertTriangle size={22} style={{ color: '#d97706', flexShrink: 0 }} />
        )}
        <div>
          <div style={{ fontWeight: '800', fontSize: '0.95rem', color: allOk ? '#166534' : '#92400e' }}>
            {allOk ? 'Semua sumber data seimbang' : `${rows.length - okCount} dari ${rows.length} sumber data memiliki selisih`}
          </div>
          <div style={{ fontSize: '0.8rem', color: allOk ? '#15803d' : '#b45309' }}>
            {allOk
              ? 'Tidak ada selisih yang perlu ditindaklanjuti.'
              : 'Buka kartu di bawah untuk melihat sumber mana yang berbeda dan artinya.'}
          </div>
        </div>
      </div>

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
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    padding: '0.15rem 0.6rem',
                    borderRadius: '999px',
                    background: ok ? '#dcfce7' : '#fee2e2',
                    color: ok ? '#166534' : '#b91c1c'
                  }}
                >
                  {ok ? '✓ Seimbang' : '⚠️ Ada Selisih'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{ color: 'var(--neutral-600)' }}>{r.sumberA}</span>
                  <span style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>{formatRp(r.a)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{ color: 'var(--neutral-600)' }}>{r.sumberB}</span>
                  <span style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>{formatRp(r.b)}</span>
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
        Halaman ini hanya menampilkan informasi — tidak mengubah data apa pun. Perbaikan dilakukan lewat jalur pencatatan yang sudah ada (jurnal, pembayaran, dll).
      </div>
    </div>
  )
}
