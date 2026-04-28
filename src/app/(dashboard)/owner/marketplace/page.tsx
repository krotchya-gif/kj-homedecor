'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ShoppingCart, Loader2, TrendingUp, BarChart3 } from 'lucide-react'
import { SOURCE_LABELS } from '@/types'

interface Order {
  id: string
  source: string
  total_amount: number
  payment_status: string
  created_at: string
}

const COLORS = ['#cc7030', '#2563eb', '#16a34a', '#9333ea', '#0d9488', '#f59e0b']

export default function OwnerMarketplacePage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<{ month: number; year: number }>({ month: new Date().getMonth() + 1, year: new Date().getFullYear() })

  const supabase = createClient()

  useEffect(() => { loadOrders() }, [period])

  async function loadOrders() {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('id, source, total_amount, payment_status, created_at')
      .gte('created_at', `${period.year}-${String(period.month).padStart(2, '0')}-01`)
      .lte('created_at', `${period.year}-${String(period.month).padStart(2, '0')}-31`)
      .order('created_at', { ascending: false })
    setOrders(data ?? [])
    setLoading(false)
  }

  const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

  // Breakdown
  const sourceStats: Record<string, { count: number; revenue: number }> = {}
  orders.forEach(o => {
    const src = o.source ?? 'offline'
    if (!sourceStats[src]) sourceStats[src] = { count: 0, revenue: 0 }
    sourceStats[src].count++
    sourceStats[src].revenue += o.total_amount ?? 0
  })

  const topSources = Object.entries(sourceStats)
    .map(([src, v]) => ({ source: src, ...v }))
    .sort((a, b) => b.revenue - a.revenue)

  const totalRevenue = Object.values(sourceStats).reduce((s, v) => s + v.revenue, 0)
  const totalOrders = orders.length

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Marketplace</h1>
        <p className="page-subtitle">Performa penjualan per platform</p>
      </div>

      {/* Period Filter */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select
          value={period.month}
          onChange={e => setPeriod(p => ({ ...p, month: Number(e.target.value) }))}
          style={{ padding: '0.625rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
        >
          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select
          value={period.year}
          onChange={e => setPeriod(p => ({ ...p, year: Number(e.target.value) }))}
          style={{ padding: '0.625rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
        >
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Revenue</div>
          <div className="stat-card-value" style={{ color: '#cc7030' }}>{formatRp(totalRevenue)}</div>
          <div className="stat-card-sub">{totalOrders} pesanan</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Platform Aktif</div>
          <div className="stat-card-value">{topSources.length}</div>
          <div className="stat-card-sub">Marketplace</div>
        </div>
        {topSources.slice(0, 3).map((src, i) => (
          <div key={src.source} className="stat-card">
            <div className="stat-card-label">{SOURCE_LABELS[src.source as keyof typeof SOURCE_LABELS] ?? src.source}</div>
            <div className="stat-card-value" style={{ color: COLORS[i % COLORS.length] }}>{formatRp(src.revenue)}</div>
            <div className="stat-card-sub">{src.count} pesanan</div>
          </div>
        ))}
      </div>

      {/* Breakdown Table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>Per Platform</h2>
        </div>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#cc7030' }} />
          </div>
        ) : topSources.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <ShoppingCart size={28} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Tidak ada data pesanan</p>
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Jumlah Order</th>
                  <th>Total Revenue</th>
                  <th>% Revenue</th>
                  <th>Avg Order</th>
                </tr>
              </thead>
              <tbody>
                {topSources.map((src, i) => (
                  <tr key={src.source}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '0.375rem',
                          background: COLORS[i % COLORS.length],
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', fontWeight: '700'
                        }}>
                          {i + 1}
                        </div>
                        <span style={{ fontWeight: '600' }}>
                          {SOURCE_LABELS[src.source as keyof typeof SOURCE_LABELS] ?? src.source}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: '#6b7280' }}>{src.count}</td>
                    <td style={{ fontWeight: '700', color: '#cc7030' }}>{formatRp(src.revenue)}</td>
                    <td>
                      <span style={{ background: '#f3f4f6', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>
                        {totalRevenue > 0 ? ((src.revenue / totalRevenue) * 100).toFixed(1) : 0}%
                      </span>
                    </td>
                    <td style={{ color: '#6b7280' }}>{formatRp(src.count > 0 ? src.revenue / src.count : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
