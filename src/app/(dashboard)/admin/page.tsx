'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Package,
  ShoppingCart,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Clock,
  CheckCheck,
  XOctagon,
  PackagePlus,
  Truck,
  DollarSign,
  FileEdit,
  RotateCcw,
  Ban,
  BarChart3,
  ImageIcon,
  Camera,
  Activity,
  Wrench,
  AlertCircle,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { SOURCE_LABELS } from '@/types'
import { Lightbox, LightboxGallery } from '@/components/ui/Lightbox'

interface Order { id: string; status: string; payment_status: string; source?: string; total_amount?: number; created_at: string }
interface PurchaseRequest { id: string; qty: number; estimated_cost: number; status: string; material?: { name: string } }
interface OrderLog { id: string; order_id: string; action: string; notes?: string; created_at: string; staff?: { name: string } }
interface OrderProgressPhoto { id: string; order_id: string; stage: string; photo_url: string; notes?: string; created_at: string }
interface OrderWithLogs { id: string; order_number?: string; status: string; payment_status: string; created_at: string; customer?: { name: string }; recentLogs: OrderLog[]; progressPhotos?: OrderProgressPhoto[] }
interface StatData { orders: Order[]; totalOrders: number; totalCustomers: number; totalProducts: number; pendingPRs: PurchaseRequest[]; ordersWithLogs: OrderWithLogs[] }
interface InstallBooking { id: string; status: string; scheduled_date: string; scheduled_time: string; type: string; order?: { customer?: { name: string; phone: string; address: string } | null } }

const ACTION_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  created: { icon: <PackagePlus size={14} />, color: '#3b82f6' },
  sorted: { icon: <FileEdit size={14} />, color: '#8b5cf6' },
  payment_input: { icon: <DollarSign size={14} />, color: '#f59e0b' },
  payment_approved: { icon: <CheckCheck size={14} />, color: '#22c55e' },
  production_started: { icon: <TrendingUp size={14} />, color: '#06b6d4' },
  production_done: { icon: <CheckCircle2 size={14} />, color: '#16a34a' },
  qc_pass: { icon: <CheckCircle2 size={14} />, color: '#22c55e' },
  qc_fail: { icon: <XOctagon size={14} />, color: '#ef4444' },
  return_initiated: { icon: <RotateCcw size={14} />, color: '#f59e0b' },
  cancelled: { icon: <Ban size={14} />, color: '#dc2626' },
  shipped: { icon: <Truck size={14} />, color: '#0d9488' },
  install_started: { icon: <Calendar size={14} />, color: '#8b5cf6' },
  install_done: { icon: <CheckCircle2 size={14} />, color: '#22c55e' },
  done: { icon: <CheckCheck size={14} />, color: '#16a34a' },
  return_stock_in: { icon: <PackagePlus size={14} />, color: '#22c55e' },
  return_disposed: { icon: <XOctagon size={14} />, color: '#ef4444' },
  refund_issued: { icon: <DollarSign size={14} />, color: '#f59e0b' },
}

