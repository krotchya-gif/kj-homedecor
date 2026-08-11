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

const COLORS = ['#16a34a', '#f59e0b', '#ef4444', '#2563eb', '#9333ea']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

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

export default function FinanceDashboard() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('id, status, payment_status, total_amount, dp_amount, lunas_amount, created_at, source')
      .order('created_at', { ascending: false })
    setOrders((data as Order[]) ?? [])
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

  // Piutang aging (orders with payment_status != paid, exclude cancelled)
  // F-16 fix: pakai SISA tagihan (total − dp − lunas), bukan total penuh
  const piutangOrders = orders.filter((o) => o.payment_status !== 'paid' && o.status !== 'cancelled')
  const piutangTotal = piutangOrders.reduce(
    (s, o) => s + Math.max(0, (o.total_amount ?? 0) - (o.dp_amount ?? 0) - (o.lunas_amount ?? 0)),
    0
  )

  // Orders waiting for Finance verification (2026-07-31: gate di DEPAN — status='new' menunggu Finance approve ke payment_ok)
  // Finance approve → status='payment_ok' (verifikasi DP/bukti transfer sebelum produksi, anti transfer palsu)
  const needsVerification = orders.filter((o) => o.status === 'new')
  const needsVerificationPaid = needsVerification.filter((o) => o.payment_status === 'paid')

  // Piutang aging buckets (based on days since created)
  const now = new Date()
  const aging = { '<30': 0, '30-60': 0, '60-90': 0, '>90': 0 }
  piutangOrders.forEach((o) => {
    const days = Math.floor((now.getTime() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24))
    const sisa = Math.max(0, (o.total_amount ?? 0) - (o.dp_amount ?? 0) - (o.lunas_amount ?? 0))
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
          sub={`${piutangOrders.length} pesanan belum lunas`}
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
