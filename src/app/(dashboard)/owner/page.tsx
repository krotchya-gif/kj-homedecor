'use client'
import { PageHeader } from '@/components/ui/PageHeader'
import ChartBox from '@/components/ui/ChartBox'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Package,
  Download,
  Loader2,
  ChevronDown,
  Clock,
  Activity,
  AlertCircle
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { SOURCE_LABELS } from '@/types'
import { formatRp } from '@/lib/utils'

const COLORS = ['#cc7030', '#2563eb', '#16a34a', '#9333ea', '#0d9488']


interface Order {
  id: string
  status: string
  payment_status: string
  total_amount: number
  source: string
  created_at: string
  order_date?: string
  order_items?: Array<{ qty: number; price: number; custom_specs?: string; product?: { name: string } }>
}

interface LooseRow {
  id?: string
  code?: string
  name?: string
  type?: string
  balance?: number
  date?: string
  entry_date?: string
  created_at?: string
  description?: string
  notes?: string
  reference_type?: string
  debit?: number
  credit?: number
  total_debit?: number
  total_credit?: number
  total?: number
  amount?: number
  qty?: number
  status?: string
  order_number?: string
  payment_status?: string
  total_amount?: number
  total_price?: number
  supplier_name?: string
  stock_gudang?: number
  min_stock_level?: number
  cost_per_unit?: number
  unit?: string
  bank_name?: string
  account_number?: string
  account_holder?: string
  account?: { code?: string; name?: string } | null
  [k: string]: unknown
}

