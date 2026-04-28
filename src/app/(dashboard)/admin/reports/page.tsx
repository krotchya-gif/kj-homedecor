'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { BarChart3, Download, TrendingUp, ShoppingCart, Users, Package } from 'lucide-react'
import { SOURCE_LABELS, STATUS_LABELS } from '@/types'

interface Order {
  id: string
  source: string
  status: string
  total_amount: number
  payment_status: string
  created_at: string
  order_items?: Array<{ product_id: string; price: number; qty: number; product?: { name: string } }>
}

interface TopProduct {
  name: string
  count: number
  revenue: number
}

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const STATUS_ORDER = ['new', 'sorted', 'payment_ok', 'production', 'ready', 'done']

const STATUS_COLORS: Record<string, string> = {
  new: '#3b82f6',
  sorted: '#8b5cf6',
  payment_ok: '#f59e0b',
  production: '#06b6d4',
  ready: '#10b981',
  done: '#22c55e',
}

export default function AdminReportsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const supabase = createClient()

  useEffect(() => { loadOrders() }, [year, month])

  async function loadOrders() {
    setLoading(true)
    let query = supabase
      .from('orders')
      .select('*, order_items(product_id, price, qty, product(name))')
      .order('created_at', { ascending: false })

    const { data } = await query
    let filtered = (data as Order[]) ?? []

    // Filter by year/month if not "all"
    if (month !== 0) {
      filtered = filtered.filter(o => {
        const d = new Date(o.created_at)
        return d.getFullYear() === year && d.getMonth() + 1 === month
      })
    } else {
      filtered = filtered.filter(o => new Date(o.created_at).getFullYear() === year)
    }

    setOrders(filtered)
    setLoading(false)
  }

  // Stats
  const totalOrders = orders.length
  const totalRevenue = orders.reduce((s, o) => s + (o.total_amount ?? 0), 0)
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Pipeline counts
  const pipelineCounts: Record<string, number> = {}
  STATUS_ORDER.forEach(s => { pipelineCounts[s] = 0 })
  orders.forEach(o => { if (pipelineCounts[o.status] !== undefined) pipelineCounts[o.status]++ })

  // Marketplace breakdown
  const sourceRevenue: Record<string, number> = {}
  const sourceOrders: Record<string, number> = {}
  orders.forEach(o => {
    const src = o.source ?? 'offline'
    sourceRevenue[src] = (sourceRevenue[src] ?? 0) + (o.total_amount ?? 0)
    sourceOrders[src] = (sourceOrders[src] ?? 0) + 1
  })

  // Top products
  const productRevenue: Record<string, TopProduct> = {}
  orders.forEach(o => {
    ;(o.order_items ?? []).forEach(item => {
      const name = item.product?.name ?? 'Unknown'
      if (!productRevenue[name]) productRevenue[name] = { name, count: 0, revenue: 0 }
      productRevenue[name].count += item.qty ?? 1
      productRevenue[name].revenue += (item.price ?? 0) * (item.qty ?? 1)
    })
  })
  const topProducts = Object.values(productRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 10)

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

  function exportCSV() {
    const headers = ['Order ID', 'Tanggal', 'Source', 'Status', 'Total', 'Payment']
    const rows = orders.map(o => [
      o.id.slice(0, 8),
      new Date(o.created_at).toLocaleDateString('id-ID'),
      SOURCE_LABELS[o.source as keyof typeof SOURCE_LABELS] ?? o.source,
      STATUS_LABELS[o.status as keyof typeof STATUS_LABELS] ?? o.status,
      o.total_amount,
      o.payment_status,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kj-laporan-${year}-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Laporan</h1>
          <p className="page-subtitle">Laporan penjualan dan pipeline pesanan</p>
        </div>
        <button
          onClick={exportCSV}
          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Period Filter */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ padding: '0.625rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }}>
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ padding: '0.625rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }}>
          <option value={0}>Semua Bulan</option>
          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Pesanan</div>
          <div className="stat-card-value">{totalOrders}</div>
          <div className="stat-card-sub">{month === 0 ? year : MONTHS[month - 1] + ' ' + year}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Omzet</div>
          <div className="stat-card-value" style={{ color: '#cc7030' }}>{formatRp(totalRevenue)}</div>
          <div className="stat-card-sub">Pendapatan kotor</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Rata-rata Order</div>
          <div className="stat-card-value" style={{ color: '#7c3aed' }}>{formatRp(avgOrderValue)}</div>
          <div className="stat-card-sub">Per pesanan</div>
        </div>
      </div>

      {/* Pipeline Funnel */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#374151', marginBottom: '1rem' }}>Pipeline Pesanan</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch', flexWrap: 'wrap' }}>
          {STATUS_ORDER.map((status, i) => (
            <div key={status} style={{ flex: 1, minWidth: 100, display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ textAlign: 'center', padding: '0.5rem', background: STATUS_COLORS[status], borderRadius: '0.5rem 0.5rem 0 0', color: '#fff', fontSize: '0.72rem', fontWeight: '600' }}>
                  {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f9fafb', border: `1px solid ${STATUS_COLORS[status]}`, borderTop: 'none', borderRadius: '0 0 0.5rem 0.5rem', fontWeight: '700', fontSize: '1.25rem', color: '#1f2937' }}>
                  {pipelineCounts[status]}
                </div>
              </div>
              {i < STATUS_ORDER.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db', fontSize: '1.2rem', padding: '0 0.25rem', alignSelf: 'center' }}>→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Marketplace Breakdown */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>Per Marketplace</h2>
          </div>
          <div className="data-table">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
            ) : Object.keys(sourceRevenue).length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Tidak ada data</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Marketplace</th>
                    <th>Order</th>
                    <th>Omzet</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(sourceRevenue)
                    .sort(([, a], [, b]) => b - a)
                    .map(([src, rev]) => (
                      <tr key={src}>
                        <td style={{ fontWeight: '600' }}>{SOURCE_LABELS[src as keyof typeof SOURCE_LABELS] ?? src}</td>
                        <td style={{ color: '#6b7280' }}>{sourceOrders[src] ?? 0}</td>
                        <td style={{ fontWeight: '600', color: '#cc7030' }}>{formatRp(rev)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>Produk Terlaris</h2>
          </div>
          <div className="data-table">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
            ) : topProducts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Tidak ada data</div>
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
                  {topProducts.map((p, i) => (
                    <tr key={p.name}>
                      <td style={{ fontWeight: '500' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: i < 3 ? '#cc7030' : '#e5e7eb', color: i < 3 ? '#fff' : '#6b7280', borderRadius: '50%', fontSize: '0.7rem', fontWeight: '700', marginRight: '0.5rem' }}>
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
      </div>
    </div>
  )
}