const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function AdminDashboardPage() {
  const [data, setData] = useState<StatData | null>(null)
  const [installBookings, setInstallBookings] = useState<InstallBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [trendData, setTrendData] = useState<{ date: string; count: number }[]>([])
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('admin-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_logs' }, () => {
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_progress_photos' }, () => {
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'install_bookings' }, () => {
        loadData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    async function loadTrend() {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const { data: trendOrders } = await supabase
        .from('orders')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())

      const dailyCount: Record<string, number> = {}
      const today = new Date()
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const key = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        dailyCount[key] = 0
      }
      ;(trendOrders ?? []).forEach((o: any) => {
        const key = new Date(o.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        if (dailyCount[key] !== undefined) dailyCount[key]++
      })
      setTrendData(Object.entries(dailyCount).map(([date, count]) => ({ date, count })))
    }
    loadTrend()
  }, [])

  async function loadData() {
    setLoading(true)
    // Fetch recent orders with their recent logs (max 10 orders, 5 logs each)
    const { data: ordersWithLogsData } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, payment_status, created_at,
        customer:customers(name),
        order_logs!order_logs_order_id_fkey(id, action, notes, created_at, staff:users(name)),
        order_progress_photos(id, stage, photo_url, notes, created_at)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    const formatted = (ordersWithLogsData ?? []).map((o: any) => ({
      ...o,
      recentLogs: (o.order_logs ?? []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
      progressPhotos: o.order_progress_photos ?? [],
    }))

    const [{ data: ordersData, count: totalOrders }, { data: customersData, count: totalCustomers }, { data: productsData, count: totalProducts }, { data: pendingPRs }, { data: installsData }] = await Promise.all([
      supabase.from('orders').select('id, status, payment_status', { count: 'exact' }),
      supabase.from('customers').select('id', { count: 'exact' }),
      supabase.from('products').select('id', { count: 'exact' }),
      supabase.from('purchase_requests').select('*, material:materials(name)').eq('status', 'pending'),
      supabase.from('install_bookings').select('id, status, scheduled_date, scheduled_time, type, order:orders(customer:customers(name, phone, address))').gte('scheduled_date', new Date().toISOString().split('T')[0]).in('status', ['scheduled', 'in_progress', 'revision']),
    ])

    setInstallBookings((installsData as any) ?? [])
    setData({
      orders: (ordersData ?? []) as Order[],
      totalOrders: totalOrders ?? 0,
      totalCustomers: totalCustomers ?? 0,
      totalProducts: totalProducts ?? 0,
      pendingPRs: pendingPRs ?? [],
      ordersWithLogs: formatted,
    })
    setLoading(false)
  }

  async function approvePR(id: string) {
    setApproving(id)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('purchase_requests').update({ status: 'approved', approved_by: user?.id }).eq('id', id)
    setApproving(null)
    loadData()
  }

  async function rejectPR(id: string) {
    if (!confirm('Tolak PR ini?')) return
    setRejecting(id)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('purchase_requests').update({ status: 'rejected', approved_by: user?.id }).eq('id', id)
    setRejecting(null)
    loadData()
  }

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#cc7030' }} />
      </div>
    )
  }

  const { orders, totalOrders, totalCustomers, totalProducts, pendingPRs, ordersWithLogs } = data
  const newOrders = orders.filter((o) => o.status === 'new').length
  const pendingPayment = orders.filter((o) => o.payment_status === 'pending').length
  const doneOrders = orders.filter((o) => o.status === 'done').length
  const inProduction = orders.filter((o) => o.status === 'production' || o.status === 'steam').length

  // Real-time: today's orders
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayOrders = orders.filter((o) => new Date(o.created_at) >= todayStart)
  const todayOrderCount = todayOrders.length
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0)

  // Install stats
  const scheduledInstalls = installBookings.filter(b => b.status === 'scheduled').length
  const activeInstalls = installBookings.filter(b => b.status === 'in_progress').length
  const revisionInstalls = installBookings.filter(b => b.status === 'revision').length

  // Chart data: Order count by status
  const statusCounts: Record<string, number> = {}
  orders.forEach((o) => { statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1 })
  const STATUS_LABELS: Record<string, string> = {
    new: 'Baru', sorted: 'Sorted', payment_ok: 'Payment OK', production: 'Produksi',
    steam: 'Steam/QC', ready: 'Siap', packed: 'Packed', shipped: 'Dikirim', done: 'Selesai',
    cancelled: 'Cancelled', returned: 'Returned',
  }
  const statusChartData = Object.entries(statusCounts).map(([k, v]) => ({
    name: STATUS_LABELS[k] ?? k,
    count: v,
  }))

  // Chart data: Revenue by source
  const revenueBySource: Record<string, number> = {}
  orders.forEach((o) => {
    const src = o.source ?? 'offline'
    revenueBySource[src] = (revenueBySource[src] ?? 0) + (o.total_amount ?? 0)
  })
  const revenueChartData = Object.entries(revenueBySource).map(([k, v]) => ({
    name: SOURCE_LABELS[k as keyof typeof SOURCE_LABELS] ?? k,
    revenue: v,
  })).sort((a, b) => b.revenue - a.revenue)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard Admin</h1>
        <p className="page-subtitle">Selamat datang di KJ Homedecor Management System</p>
      </div>

      {/* Stat Cards — Improved */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Real-time Hari Ini */}
        <div className="stat-card" style={{ borderLeft: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-card-label">Real-time Hari Ini</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
                <div className="stat-card-value" style={{ color: '#16a34a' }}>{todayOrderCount}</div>
                <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>pesanan baru</span>
              </div>
              <div className="stat-card-sub" style={{ color: '#059669', fontWeight: '600' }}>{formatRp(todayRevenue)} omzet</div>
            </div>
            <div style={{ background: '#d1fae5', borderRadius: '0.5rem', padding: '0.5rem' }}>
              <Activity size={20} style={{ color: '#16a34a' }} />
            </div>
          </div>
        </div>

        {/* Produksi Aktif */}
        <div className="stat-card" style={{ borderLeft: '4px solid #06b6d4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-card-label">Produksi Aktif</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
                <div className="stat-card-value" style={{ color: '#06b6d4' }}>{inProduction}</div>
                <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>sedang diproduksi</span>
              </div>
              <div className="stat-card-sub">Gudang sedang kerjakan</div>
            </div>
            <div style={{ background: '#cffafe', borderRadius: '0.5rem', padding: '0.5rem' }}>
              <Wrench size={20} style={{ color: '#06b6d4' }} />
            </div>
          </div>
        </div>

        {/* Instalasi Aktif */}
        <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-card-label">Instalasi Aktif</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
                <div className="stat-card-value" style={{ color: '#8b5cf6' }}>{activeInstalls}</div>
                <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>sedang pasang</span>
              </div>
              <div className="stat-card-sub">{scheduledInstalls} terjadwal · {revisionInstalls} revisi</div>
            </div>
            <div style={{ background: '#f5f3ff', borderRadius: '0.5rem', padding: '0.5rem' }}>
              <Calendar size={20} style={{ color: '#8b5cf6' }} />
            </div>
          </div>
        </div>

        {/* PR Pending */}
        {pendingPRs.length > 0 && (
          <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-card-label">PR Pending</div>
                <div className="stat-card-value" style={{ color: '#f59e0b' }}>{pendingPRs.length}</div>
                <div className="stat-card-sub">Perlu approve</div>
              </div>
              <div style={{ background: '#fef3c7', borderRadius: '0.5rem', padding: '0.5rem' }}>
                <AlertCircle size={20} style={{ color: '#f59e0b' }} />
              </div>
            </div>
          </div>
        )}

        {/* Total Orders */}
        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-card-label">Total Pesanan</div>
              <div className="stat-card-value" style={{ color: '#3b82f6' }}>{totalOrders}</div>
              <div className="stat-card-sub" style={{ color: '#f59e0b' }}>{newOrders} pesanan baru</div>
            </div>
            <div style={{ background: '#eff6ff', borderRadius: '0.5rem', padding: '0.5rem' }}>
              <ShoppingCart size={20} style={{ color: '#3b82f6' }} />
            </div>
          </div>
        </div>

        {/* Pending Payment */}
        <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-card-label">Menunggu Bayar</div>
              <div className="stat-card-value" style={{ color: '#ef4444' }}>{pendingPayment}</div>
              <div className="stat-card-sub">Perlu konfirmasi Finance</div>
            </div>
            <div style={{ background: '#fef2f2', borderRadius: '0.5rem', padding: '0.5rem' }}>
              <Clock size={20} style={{ color: '#ef4444' }} />
            </div>
          </div>
        </div>

        {/* Done Orders */}
        <div className="stat-card" style={{ borderLeft: '4px solid #22c55e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-card-label">Selesai</div>
              <div className="stat-card-value" style={{ color: '#22c55e' }}>{doneOrders}</div>
              <div className="stat-card-sub">Pesanan completed</div>
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: '0.5rem', padding: '0.5rem' }}>
              <CheckCheck size={20} style={{ color: '#22c55e' }} />
            </div>
          </div>
        </div>

        {/* Total Customers */}
        <div className="stat-card" style={{ borderLeft: '4px solid #ec4899' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-card-label">Total Pelanggan</div>
              <div className="stat-card-value" style={{ color: '#ec4899' }}>{totalCustomers}</div>
              <div className="stat-card-sub">Terdaftar</div>
            </div>
            <div style={{ background: '#fdf2f8', borderRadius: '0.5rem', padding: '0.5rem' }}>
              <Users size={20} style={{ color: '#ec4899' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {!loading && data && (
        <>
          {/* Order by Status Bar Chart */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <BarChart3 size={16} color="#cc7030" />
                <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>Pesanan per Status</h3>
              </div>
              {data.orders.length === 0 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Tidak ada data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={statusChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#cc7030" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Revenue by Source Bar Chart */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <TrendingUp size={16} color="#2563eb" />
                <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>Omzet per Sumber</h3>
              </div>
              {data.orders.length === 0 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Tidak ada data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatRp(v).replace('Rp ', '').replaceAll('.', '')} />
                    <Tooltip formatter={(v) => formatRp(v as number)} />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* 30-Day Order Trend */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <TrendingUp size={16} color="#16a34a" />
              <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>Tren 30 Hari</h3>
            </div>
            {trendData.length === 0 ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Tidak ada data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: pendingPRs.length > 0 ? '1fr' : '1fr', gap: '1.5rem' }}>
        {/* PR Approval Section */}
        {pendingPRs.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle size={18} color="#f59e0b" />
              <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                Purchase Request Pending ({pendingPRs.length})
              </h2>
            </div>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Qty</th>
                    <th>Estimasi Cost</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPRs.map(pr => (
                    <tr key={pr.id}>
                      <td style={{ fontWeight: '600' }}>{pr.material?.name ?? '—'}</td>
                      <td style={{ color: '#6b7280' }}>{pr.qty}</td>
                      <td style={{ fontWeight: '600', color: '#cc7030' }}>
                        {formatRp(pr.estimated_cost)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => approvePR(pr.id)}
                            disabled={approving === pr.id}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.75rem', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.78rem', fontWeight: '600', cursor: approving === pr.id ? 'not-allowed' : 'pointer', opacity: approving === pr.id ? 0.6 : 1 }}
                          >
                            <CheckCircle2 size={12} /> {approving === pr.id ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => rejectPR(pr.id)}
                            disabled={rejecting === pr.id}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.75rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.78rem', fontWeight: '600', cursor: rejecting === pr.id ? 'not-allowed' : 'pointer', opacity: rejecting === pr.id ? 0.6 : 1 }}
                          >
                            <XCircle size={12} /> {rejecting === pr.id ? '...' : 'Tolak'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Progress Pesanan — Improved Card UI */}
      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151' }}>Progress Pesanan</h2>
          <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{data.ordersWithLogs.length} pesanan terakhir</span>
        </div>
        {!data?.ordersWithLogs || data.ordersWithLogs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.75rem', fontSize: '0.875rem' }}>
            Belum ada pesanan
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
            {data.ordersWithLogs.map((order) => {
              const actionStyle = ACTION_ICONS[order.status] ?? { icon: <Clock size={14} />, color: '#9ca3af' }
              const STATUS_COLORS: Record<string, string> = {
                new: '#3b82f6', sorted: '#8b5cf6', payment_ok: '#f59e0b', production: '#06b6d4',
                steam: '#0d9488', ready: '#14b8a6', packed: '#f97316', shipped: '#0d9488',
                done: '#22c55e', returned: '#f59e0b', cancelled: '#dc2626',
              }
              const PAYMENT_COLORS: Record<string, string> = {
                pending: '#ef4444', partial: '#f59e0b', paid: '#22c55e',
              }
              const statusColor = STATUS_COLORS[order.status] ?? '#9ca3af'
              const payColor = PAYMENT_COLORS[order.payment_status] ?? '#9ca3af'
              const photos = order.progressPhotos?.map(p => p.photo_url) ?? []
              const stages = ['new', 'sorted', 'payment_ok', 'production', 'steam', 'ready', 'packed', 'shipped', 'done']
              const currentStageIdx = stages.indexOf(order.status)
              const date = new Date(order.created_at)
              const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
              const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

              return (
                <div key={order.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
                  {/* Card Header */}
                  <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: statusColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: statusColor, flexShrink: 0 }}>
                        {actionStyle.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#1f2937', lineHeight: 1.2 }}>
                          {order.order_number || `#${order.id.slice(0, 8)}`}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                          {order.customer?.name ?? '—'} · {dateStr}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: '600', padding: '0.15rem 0.5rem', borderRadius: '9999px', background: statusColor + '15', color: statusColor, textTransform: 'capitalize' }}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '0.65rem', fontWeight: '600', padding: '0.15rem 0.5rem', borderRadius: '9999px', background: payColor + '15', color: payColor }}>
                        {order.payment_status === 'partial' ? 'DP' : order.payment_status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {stages.map((stage, i) => {
                        const filled = currentStageIdx >= i
                        const active = currentStageIdx === i
                        return (
                          <div key={stage} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem' }}>
                            <div style={{ width: '100%', height: 3, borderRadius: 2, background: filled ? statusColor : '#e5e7eb' }} />
                            {active && (
                              <span style={{ fontSize: '0.5rem', color: statusColor, fontWeight: 600, marginTop: 2 }}>●</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <div style={{ padding: '0.5rem 1rem', minHeight: 80 }}>
                    {order.recentLogs.length === 0 ? (
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af', padding: '0.5rem 0' }}>Belum ada aktivitas</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {order.recentLogs.slice(0, 3).map((log, i) => {
                          const logStyle = ACTION_ICONS[log.action] ?? { icon: <Clock size={12} />, color: '#9ca3af' }
                          return (
                            <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: i > 0 ? '0.75rem' : 0, borderLeft: i > 0 ? '2px solid #e5e7eb' : 'none' }}>
                              <span style={{ color: logStyle.color, display: 'flex', flexShrink: 0 }}>{logStyle.icon}</span>
                              <span style={{ fontSize: '0.72rem', color: '#6b7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {log.action.replace(/_/g, ' ').toUpperCase()}
                                {log.staff && <span style={{ color: '#9ca3af' }}> — {log.staff.name}</span>}
                              </span>
                              <span style={{ fontSize: '0.65rem', color: '#9ca3af', flexShrink: 0 }}>
                                {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Photo thumbnails */}
                  {photos.length > 0 && (
                    <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                        <Camera size={10} style={{ color: '#9ca3af' }} />
                        <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>{photos.length} foto</span>
                      </div>
                      <LightboxGallery
                        photos={photos}
                        onPhotoClick={(i) => { setLightboxPhotos(photos); setLightboxIndex(i); setLightboxOpen(true) }}
                        columns={4}
                      />
                    </div>
                  )}

                  {/* Card Footer */}
                  <div style={{ padding: '0.5rem 1rem', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <a href={`/admin/orders/${order.id}`} style={{ fontSize: '0.72rem', color: '#cc7030', fontWeight: 600, textDecoration: 'none' }}>
                      Lihat Detail →
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          photos={lightboxPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNext={() => setLightboxIndex(i => i < lightboxPhotos.length - 1 ? i + 1 : i)}
          onPrev={() => setLightboxIndex(i => i > 0 ? i - 1 : i)}
        />
      )}
    </div>
  )
}