export default function OwnerDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [realtimeOrders, setRealtimeOrders] = useState<Order[]>([])
  const [installBookings, setInstallBookings] = useState<LooseRow[]>([])
  const [materialAlerts, setMaterialAlerts] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  // Sesi 45: omzet bulan ini vs bulan lalu + status rekonsiliasi mini
  const [mom, setMom] = useState<{ current: number; previous: number } | null>(null)
  const [rekon, setRekon] = useState<{ piutang: number; kas: number; revenue: number; hutang: number } | null>(null)
  const [period, setPeriod] = useState<{ month: number; year: number }>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  })
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadOrders()
  }, [period])

  async function loadOrders() {
    setLoading(true)
    const [{ data }, { data: installData }, rekonPiutangOrders, rekonKasLines, rekonKasBalance, rekonRevLines, rekonHutangLines, rekonHutangTable, rekonPiutangTable] =
      await Promise.all([
        supabase
          .from('orders')
          .select('*, order_items(qty, price, custom_specs, product:products(name))')
          .order('created_at', { ascending: false }),
        supabase
          .from('install_bookings')
          .select('id, status, scheduled_date, order:orders(customer:customers(name))')
          .gte('scheduled_date', new Date().toISOString().split('T')[0])
          .in('status', ['scheduled', 'in_progress']),
        // Rekonsiliasi mini (sesi 45) — 4 pasang sumber
        supabase
          .from('orders')
          .select('total_amount, dp_amount, lunas_amount')
          .neq('payment_status', 'paid')
          .neq('status', 'cancelled'),
        supabase.from('journal_lines').select('debit, credit, account:accounts!inner(id, is_cash_account)'),
        supabase.from('cash_accounts').select('balance'),
        supabase.from('journal_lines').select('debit, credit, account:accounts!inner(id, type)'),
        supabase
          .from('journal_lines')
          .select('debit, credit, account:accounts!inner(id, code)')
          .eq('account.code', '2101'),
        supabase.from('hutang').select('amount, paid_amount, return_amount').in('status', ['pending', 'partial']),
        supabase.from('piutang').select('amount, paid_amount, return_amount, fee_amount').in('status', ['pending', 'partial'])
      ])

    let filtered = (data as Order[]) ?? []

    // Filter by selected month/year (use real order_date, fallback ke created_at)
    filtered = filtered.filter((o) => {
      const d = new Date(o.order_date || o.created_at || '')
      return d.getFullYear() === period.year && d.getMonth() + 1 === period.month
    })

    setOrders(filtered)
    setInstallBookings(installData ?? [])

    // Today's new orders for real-time count (pakai order_date)
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayOrders = (data as Order[])?.filter((o) => new Date(o.order_date || o.created_at) >= todayStart) ?? []
    setRealtimeOrders(todayOrders)

    // Sesi 45: omzet bulan ini (paid) vs bulan lalu
    const paid = (data as Order[] | undefined)?.filter((o) => o.payment_status === 'paid') ?? []
    const momCurrent = paid
      .filter((o) => {
        const d = new Date(o.order_date || o.created_at || '')
        return d.getFullYear() === period.year && d.getMonth() + 1 === period.month
      })
      .reduce((s, o) => s + (o.total_amount ?? 0), 0)
    const prev = new Date(period.year, period.month - 2, 1)
    const momPrev = paid
      .filter((o) => {
        const d = new Date(o.order_date || o.created_at || '')
        return d.getFullYear() === prev.getFullYear() && d.getMonth() + 1 === prev.getMonth() + 1
      })
      .reduce((s, o) => s + (o.total_amount ?? 0), 0)
    setMom({ current: momCurrent, previous: momPrev })

    // Sesi 45: rekonsiliasi mini (sama seperti halaman /finance/rekonsiliasi)
    const piutangOrders = (rekonPiutangOrders.data ?? []).reduce(
      (s, o) => s + Math.max(0, Number(o.total_amount ?? 0) - Number(o.dp_amount ?? 0) - Number(o.lunas_amount ?? 0)),
      0
    )
    const piutangTabel = (rekonPiutangTable.data ?? []).reduce(
      (s, p) =>
        s +
        Math.max(0, Number(p.amount ?? 0) - Number(p.paid_amount ?? 0) - Number(p.return_amount ?? 0) - Number(p.fee_amount ?? 0)),
      0
    )
    const kasJournal = (rekonKasLines.data ?? [])
      .filter((l) => (l.account as unknown as { is_cash_account?: boolean } | null)?.is_cash_account)
      .reduce((s, l) => s + Number(l.debit ?? 0) - Number(l.credit ?? 0), 0)
    const kasBalance = (rekonKasBalance.data ?? []).reduce((s, c) => s + Number(c.balance ?? 0), 0)
    const revJournal = (rekonRevLines.data ?? [])
      .filter((l) => (l.account as unknown as { type?: string } | null)?.type === 'revenue')
      .reduce((s, l) => s + Number(l.credit ?? 0) - Number(l.debit ?? 0), 0)
    const omzetOrders = (data as Order[] | undefined)?.reduce((s, o) => s + Number(o.total_amount ?? 0), 0) ?? 0
    const hutangJournal = (rekonHutangLines.data ?? []).reduce(
      (s, l) => s + Number(l.credit ?? 0) - Number(l.debit ?? 0),
      0
    )
    const hutangTabel = (rekonHutangTable.data ?? []).reduce(
      (s, h) => s + Math.max(0, Number(h.amount ?? 0) - Number(h.paid_amount ?? 0) - Number(h.return_amount ?? 0)),
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

  // Stats
  const totalRevenue = orders.filter((o) => o.payment_status === 'paid').reduce((s, o) => s + (o.total_amount ?? 0), 0)
  const totalOrders = orders.length

  // Real-time stats
  const todayNewOrders = realtimeOrders.length
  const todayRevenue = realtimeOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0)
  const activeInstalls = installBookings.filter((b) => b.status === 'in_progress').length
  const scheduledInstalls = installBookings.filter((b) => b.status === 'scheduled').length

  // Revenue by platform (bar chart)
  const platformRevenue: Record<string, number> = {}
  const platformOrders: Record<string, number> = {}
  orders.forEach((o) => {
    const src = o.source ?? 'offline'
    platformRevenue[src] = (platformRevenue[src] ?? 0) + (o.total_amount ?? 0)
    platformOrders[src] = (platformOrders[src] ?? 0) + 1
  })

  const barData = Object.entries(platformRevenue)
    .map(([k, v]) => ({
      name: SOURCE_LABELS[k as keyof typeof SOURCE_LABELS] ?? k,
      revenue: v,
      orders: platformOrders[k] ?? 0
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // Top products
  const productRevenue: Record<string, { count: number; revenue: number }> = {}
  orders.forEach((o) => {
    ;(o.order_items ?? []).forEach((item) => {
      const name = item.product?.name ?? item.custom_specs ?? 'Unknown'
      if (!productRevenue[name]) productRevenue[name] = { count: 0, revenue: 0 }
      productRevenue[name].count += item.qty ?? 1
      productRevenue[name].revenue += (item.price ?? 0) * (item.qty ?? 1)
    })
  })
  const topProducts = Object.entries(productRevenue)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Pipeline
  const pipeline: Record<string, number> = {}
  orders.forEach((o) => {
    pipeline[o.status] = (pipeline[o.status] ?? 0) + 1
  })

  // Monthly trend (12 months)
  const [trendData, setTrendData] = useState<{ month: string; revenue: number }[]>([])
  useEffect(() => {
    async function loadTrend() {
      const { data } = await supabase
        .from('orders')
        .select('order_date, created_at, total_amount, payment_status')
        .or(`order_date.gte.${period.year - 1}-01-01,created_at.gte.${period.year - 1}-01-01`)
        .or(`order_date.lte.${period.year}-12-31,created_at.lte.${period.year}-12-31`)

      const months: Record<string, number> = {}
      ;((data ?? []) as { payment_status?: string; created_at?: string; order_date?: string; total_amount?: number }[]).forEach((o) => {
        if (o.payment_status === 'paid') {
          const d = new Date(o.order_date || o.created_at || '')
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          months[key] = (months[key] ?? 0) + (o.total_amount ?? 0)
        }
      })

      const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
      // Sesi 51: "Tren 12 Bulan" = jendela 12 bulan berakhir di periode terpilih
      // (sebelumnya bucket tahun calendar year-1 → 2025 tanpa data → chart kosong).
      const trend = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(period.year, period.month - 1 - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return { month: MONTHS_SHORT[d.getMonth()], revenue: months[key] ?? 0 }
      }).reverse()
      setTrendData(trend)
    }
    loadTrend()
    // Sesi 52: deps termasuk period.month — ganti bulan di picker harus update tren
    // (sebelumnya hanya [period.year] → window tetap bulan lama saat tahun sama)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.year, period.month])

  function exportCSV() {
    const headers = ['Order ID', 'Tanggal', 'Platform', 'Status', 'Total', 'Pembayaran']
    const rows = orders.map((o) => [
      o.id.slice(0, 8),
      new Date(o.created_at).toLocaleDateString('id-ID'),
      SOURCE_LABELS[o.source as keyof typeof SOURCE_LABELS] ?? o.source,
      o.status,
      o.total_amount,
      o.payment_status
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kj-owner-${period.year}-${period.month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const MONTHS_FULL = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember'
  ]

  return (
    <div>
      <PageHeader
        title="Owner Overview"
        subtitle="Laporan lengkap operasional KJ Homedecor"
        action={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {/* Month picker */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: 'var(--surface)',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                {MONTHS_FULL[period.month - 1]} {period.year} <ChevronDown size={14} />
              </button>
              {showMonthPicker && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '0.25rem',
                    background: 'var(--surface)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 100,
                    padding: '0.5rem',
                    minWidth: 180
                  }}
                >
                  <select
                    value={period.month}
                    onChange={(e) => setPeriod((p) => ({ ...p, month: Number(e.target.value) }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      marginBottom: '0.5rem',
                      border: '1px solid var(--input-border)',
                      borderRadius: '0.375rem',
                      fontSize: '0.8rem',
                      background: 'var(--surface)',
                      color: 'var(--neutral-800)'
                    }}
                  >
                    {MONTHS_FULL.map((m, i) => (
                      <option key={i + 1} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    value={period.year}
                    onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--input-border)',
                      borderRadius: '0.375rem',
                      fontSize: '0.8rem',
                      background: 'var(--surface)',
                      color: 'var(--neutral-800)'
                    }}
                  >
                    {[period.year - 1, period.year, period.year + 1].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <button
              onClick={exportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.5rem 1rem',
                background: 'var(--surface)',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#cc7030' }} />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card" style={{ borderLeft: '4px solid #16a34a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Activity size={14} color="#16a34a" />
                <div className="stat-card-label" style={{ marginBottom: 0 }}>
                  Real-time Hari Ini
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <div className="stat-card-value">{todayNewOrders}</div>
                <span style={{ fontSize: '0.78rem', color: 'var(--neutral-600)' }}>pesanan baru</span>
              </div>
              <div className="stat-card-sub" style={{ color: '#059669', fontWeight: '600' }}>
                {formatRp(todayRevenue)} omzet
              </div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Clock size={14} color="#2563eb" />
                <div className="stat-card-label" style={{ marginBottom: 0 }}>
                  Instalasi Aktif
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <div className="stat-card-value">{activeInstalls}</div>
                <span style={{ fontSize: '0.78rem', color: 'var(--neutral-600)' }}>sedang pasang</span>
              </div>
              <div className="stat-card-sub">{scheduledInstalls} terjadwal</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Omzet Bulan Ini</div>
              <div className="stat-card-value" style={{ color: '#cc7030' }}>
                {formatRp(totalRevenue)}
              </div>
              <div className="stat-card-sub">{totalOrders} pesanan</div>
              {/* Sesi 45: MoM — omzet bulan ini vs bulan lalu */}
              {mom !== null && mom.previous > 0 && (
                <div
                  className="stat-card-sub"
                  style={{
                    marginTop: '0.25rem',
                    fontWeight: '600',
                    color: mom.current >= mom.previous ? '#059669' : '#dc2626'
                  }}
                >
                  {mom.current >= mom.previous ? '▲' : '▼'}{' '}
                  {formatRp(Math.abs(mom.current - mom.previous))} (
                  {((Math.abs(mom.current - mom.previous) / mom.previous) * 100).toFixed(0)}%) vs bulan lalu
                </div>
              )}
              {mom !== null && mom.previous === 0 && (
                <div className="stat-card-sub" style={{ marginTop: '0.25rem' }}>
                  Belum ada data bulan lalu
                </div>
              )}
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Pesanan</div>
              <div className="stat-card-value">{totalOrders}</div>
              <div className="stat-card-sub">{Object.keys(platformOrders).length} platform aktif</div>
            </div>
          </div>

          {/* Sesi 45: Status Rekonsiliasi mini */}
          <div
            className="section-card"
            style={{
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {(() => {
                if (rekon === null) {
                  return (
                    <>
                      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#cc7030' }} />
                      <span style={{ fontSize: '0.85rem', color: 'var(--neutral-500)' }}>Memeriksa keselarasan data…</span>
                    </>
                  )
                }
                const issues = Object.values(rekon).filter((v) => Math.abs(v) >= 1).length
                return issues === 0 ? (
                  <>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: '#16a34a',
                        flexShrink: 0
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#166534' }}>Semua sumber data seimbang</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                        Piutang, kas, revenue & hutang cocok dengan pembukuan
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: '#d97706',
                        flexShrink: 0
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#92400e' }}>
                        {issues} dari 4 sumber data memiliki selisih
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                        {Object.entries(rekon)
                          .filter(([, v]) => Math.abs(v) >= 1)
                          .map(([k]) => k)
                          .join(', ')}
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
            <a
              href="/finance/rekonsiliasi"
              style={{
                fontSize: '0.8rem',
                color: '#cc7030',
                fontWeight: '600',
                textDecoration: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              Lihat Detail Rekonsiliasi →
            </a>
          </div>

          {/* Charts Row */}
          <div
            className="chart-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
              marginBottom: '1.5rem'
            }}
          >
            {/* Revenue by Platform Bar Chart */}
            <div
              className="chart-card"
              style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem' }}
            >
              <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', marginBottom: '1rem' }}>
                Omzet per Platform
              </h3>
              {barData.length === 0 ? (
                <div
                  style={{
                    height: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--neutral-400)'
                  }}
                >
                  Tidak ada data
                </div>
              ) : (
                <ChartBox height={220}>
                  {(w) => (
                    <BarChart width={w} height={220} data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => formatRp(v).replace('Rp ', '').replaceAll('.', '')}
                      />
                      <Tooltip formatter={(v) => formatRp(v as number)} />
                      <Bar dataKey="revenue" fill="#cc7030" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ChartBox>
              )}
            </div>

            {/* Platform Distribution Pie */}
            <div
              className="chart-card"
              style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem' }}
            >
              <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', marginBottom: '1rem' }}>
                Distribusi Platform
              </h3>
              {barData.length === 0 ? (
                <div
                  style={{
                    height: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--neutral-400)'
                  }}
                >
                  Tidak ada data
                </div>
              ) : (
                <ChartBox height={220}>
                  {(w) => (
                    <PieChart width={w} height={220}>
                      <Pie
                        data={barData}
                        dataKey="orders"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {barData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  )}
                </ChartBox>
              )}
            </div>
          </div>

          {/* 12-Month Revenue Trend */}
          <div
            className="chart-card"
            style={{
              background: 'var(--surface)',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <TrendingUp size={16} color="#16a34a" />
              <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>
                Tren Omzet 12 Bulan
              </h3>
            </div>
            {trendData.length === 0 ? (
              <div
                style={{
                  height: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--neutral-400)'
                }}
              >
                Tidak ada data
              </div>
            ) : (
              <ChartBox height={220}>
                {(w) => (
                  <LineChart width={w} height={220} data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => formatRp(v).replace('Rp ', '').replaceAll('.', '')}
                    />
                    <Tooltip formatter={(v) => formatRp(v as number)} />
                    <Line type="monotone" dataKey="revenue" stroke="#cc7030" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                )}
              </ChartBox>
            )}
          </div>

          {/* Top Products + Pipeline */}
          <div
            className="pipeline-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}
          >
            {/* Top Products */}
            <div
              style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}
            >
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: 'var(--neutral-100)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>
                    Produk Terlaris
                  </h3>
                  <a
                    href="/owner/products"
                    style={{ fontSize: '0.75rem', color: '#cc7030', textDecoration: 'none', fontWeight: '600' }}
                  >
                    Lihat semua →
                  </a>
                </div>
              </div>
              <div className="data-table">
                {topProducts.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Tidak ada data</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Produk</th>
                        <th>Qty</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.slice(0, 5).map((p, i) => (
                        <tr key={p.name}>
                          <td style={{ fontWeight: '500' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 18,
                                height: 18,
                                background: i < 3 ? '#cc7030' : 'var(--neutral-200)',
                                color: i < 3 ? '#fff' : 'var(--neutral-600)',
                                borderRadius: '50%',
                                fontSize: '0.65rem',
                                fontWeight: '700',
                                marginRight: '0.5rem'
                              }}
                            >
                              {i + 1}
                            </span>
                            {p.name}
                          </td>
                          <td style={{ color: 'var(--neutral-600)' }}>{p.count}</td>
                          <td style={{ fontWeight: '600', color: '#cc7030' }}>{formatRp(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Pipeline Status */}
            <div
              style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}
            >
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: 'var(--neutral-100)' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>Pipeline Status</h3>
              </div>
              <div className="data-table">
                {Object.keys(pipeline).length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Tidak ada data</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(pipeline).map(([status, count]) => (
                        <tr key={status}>
                          <td style={{ textTransform: 'capitalize', fontWeight: '500' }}>{status.replace('_', ' ')}</td>
                          <td>
                            <span
                              style={{
                                background: '#fef3c7',
                                color: '#92400e',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}
                            >
                              {count}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
