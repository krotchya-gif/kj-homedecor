'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { TrendingUp, Users, ShoppingCart, Package, Download, Loader2, ChevronDown, Clock, Activity, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatRp } from '@/lib/utils'
import { SOURCE_LABELS } from '@/types'

const COLORS = ['#cc7030', '#2563eb', '#16a34a', '#9333ea', '#0d9488']

interface Order {
  id: string
  status: string
  payment_status: string
  total_amount: number
  source: string
  created_at: string
  order_items?: Array<{ qty: number; price: number; product?: { name: string } }>
}

export default function OwnerDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [realtimeOrders, setRealtimeOrders] = useState<Order[]>([])
  const [installBookings, setInstallBookings] = useState<any[]>([])
  const [materialAlerts, setMaterialAlerts] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<{ month: number; year: number }>({ month: new Date().getMonth() + 1, year: new Date().getFullYear() })
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadOrders() }, [period])

  async function loadOrders() {
    setLoading(true)
    const [{ data }, { data: installData }] = await Promise.all([
      supabase.from('orders').select('*, order_items(qty, price, product:products(name))').order('created_at', { ascending: false }),
      supabase.from('install_bookings').select('id, status, scheduled_date, order:orders(customer:customers(name))').gte('scheduled_date', new Date().toISOString().split('T')[0]).in('status', ['scheduled', 'in_progress']),
    ])

    let filtered = (data as Order[]) ?? []

    // Filter by selected month/year
    filtered = filtered.filter(o => {
      const d = new Date(o.created_at)
      return d.getFullYear() === period.year && d.getMonth() + 1 === period.month
    })

    setOrders(filtered)
    setInstallBookings(installData ?? [])

    // Today's new orders for real-time count
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayOrders = (data as Order[])?.filter(o => new Date(o.created_at) >= todayStart) ?? []
    setRealtimeOrders(todayOrders)

    setLoading(false)
  }

  // Stats
  const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + (o.total_amount ?? 0), 0)
  const totalOrders = orders.length

  // Real-time stats
  const todayNewOrders = realtimeOrders.length
  const todayRevenue = realtimeOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0)
  const activeInstalls = installBookings.filter(b => b.status === 'in_progress').length
  const scheduledInstalls = installBookings.filter(b => b.status === 'scheduled').length

  // Revenue by platform (bar chart)
  const platformRevenue: Record<string, number> = {}
  const platformOrders: Record<string, number> = {}
  orders.forEach(o => {
    const src = o.source ?? 'offline'
    platformRevenue[src] = (platformRevenue[src] ?? 0) + (o.total_amount ?? 0)
    platformOrders[src] = (platformOrders[src] ?? 0) + 1
  })

  const barData = Object.entries(platformRevenue).map(([k, v]) => ({
    name: SOURCE_LABELS[k as keyof typeof SOURCE_LABELS] ?? k,
    revenue: v,
    orders: platformOrders[k] ?? 0,
  })).sort((a, b) => b.revenue - a.revenue)

  // Top products
  const productRevenue: Record<string, { count: number; revenue: number }> = {}
  orders.forEach(o => {
    ;(o.order_items ?? []).forEach(item => {
      const name = item.product?.name ?? 'Unknown'
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
  orders.forEach(o => { pipeline[o.status] = (pipeline[o.status] ?? 0) + 1 })

  // Monthly trend (12 months)
  const [trendData, setTrendData] = useState<{ month: string; revenue: number }[]>([])
  useEffect(() => {
    async function loadTrend() {
      const { data } = await supabase
        .from('orders')
        .select('created_at, total_amount, payment_status')
        .gte('created_at', `${period.year - 1}-01-01`)
        .lte('created_at', `${period.year}-12-31`)

      const months: Record<string, number> = {}
      ;(data ?? []).forEach((o: any) => {
        if (o.payment_status === 'paid') {
          const d = new Date(o.created_at)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          months[key] = (months[key] ?? 0) + (o.total_amount ?? 0)
        }
      })

      const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
      const trend = Array.from({ length: 12 }, (_, i) => {
        const m = String(i + 1).padStart(2, '0')
        const key = `${period.year - 1}-${m}`
        return { month: MONTHS_SHORT[i], revenue: months[key] ?? 0 }
      })
      setTrendData(trend)
    }
    loadTrend()
  }, [period.year])

  function exportCSV() {
    const headers = ['Order ID', 'Tanggal', 'Platform', 'Status', 'Total', 'Pembayaran']
    const rows = orders.map(o => [
      o.id.slice(0, 8),
      new Date(o.created_at).toLocaleDateString('id-ID'),
      SOURCE_LABELS[o.source as keyof typeof SOURCE_LABELS] ?? o.source,
      o.status,
      o.total_amount,
      o.payment_status,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kj-owner-${period.year}-${period.month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Owner Overview</h1>
          <p className="page-subtitle">Laporan lengkap operasional KJ Homedecor</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Month picker */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMonthPicker(!showMonthPicker)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#fff', border: '1px solid #d1d5db', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
            >
              {MONTHS_FULL[period.month - 1]} {period.year} <ChevronDown size={14} />
            </button>
            {showMonthPicker && (
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '0.25rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, padding: '0.5rem', minWidth: 180 }}>
                <select value={period.month} onChange={e => setPeriod(p => ({ ...p, month: Number(e.target.value) }))} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.8rem' }}>
                  {MONTHS_FULL.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
                <select value={period.year} onChange={e => setPeriod(p => ({ ...p, year: Number(e.target.value) }))} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.8rem' }}>
                  {[period.year - 1, period.year, period.year + 1].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
          </div>
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', background: '#fff', border: '1px solid #d1d5db', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

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
                <div className="stat-card-label" style={{ marginBottom: 0 }}>Real-time Hari Ini</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <div className="stat-card-value">{todayNewOrders}</div>
                <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>pesanan baru</span>
              </div>
              <div className="stat-card-sub" style={{ color: '#059669', fontWeight: '600' }}>{formatRp(todayRevenue)} omzet</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Clock size={14} color="#2563eb" />
                <div className="stat-card-label" style={{ marginBottom: 0 }}>Instalasi Aktif</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <div className="stat-card-value">{activeInstalls}</div>
                <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>sedang pasang</span>
              </div>
              <div className="stat-card-sub">{scheduledInstalls} terjadwal</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Omzet Bulan Ini</div>
              <div className="stat-card-value" style={{ color: '#cc7030' }}>{formatRp(totalRevenue)}</div>
              <div className="stat-card-sub">{totalOrders} pesanan</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Pesanan</div>
              <div className="stat-card-value">{totalOrders}</div>
              <div className="stat-card-sub">{Object.keys(platformOrders).length} platform aktif</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

            <Card>
              <CardHeader>
                <CardTitle>Omzet per Platform</CardTitle>
              </CardHeader>
              <CardContent>
                {barData.length === 0 ? (
                  <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <TrendingUp size={32} className="opacity-30" />
                    <span>Belum ada data omzet</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barData} barCategoryGap="25%">
                      <defs>
                        <linearGradient id="ownBrandGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--brand-400)" />
                          <stop offset="100%" stopColor="var(--brand-600)" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatRp(v).replace('Rp ', '').replaceAll('.', '')} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(v) => [formatRp(v as number), 'Omzet']} cursor={{ fill: 'var(--muted)' }} />
                      <Bar dataKey="revenue" fill="url(#ownBrandGrad)" radius={[6, 6, 0, 0]} animationDuration={800} label={{ position: 'top', fontSize: 9, fontWeight: 600, fill: 'var(--muted-foreground)' }} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribusi Platform</CardTitle>
              </CardHeader>
              <CardContent>
                {barData.length === 0 ? (
                  <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <TrendingUp size={32} className="opacity-30" />
                    <span>Belum ada data platform</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={barData} dataKey="orders" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={35} label={({ name, percent }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }} animationDuration={800}>
                        {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth={2} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp size={16} color="#16a34a" />
                <CardTitle>Tren Omzet 12 Bulan</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <TrendingUp size={32} className="opacity-30" />
                  <span>Belum ada data tren</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData}>
                    <defs>
                      <linearGradient id="ownGreenGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#4ade80" />
                        <stop offset="100%" stopColor="#16a34a" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatRp(v).replace('Rp ', '').replaceAll('.', '')} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(v) => [formatRp(v as number), 'Revenue']} />
                    <Line type="monotone" dataKey="revenue" stroke="url(#ownGreenGrad)" strokeWidth={3} dot={{ r: 3, fill: '#16a34a', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#16a34a', stroke: '#fff', strokeWidth: 2 }} animationDuration={1000} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Products + Pipeline */}
          <div className="pipeline-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

            {/* Top Products */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>Produk Terlaris</h3>
                  <a href="/owner/products" style={{ fontSize: '0.75rem', color: '#cc7030', textDecoration: 'none', fontWeight: '600' }}>Lihat semua →</a>
                </div>
              </div>
              <div className="data-table">
                {topProducts.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Tidak ada data</div>
                ) : (
                  <table>
                    <thead><tr><th>Produk</th><th>Qty</th><th>Revenue</th></tr></thead>
                    <tbody>
                      {topProducts.slice(0, 5).map((p, i) => (
                        <tr key={p.name}>
                          <td style={{ fontWeight: '500' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, background: i < 3 ? '#cc7030' : '#e5e7eb', color: i < 3 ? '#fff' : '#6b7280', borderRadius: '50%', fontSize: '0.65rem', fontWeight: '700', marginRight: '0.5rem' }}>
                              {i + 1}
                            </span>
                            {p.name}
                          </td>
                          <td style={{ color: '#6b7280' }}>{p.count}</td>
                          <td style={{ fontWeight: '600', color: '#cc7030' }}>{formatRp(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Pipeline Status */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>Pipeline Status</h3>
              </div>
              <div className="data-table">
                {Object.keys(pipeline).length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Tidak ada data</div>
                ) : (
                  <table>
                    <thead><tr><th>Status</th><th>Jumlah</th></tr></thead>
                    <tbody>
                      {Object.entries(pipeline).map(([status, count]) => (
                        <tr key={status}>
                          <td style={{ textTransform: 'capitalize', fontWeight: '500' }}>{status.replace('_', ' ')}</td>
                          <td>
                            <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>
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