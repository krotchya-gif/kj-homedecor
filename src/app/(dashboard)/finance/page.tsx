'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { DollarSign, BarChart3, WashingMachine, Loader2, TrendingUp, PieChart as PieChartIcon } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { MotionStagger } from '@/components/ui/Motion'
import { SectionCard } from '@/components/ui/SectionCard'
import { formatRp } from '@/lib/utils'
import { piutangSisa } from '@/lib/ledger'

const COLORS = ['#16a34a', '#f59e0b', '#ef4444', '#2563eb', '#9333ea']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const MODULES = [
  {
    title: 'Pembayaran',
    desc: 'Tracking DP/Lunas dan approval gate',
    href: '/finance/payments',
    icon: <DollarSign size={20} />,
    color: 'green'
  },
  {
    title: 'Laporan',
    desc: 'Laporan keuangan dan pengupahan',
    href: '/finance/reports',
    icon: <BarChart3 size={20} />,
    color: 'teal'
  },
  {
    title: 'Laundry Gaji',
    desc: 'Gaji staff laundry per periode',
    href: '/finance/laundry-payroll',
    icon: <WashingMachine size={20} />,
    color: 'blue'
  }
]

interface Order {
  id: string
  status: string
  payment_status: string
  total_amount: number
  dp_amount?: number
  lunas_amount?: number
  created_at: string
  source: string
}

interface PiutangRow {
  id: string
  amount: number
  fee_amount?: number
  paid_amount: number
  return_amount: number
  created_at: string
  invoice_date?: string
  invoice_number?: string
  customer?: { name?: string } | null
}

interface CashRow {
  id: string
  balance?: number
  bank_name?: string
  account?: { name?: string } | null
}

