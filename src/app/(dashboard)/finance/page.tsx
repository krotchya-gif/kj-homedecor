'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { DollarSign, BarChart3, WashingMachine, Loader2, TrendingUp, PieChart as PieChartIcon } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatRp } from '@/lib/utils'

const COLORS = ['#16a34a', '#f59e0b', '#ef4444', '#2563eb', '#9333ea']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const MODULES = [
  { title: 'Pembayaran', desc: 'Tracking DP/Lunas dan approval gate', href: '/finance/payments', icon: <DollarSign size={20} />, color: 'green' },
  { title: 'Laporan', desc: 'Laporan keuangan dan pengupahan', href: '/finance/reports', icon: <BarChart3 size={20} />, color: 'teal' },
  { title: 'Laundry Gaji', desc: 'Gaji staff laundry per periode', href: '/finance/laundry-payroll', icon: <WashingMachine size={20} />, color: 'blue' },
]

interface Order { id: string; status: string; payment_status: string; total_amount: number; created_at: string; source: string }

export default function FinanceDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadOrders() }, [])

  async function loadOrders() {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('id, status, payment_status, total_amount, created_at, source')
      .order('created_at', { ascending: false })
    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }

  const currentYear = new Date().getFullYear()

  // Monthly revenue (12 months)
  const monthlyRevenue: Record<string, number> = {}
  MONTHS_SHORT.forEach((m) => { monthlyRevenue[m] = 0 })
  orders.forEach((o) => {
    if (o.payment_status === 'paid') {
      const d = new Date(o.created_at)
      if (d.getFullYear() === currentYear) {
        const month = MONTHS_SHORT[d.getMonth()]
        monthlyRevenue[month] += o.total_amount ?? 0
      }
    }
  })
  const monthlyData = MONTHS_SHORT.map((m) => ({ month: m, revenue: monthlyRevenue[m] }))

  // Payment status distribution
  const statusCounts: Record<string, number> = { paid: 0, partial: 0, pending: 0 }
  orders.forEach((o) => {
    const s = o.payment_status ?? 'pending'
    statusCounts[s] = (statusCounts[s] ?? 0) + 1
  })
  const STATUS_LABELS: Record<string, string> = { paid: 'Lunas', partial: 'DP', pending: 'Belum Bayar' }
  const paymentStatusData = Object.entries(statusCounts)
    .filter(([_, v]) => v > 0)
    .map(([k, v]) => ({ name: STATUS_LABELS[k] ?? k, value: v }))

  // Piutang aging (orders with payment_status != paid)
  const piutangOrders = orders.filter((o) => o.payment_status !== 'paid' && o.payment_status !== 'cancelled')
  const piutangTotal = piutangOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0)

  // Orders waiting for Finance verification (pipeline baru: status='ready' adalah trigger)
  // Finance approve → status='payment_ok' (gate ke packing)
  const needsVerification = orders.filter((o) => o.status === 'ready')
  const needsVerificationPaid = needsVerification.filter((o) => o.payment_status === 'paid')

  // Piutang aging buckets (based on days since created)
  const now = new Date()
  const aging = { '<30': 0, '30-60': 0, '60-90': 0, '>90': 0 }
  piutangOrders.forEach((o) => {
    const days = Math.floor((now.getTime() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24))
    if (days < 30) aging['<30'] += o.total_amount ?? 0
    else if (days < 60) aging['30-60'] += o.total_amount ?? 0
    else if (days < 90) aging['60-90'] += o.total_amount ?? 0
    else aging['>90'] += o.total_amount ?? 0
  })
  const agingData = [
    { bucket: '<30 hari', amount: aging['<30'] },
    { bucket: '30-60 hari', amount: aging['30-60'] },
    { bucket: '60-90 hari', amount: aging['60-90'] },
    { bucket: '>90 hari', amount: aging['>90'] },
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
      <div className="page-header">
        <h1 className="page-title">Dashboard Finance</h1>
        <p className="page-subtitle">Kelola pembayaran, laporan keuangan dan payroll laundry</p>
      </div>

      {/* Stat Summary */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-card-label">Total Piutang</div>
              <div className="stat-card-value" style={{ color: '#16a34a' }}>{formatRp(piutangTotal)}</div>
              <div className="stat-card-sub">{piutangOrders.length} pesanan belum lunas</div>
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: '0.5rem', padding: '0.5rem' }}>
              <DollarSign size={20} style={{ color: '#16a34a' }} />
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-card-label">Total Pesanan</div>
              <div className="stat-card-value" style={{ color: '#2563eb' }}>{orders.length}</div>
              <div className="stat-card-sub">Semua status</div>
            </div>
            <div style={{ background: '#eff6ff', borderRadius: '0.5rem', padding: '0.5rem' }}>
              <BarChart3 size={20} style={{ color: '#2563eb' }} />
            </div>
          </div>
        </div>

        {/* Butuh Verifikasi Bayar — pipeline baru: order status='ready' menunggu Finance approve ke payment_ok */}
        {needsVerification.length > 0 && (
          <Link href="/finance/payments" style={{ textDecoration: 'none' }}>
            <div className="stat-card" style={{ borderLeft: '4px solid #dc2626', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="stat-card-label">Butuh Verifikasi Bayar</div>
                  <div className="stat-card-value" style={{ color: '#dc2626' }}>{needsVerification.length}</div>
                  <div className="stat-card-sub" style={{ color: '#991b1b' }}>
                    {needsVerificationPaid.length} siap approve · {needsVerification.length - needsVerificationPaid.length} belum lunas
                  </div>
                </div>
                <div style={{ background: '#fef2f2', borderRadius: '0.5rem', padding: '0.5rem' }}>
                  <DollarSign size={20} style={{ color: '#dc2626' }} />
                </div>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} style={{ color: 'var(--brand-500)' }} />
              <CardTitle>Omzet per Bulan ({currentYear})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {monthlyData.every((m) => m.revenue === 0) ? (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <TrendingUp size={32} className="opacity-30" />
                <span>Belum ada data omzet</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} barCategoryGap="15%">
                  <defs>
                    <linearGradient id="finBrandGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand-400)" />
                      <stop offset="100%" stopColor="var(--brand-600)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatRp(v).replace('Rp ', '').replaceAll('.', '')} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(v) => [formatRp(v as number), 'Omzet']} cursor={{ fill: 'var(--muted)' }} />
                  <Bar dataKey="revenue" fill="url(#finBrandGrad)" radius={[6, 6, 0, 0]} animationDuration={800} label={{ position: 'top', fontSize: 9, fontWeight: 600, fill: 'var(--muted-foreground)' }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChartIcon size={16} color="#2563eb" />
              <CardTitle>Distribusi Status Bayar</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {paymentStatusData.length === 0 ? (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <PieChartIcon size={32} className="opacity-30" />
                <span>Belum ada data pembayaran</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={paymentStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={35} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }} animationDuration={800}>
                    {paymentStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
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