export default function FinanceDashboard() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [piutang, setPiutang] = useState<PiutangRow[]>([])
  const [cashAccounts, setCashAccounts] = useState<CashRow[]>([])
  const [refundPending, setRefundPending] = useState(0)
  const [rekon, setRekon] = useState<{ piutang: number; kas: number; revenue: number; hutang: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    setLoading(true)
    const [ordersRes, piutangRes, cashRes, refundRes, rekonPiutangOrders, rekonKasLines, rekonRevLines, rekonHutangLines, rekonHutangTable] =
      await Promise.all([
        supabase
          .from('orders')
          .select('id, status, payment_status, total_amount, dp_amount, lunas_amount, created_at, source')
          .order('created_at', { ascending: false }),
        // F-61 fix: piutang dari TABEL piutang (sumber utama) — bukan orders
        supabase
          .from('piutang')
          .select('id, invoice_number, amount, fee_amount, paid_amount, return_amount, created_at, invoice_date, customer:customers(name)')
          .in('status', ['pending', 'partial']),
        supabase.from('cash_accounts').select('id, balance, bank_name, account:accounts(name)').eq('is_active', true),
        supabase
          .from('returns')
          .select('id', { count: 'exact', head: true })
          .eq('refund_status', 'pending'),
        // Rekonsiliasi mini (sesi 45) — 4 pasang sumber, sama seperti halaman /finance/rekonsiliasi
        supabase
          .from('orders')
          .select('total_amount, dp_amount, lunas_amount')
          .neq('payment_status', 'paid')
          .neq('status', 'cancelled'),
        supabase.from('journal_lines').select('debit, credit, account:accounts!inner(id, is_cash_account)'),
        supabase.from('journal_lines').select('debit, credit, account:accounts!inner(id, type)'),
        supabase
          .from('journal_lines')
          .select('debit, credit, account:accounts!inner(id, code)')
          .eq('account.code', '2101'),
        supabase.from('hutang').select('amount, paid_amount, return_amount').in('status', ['pending', 'partial'])
      ])
    setOrders((ordersRes.data as Order[]) ?? [])
    setPiutang((piutangRes.data ?? []) as PiutangRow[])
    setCashAccounts((cashRes.data ?? []) as CashRow[])
    setRefundPending(refundRes.count ?? 0)

    const piutangTabel = piutangRes.data?.reduce(
      (s, p) => s + piutangSisa(p as PiutangRow),
      0
    ) ?? 0
    const piutangOrders = (rekonPiutangOrders.data ?? []).reduce(
      (s, o) => s + Math.max(0, Number(o.total_amount ?? 0) - Number(o.dp_amount ?? 0) - Number(o.lunas_amount ?? 0)),
      0
    )
    const kasBalance = cashRes.data?.reduce((s, c) => s + Number(c.balance ?? 0), 0) ?? 0
    const kasJournal = (rekonKasLines.data ?? [])
      .filter((l) => (l.account as unknown as { is_cash_account?: boolean } | null)?.is_cash_account)
      .reduce((s, l) => s + Number(l.debit ?? 0) - Number(l.credit ?? 0), 0)
    const omzetOrders = ordersRes.data?.reduce((s, o) => s + Number(o.total_amount ?? 0), 0) ?? 0
    const revJournal = (rekonRevLines.data ?? [])
      .filter((l) => (l.account as unknown as { type?: string } | null)?.type === 'revenue')
      .reduce((s, l) => s + Number(l.credit ?? 0) - Number(l.debit ?? 0), 0)
    const hutangTabel = (rekonHutangTable.data ?? []).reduce(
      (s, h) => s + Math.max(0, Number(h.amount ?? 0) - Number(h.paid_amount ?? 0) - Number(h.return_amount ?? 0)),
      0
    )
    const hutangJournal = (rekonHutangLines.data ?? []).reduce(
      (s, l) => s + Number(l.credit ?? 0) - Number(l.debit ?? 0),
      0
    )
    setRekon({
      piutang: piutangTabel - piutangOrders,
      kas: kasJournal - kasBalance,
      revenue: revJournal - omzetOrders,
      hutang: hutangTabel - hutangJournal
    })
    setLoading(false)
  }

  const currentYear = new Date().getFullYear()

  // Monthly revenue (12 months)
  // F-15 fix: hanya order yang SUDAH di-approve (bukan new) & TIDAK cancelled
  const monthlyRevenue: Record<string, number> = {}
  MONTHS_SHORT.forEach((m) => {
    monthlyRevenue[m] = 0
  })
  orders.forEach((o) => {
    if (o.payment_status === 'paid' && o.status !== 'new' && o.status !== 'cancelled') {
      const d = new Date(o.created_at)
      if (d.getFullYear() === currentYear) {
        const month = MONTHS_SHORT[d.getMonth()]
        monthlyRevenue[month] += o.total_amount ?? 0
      }
    }
  })
  const monthlyData = MONTHS_SHORT.map((m) => ({ month: m, revenue: monthlyRevenue[m] }))

  // Payment status distribution (exclude cancelled)
  const statusCounts: Record<string, number> = { paid: 0, partial: 0, pending: 0 }
  orders.forEach((o) => {
    if (o.status === 'cancelled') return
    const s = o.payment_status ?? 'pending'
    statusCounts[s] = (statusCounts[s] ?? 0) + 1
  })
  const STATUS_LABELS: Record<string, string> = { paid: 'Lunas', partial: 'DP', pending: 'Belum Bayar' }
  const paymentStatusData = Object.entries(statusCounts)
    .filter(([_, v]) => v > 0)
    .map(([k, v]) => ({ name: STATUS_LABELS[k] ?? k, value: v }))

  // F-61 fix: piutang aging & total dari TABEL piutang (sumber utama)
  // Phase 4 (BUG-100): pakai helper piutangSisa (satu sumber kebenaran).
  const piutangTotal = piutang.reduce((s, p) => s + piutangSisa(p), 0)

  // Orders waiting for Finance verification (2026-07-31: gate di DEPAN — status='new' menunggu Finance approve ke payment_ok)
  // Finance approve → status='payment_ok' (verifikasi DP/bukti transfer sebelum produksi, anti transfer palsu)
  const needsVerification = orders.filter((o) => o.status === 'new')
  const needsVerificationPaid = needsVerification.filter((o) => o.payment_status === 'paid')

  // Piutang aging buckets (based on invoice_date/created_at)
  const now = new Date()
  const aging = { '<30': 0, '30-60': 0, '60-90': 0, '>90': 0 }
  piutang.forEach((p) => {
    const anchor = p.invoice_date ?? p.created_at ?? ''
    const days = Math.floor((now.getTime() - new Date(anchor).getTime()) / (1000 * 60 * 60 * 24))
    const sisa = piutangSisa(p)
    if (days < 30) aging['<30'] += sisa
    else if (days < 60) aging['30-60'] += sisa
    else if (days < 90) aging['60-90'] += sisa
    else aging['>90'] += sisa
  })
  const agingData = [
    { bucket: '<30 hari', amount: aging['<30'] },
    { bucket: '30-60 hari', amount: aging['30-60'] },
    { bucket: '60-90 hari', amount: aging['60-90'] },
    { bucket: '>90 hari', amount: aging['>90'] }
  ]

  // Sesi 45: piutang tertua (5 faktur terlama) — panel "Piutang Menua"
  const oldestPiutang = [...piutang]
    .map((p) => {
      const anchor = p.invoice_date ?? p.created_at ?? ''
      const days = Math.max(0, Math.floor((now.getTime() - new Date(anchor).getTime()) / (1000 * 60 * 60 * 24)))
      return { ...p, sisa: piutangSisa(p), days, bucket: days < 30 ? '< 30' : days < 60 ? '30-60' : days < 90 ? '60-90' : '> 90' }
    })
    .sort((a, b) => b.days - a.days)
    .slice(0, 5)

  // Sesi 45: status rekonsiliasi mini
  const rekonIssues = rekon ? Object.values(rekon).filter((v) => Math.abs(v) >= 1).length : -1

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#cc7030' }} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Dashboard Finance" subtitle="Kelola pembayaran, laporan keuangan dan payroll laundry" />

      {/* Stat Summary — motion stagger + StatCard (2026-07-31) */}
      <MotionStagger className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          label="Total Piutang"
          value={formatRp(piutangTotal)}
          sub={`${piutang.length} faktur belum lunas`}
          icon={DollarSign}
          accent="#16a34a"
          iconBg="#f0fdf4"
          delay={0}
        />

        <StatCard
            label="Total Pesanan"
          value={orders.filter((o) => o.status !== 'cancelled').length}
          sub="Tanpa yang dibatalkan"
          icon={BarChart3}
          accent="#2563eb"
          iconBg="#eff6ff"
          delay={0.05}
        />

        {/* Butuh Verifikasi Bayar — pipeline: order baru menunggu Finance approve ke payment_ok */}
        {needsVerification.length > 0 && (
          <StatCard
            label="Butuh Verifikasi Bayar"
            value={needsVerification.length}
            sub={
              <span style={{ color: '#991b1b' }}>
                {needsVerificationPaid.length} siap approve · {needsVerification.length - needsVerificationPaid.length}{' '}
                belum lunas
              </span>
            }
            icon={DollarSign}
            accent="#dc2626"
            iconBg="#fef2f2"
            delay={0.1}
            onClick={() => router.push('/finance/payments')}
          />
        )}
      </MotionStagger>

      {/* Charts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '1.5rem',
          marginBottom: '1.5rem'
        }}
      >
        {/* Monthly Revenue Bar Chart */}
        <SectionCard delay={0.1}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <TrendingUp size={16} color="#cc7030" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>
              Omzet per Bulan ({currentYear})
            </h3>
          </div>
          {monthlyData.every((m) => m.revenue === 0) ? (
            <div
              style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-400)' }}
            >
              Tidak ada data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => formatRp(v).replace('Rp ', '').replaceAll('.', '')}
                />
                <Tooltip formatter={(v) => formatRp(v as number)} />
                <Bar dataKey="revenue" fill="#cc7030" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Payment Status Pie Chart */}
        <SectionCard delay={0.16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <PieChartIcon size={16} color="#2563eb" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>
              Distribusi Status Bayar
            </h3>
          </div>
          {paymentStatusData.length === 0 ? (
            <div
              style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-400)' }}
            >
              Tidak ada data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={paymentStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {paymentStatusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Sesi 45: Perlu Tindakan + Saldo Kas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem',
          marginBottom: '1.5rem'
        }}
      >
        {/* Perlu Tindakan */}
        <div className="section-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <DollarSign size={16} color="#cc7030" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>Perlu Tindakan</h3>
          </div>
          {(() => {
            const items = [
              { label: 'Order menunggu approve bayar', count: needsVerification.length, href: '/finance/payments', color: '#dc2626' },
              { label: 'Refund menunggu proses', count: refundPending, href: '/finance/payments', color: '#f59e0b' }
            ].filter((i) => i.count > 0)
            if (items.length === 0) {
              return (
                <p style={{ fontSize: '0.82rem', color: 'var(--neutral-400)', margin: 0 }}>
                  Tidak ada yang perlu ditindaklanjuti.
                </p>
              )
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {items.map((i) => (
                  <a
                    key={i.label}
                    href={i.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.5rem',
                      background: 'var(--neutral-50)',
                      border: '1px solid #e5e7eb',
                      textDecoration: 'none',
                      color: 'var(--neutral-800)',
                      fontSize: '0.82rem'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: i.color, flexShrink: 0 }} />
                      {i.label}
                    </span>
                    <span
                      style={{
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '999px',
                        padding: '0.05rem 0.6rem',
                        fontWeight: '700',
                        fontSize: '0.75rem',
                        color: i.color,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {i.count}
                    </span>
                  </a>
                ))}
              </div>
            )
          })()}
        </div>

        {/* Saldo Kas & Bank */}
        <div className="section-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <DollarSign size={16} color="#2563eb" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>Saldo Kas & Bank</h3>
          </div>
          {cashAccounts.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--neutral-400)', margin: 0 }}>Belum ada akun kas/bank.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {cashAccounts.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    background: 'var(--neutral-50)',
                    border: '1px solid #e5e7eb',
                    fontSize: '0.82rem'
                  }}
                >
                  <span style={{ color: 'var(--neutral-700)' }}>{c.bank_name ?? c.account?.name ?? '—'}</span>
                  <span style={{ fontWeight: '700', color: '#cc7030' }}>{formatRp(c.balance ?? 0)}</span>
                </div>
              ))}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  borderTop: '2px solid #e5e7eb',
                  fontWeight: '800',
                  fontSize: '0.85rem'
                }}
              >
                <span>Total</span>
                <span style={{ color: '#cc7030' }}>{formatRp(cashAccounts.reduce((s, c) => s + (c.balance ?? 0), 0))}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sesi 45: Piutang Menua + Rekonsiliasi mini */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem',
          marginBottom: '1.5rem'
        }}
      >
        {/* Piutang Menua */}
        <div className="section-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <TrendingUp size={16} color="#ef4444" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>Piutang Menua</h3>
            <a
              href="/finance/laporan/umur-piutang"
              style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#cc7030', fontWeight: '600', textDecoration: 'none' }}
            >
              Laporan →
            </a>
          </div>
          {oldestPiutang.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--neutral-400)', margin: 0 }}>Tidak ada piutang terbuka.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {oldestPiutang.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    background: 'var(--neutral-50)',
                    border: '1px solid #e5e7eb',
                    fontSize: '0.82rem'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.customer?.name ?? '—'}
                    <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--neutral-500)' }}>
                      {p.invoice_number ?? ''} · {p.bucket} hari
                    </span>
                  </span>
                  <span style={{ fontWeight: '700', color: p.days >= 90 ? '#dc2626' : p.days >= 60 ? '#ea580c' : '#92400e', whiteSpace: 'nowrap' }}>
                    {formatRp(p.sisa)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rekonsiliasi mini */}
        <div className="section-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <BarChart3 size={16} color="#16a34a" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>Status Rekonsiliasi</h3>
            <a
              href="/finance/rekonsiliasi"
              style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#cc7030', fontWeight: '600', textDecoration: 'none' }}
            >
              Detail →
            </a>
          </div>
          {rekon === null ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--neutral-400)', margin: 0 }}>Memuat…</p>
          ) : rekonIssues === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                fontSize: '0.85rem',
                color: '#166534',
                fontWeight: '600'
              }}
            >
              ✓ Semua sumber data seimbang
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                fontSize: '0.85rem',
                color: '#92400e',
                fontWeight: '600'
              }}
            >
              ⚠️ {rekonIssues} dari 4 sumber data memiliki selisih
            </div>
          )}
          {rekon !== null && rekonIssues > 0 && (
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--neutral-600)' }}>
              {Object.entries(rekon)
                .filter(([, v]) => Math.abs(v) >= 1)
                .map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ textTransform: 'capitalize' }}>{k}</span>
                    <span style={{ fontWeight: '700', color: '#dc2626' }}>{formatRp(v)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Modules */}
      <div className="module-grid">
        {MODULES.map((m) => (
          <Link key={m.href} href={m.href} className="module-card">
            <div className={`module-card-icon ${m.color}`}>{m.icon}</div>
            <div className="module-card-body">
              <div className="module-card-title">{m.title}</div>
              <div className="module-card-desc">{m.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
