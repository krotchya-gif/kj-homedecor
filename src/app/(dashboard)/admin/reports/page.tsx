'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  ShoppingCart,
  Users,
  Package,
  FileDown
} from 'lucide-react'
import { SOURCE_LABELS, STATUS_LABELS } from '@/types'
import { StatCardSkeleton, CardGridSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import { formatRp } from '@/lib/utils'
import { createReportDoc, addReportTable, addPageNumbers } from '@/lib/report-pdf'

interface Order {
  id: string
  source: string
  status: string
  total_amount: number
  payment_status: string
  created_at: string
  order_items?: Array<{
    product_id: string
    price: number
    qty: number
    custom_specs?: string
    product?: { name: string }
  }>
}

interface TopProduct {
  name: string
  count: number
  revenue: number
}

const MONTHS = [
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

const STATUS_ORDER = ['new', 'payment_ok', 'sorted', 'production', 'ready', 'done']

const STATUS_COLORS: Record<string, string> = {
  new: '#3b82f6',
  sorted: '#8b5cf6',
  payment_ok: '#f59e0b',
  production: '#06b6d4',
  ready: '#10b981',
  done: '#22c55e'
}

export default function AdminReportsPage() {
const [orders, setOrders] = useState<Order[]>([])
const [prevOrders, setPrevOrders] = useState<Order[]>([])
const [loading, setLoading] = useState(true)
const [year, setYear] = useState(new Date().getFullYear())
const [month, setMonth] = useState(new Date().getMonth() + 1)
const [srcPage, setSrcPage] = useState(0)
const [srcPageSize, setSrcPageSize] = useState(10)
const [prodPage, setProdPage] = useState(0)
const [prodPageSize, setProdPageSize] = useState(10)
  const supabase = createClient()

  useEffect(() => {
    loadOrders()
  }, [year, month])

  async function loadOrders() {
    setLoading(true)
    // Phase 4 (BUG-101): filter periode pindah ke SERVER (gte/lte) — sebelumnya
    // .limit(200) + filter client → laporan periode lama selalu terpotong & angka salah.
    // Ambil 2 periode (current + prev utk MoM) dalam satu query rentang luas.
    let startISO = '2020-01-01'
    let endISO = '2099-12-31'
    if (month !== 0) {
      const s = new Date(year, month - 1, 1)
      const e = new Date(year, month, 0)
      startISO = s.toISOString()
      endISO = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59).toISOString()
    } else {
      startISO = `${year}-01-01T00:00:00`
      endISO = `${year}-12-31T23:59:59`
    }

    const { data } = await supabase
      .from('orders')
      .select('*, order_items(product_id, price, qty, custom_specs, product:products(name))')
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('created_at', { ascending: false })

    // Previous period (MoM): bulan/tahun sebelumnya
    let prevStart: string | null = null
    let prevEnd: string | null = null
    if (month !== 0) {
      const pm = month === 1 ? 12 : month - 1
      const py = month === 1 ? year - 1 : year
      const s = new Date(py, pm - 1, 1)
      const e = new Date(py, pm, 0)
      prevStart = s.toISOString()
      prevEnd = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59).toISOString()
    } else {
      prevStart = `${year - 1}-01-01T00:00:00`
      prevEnd = `${year - 1}-12-31T23:59:59`
    }

    const { data: prevData } = await supabase
      .from('orders')
      .select('total_amount, created_at')
      .gte('created_at', prevStart)
      .lte('created_at', prevEnd)

    setOrders((data as Order[]) ?? [])
    setPrevOrders((prevData as Order[]) ?? [])
    setLoading(false)
  }

  // Stats
  const totalOrders = orders.length
  const totalRevenue = orders.reduce((s, o) => s + (o.total_amount ?? 0), 0)
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // MoM stats
  const prevRevenue = prevOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0)
  const prevOrderCount = prevOrders.length
  const prevAvgValue = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0

  const revChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : null
  const ordersChange = prevOrderCount > 0 ? ((totalOrders - prevOrderCount) / prevOrderCount) * 100 : null
  const avgChange = prevAvgValue > 0 ? ((avgOrderValue - prevAvgValue) / prevAvgValue) * 100 : null

  const momLabel = month === 0 ? `vs ${year - 1}` : `vs ${MONTHS[month === 1 ? 11 : month - 2]}`

  function TrendIcon({ change }: { change: number | null }) {
    if (change === null) return <Minus size={12} style={{ color: 'var(--neutral-400)' }} />
    if (change >= 0) return <TrendingUp size={12} style={{ color: '#059669' }} />
    return <TrendingDown size={12} style={{ color: '#dc2626' }} />
  }

  // Pipeline counts
  const pipelineCounts: Record<string, number> = {}
  STATUS_ORDER.forEach((s) => {
    pipelineCounts[s] = 0
  })
  orders.forEach((o) => {
    if (pipelineCounts[o.status] !== undefined) pipelineCounts[o.status]++
  })

  // Marketplace breakdown
  const sourceRevenue: Record<string, number> = {}
  const sourceOrders: Record<string, number> = {}
  orders.forEach((o) => {
    const src = o.source ?? 'offline'
    sourceRevenue[src] = (sourceRevenue[src] ?? 0) + (o.total_amount ?? 0)
    sourceOrders[src] = (sourceOrders[src] ?? 0) + 1
  })

  // Top products
  const productRevenue: Record<string, TopProduct> = {}
  orders.forEach((o) => {
    ;(o.order_items ?? []).forEach((item) => {
      const name = item.product?.name ?? item.custom_specs ?? 'Unknown'
      if (!productRevenue[name]) productRevenue[name] = { name, count: 0, revenue: 0 }
      productRevenue[name].count += item.qty ?? 1
      productRevenue[name].revenue += (item.price ?? 0) * (item.qty ?? 1)
    })
  })
  const topProducts = Object.values(productRevenue).sort((a, b) => b.revenue - a.revenue)

  const pageProducts = topProducts.slice(prodPage * prodPageSize, (prodPage + 1) * prodPageSize)

  

  function exportCSV() {
    const headers = ['Order ID', 'Tanggal', 'Source', 'Status', 'Total', 'Payment']
    const rows = orders.map((o) => [
      o.id.slice(0, 8),
      new Date(o.created_at).toLocaleDateString('id-ID'),
      SOURCE_LABELS[o.source as keyof typeof SOURCE_LABELS] ?? o.source,
      STATUS_LABELS[o.status as keyof typeof STATUS_LABELS] ?? o.status,
      o.total_amount,
      o.payment_status
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kj-laporan-${year}-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportPDF() {
    const periodLabel = month === 0 ? `Tahun ${year}` : `${MONTHS[month - 1]} ${year}`
    const { doc, startY } = createReportDoc({ title: 'Laporan Penjualan', period: periodLabel })
    let y = startY

    // Ringkasan
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Ringkasan', 14, y)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    y += 6
    doc.text(`Total Pesanan  : ${totalOrders}`, 14, y)
    y += 5
    doc.text(`Total Omzet    : ${formatRp(totalRevenue)}`, 14, y)
    y += 5
    doc.text(`Rata-rata Order: ${formatRp(avgOrderValue)}`, 14, y)
    y += 8

    // Pipeline
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Pipeline Pesanan', 14, y)
    y += 4
    y = addReportTable(doc, {
      startY: y,
      head: [['Status', 'Jumlah']],
      body: STATUS_ORDER.map((s) => [STATUS_LABELS[s as keyof typeof STATUS_LABELS] ?? s, String(pipelineCounts[s])]),
      foot: [['TOTAL', String(STATUS_ORDER.reduce((sum, s) => sum + (pipelineCounts[s] ?? 0), 0))]],
      theme: 'striped'
    })
    y += 8

    // Marketplace (sesi 44: + baris TOTAL)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Per Marketplace', 14, y)
    y += 4
    const marketTotal = Object.values(sourceRevenue).reduce((s, v) => s + v, 0)
    const marketOrderTotal = Object.values(sourceOrders).reduce((s, v) => s + v, 0)
    y = addReportTable(doc, {
      startY: y,
      head: [['Marketplace', 'Jumlah Order', 'Omzet']],
      body: Object.entries(sourceRevenue)
        .sort(([, a], [, b]) => b - a)
        .map(([src, rev]) => [
          SOURCE_LABELS[src as keyof typeof SOURCE_LABELS] ?? src,
          String(sourceOrders[src] ?? 0),
          formatRp(rev)
        ]),
      foot: [['TOTAL', String(marketOrderTotal), formatRp(marketTotal)]],
      theme: 'striped'
    })
    y += 8

    // Produk terlaris (sesi 44: + baris TOTAL)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Produk Terlaris', 14, y)
    y += 4
    const prodTotal = topProducts.reduce((s, p) => s + p.revenue, 0)
    const prodQty = topProducts.reduce((s, p) => s + p.count, 0)
    addReportTable(doc, {
      startY: y,
      head: [['#', 'Produk', 'Qty', 'Revenue']],
      body: topProducts.map((p, i) => [String(i + 1), p.name, String(p.count), formatRp(p.revenue)]),
      foot: [['', 'TOTAL', String(prodQty), formatRp(prodTotal)]],
      theme: 'striped'
    })

    addPageNumbers(doc)
    doc.save(`kj-laporan-${year}-${month}.pdf`)
  }

  return (
    <div>
      <PageHeader
        title="Laporan"
        subtitle="Laporan penjualan dan pipeline pesanan"
        action={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={exportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.625rem 1.25rem',
                background: 'var(--surface)',
                color: 'var(--neutral-700)',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <Download size={16} /> Export CSV
            </button>
            <button
              onClick={exportPDF}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.625rem 1.25rem',
                background: '#cc7030',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <FileDown size={16} /> Export PDF
            </button>
          </div>
        }
      />

      {/* Period Filter */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap'
        }}
      >
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          style={{
            padding: '0.625rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            outline: 'none',
            background: 'var(--surface)'
          }}
        >
          {[2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          style={{
            padding: '0.625rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            outline: 'none',
            background: 'var(--surface)'
          }}
        >
          <option value={0}>Semua Bulan</option>
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Stat Cards with MoM */}
      {loading ? (
        <StatCardSkeleton />
      ) : (
        <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-card-label">Total Pesanan</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <div className="stat-card-value">{totalOrders}</div>
              {ordersChange !== null && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.15rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '999px',
                    background: ordersChange >= 0 ? '#d1fae5' : '#fee2e2',
                    color: ordersChange >= 0 ? '#065f46' : '#991b1b'
                  }}
                >
                  <TrendIcon change={ordersChange} />
                  {Math.abs(ordersChange).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="stat-card-sub">{momLabel}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Total Omzet</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <div className="stat-card-value" style={{ color: '#cc7030' }}>
                {formatRp(totalRevenue)}
              </div>
              {revChange !== null && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.15rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '999px',
                    background: revChange >= 0 ? '#d1fae5' : '#fee2e2',
                    color: revChange >= 0 ? '#065f46' : '#991b1b'
                  }}
                >
                  <TrendIcon change={revChange} />
                  {Math.abs(revChange).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="stat-card-sub">Pendapatan kotor</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Rata-rata Order</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <div className="stat-card-value" style={{ color: '#7c3aed' }}>
                {formatRp(avgOrderValue)}
              </div>
              {avgChange !== null && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.15rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '999px',
                    background: avgChange >= 0 ? '#d1fae5' : '#fee2e2',
                    color: avgChange >= 0 ? '#065f46' : '#991b1b'
                  }}
                >
                  <TrendIcon change={avgChange} />
                  {Math.abs(avgChange).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="stat-card-sub">Per pesanan</div>
          </div>
        </div>
      )}

      {/* Pipeline Funnel */}
      <div className="section-card">
        <h2
          style={{
            fontSize: '0.95rem',
            fontWeight: '700',
            color: 'var(--neutral-700)',
            marginBottom: '1rem'
          }}
        >
          Pipeline Pesanan
        </h2>
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'stretch',
            flexWrap: 'wrap'
          }}
        >
          {STATUS_ORDER.map((status, i) => (
            <div
              key={status}
              style={{
                flex: 1,
                minWidth: 100,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    textAlign: 'center',
                    padding: '0.5rem',
                    background: STATUS_COLORS[status],
                    borderRadius: '0.5rem 0.5rem 0 0',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}
                >
                  {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
                </div>
                <div
                  style={{
                    textAlign: 'center',
                    padding: '0.75rem',
                    background: 'var(--neutral-100)',
                    border: `1px solid ${STATUS_COLORS[status]}`,
                    borderTop: 'none',
                    borderRadius: '0 0 0.5rem 0.5rem',
                    fontWeight: '700',
                    fontSize: '1.25rem',
                    color: 'var(--neutral-800)'
                  }}
                >
                  {pipelineCounts[status]}
                </div>
              </div>
              {i < STATUS_ORDER.length - 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--input-border)',
                    fontSize: '1.2rem',
                    padding: '0 0.25rem',
                    alignSelf: 'center'
                  }}
                >
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div
        className="pipeline-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}
      >
        {/* Marketplace Breakdown */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid #e5e7eb',
              background: 'var(--neutral-100)'
            }}
          >
            <h2
              style={{
                fontSize: '0.9rem',
                fontWeight: '700',
                color: 'var(--neutral-700)',
                margin: 0
              }}
            >
              Per Marketplace
            </h2>
          </div>
                {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : topProducts.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={topProducts} keyOf={(p) => p.name} renderCard={(p) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Produk</span>
                  <span className="mobile-card-value">{p.name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Terjual</span>
                  <span className="mobile-card-value">{p.count}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Omzet</span>
                  <span className="mobile-card-value">{p.revenue}</span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
            {loading ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--neutral-400)'
                }}
              >
                Memuat...
              </div>
            ) : Object.keys(sourceRevenue).length === 0 ? (
              <EmptyState icon="📊" title="Tidak ada data" description="Tidak ada data untuk periode yang dipilih." />
            ) : (
              <>
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
                      .slice(srcPage * srcPageSize, (srcPage + 1) * srcPageSize)
                      .map(([src, rev]) => (
                        <tr key={src}>
                          <td style={{ fontWeight: '600' }}>{SOURCE_LABELS[src as keyof typeof SOURCE_LABELS] ?? src}</td>
                          <td style={{ color: 'var(--neutral-600)' }}>{sourceOrders[src] ?? 0}</td>
                          <td style={{ fontWeight: '600', color: '#cc7030' }}>{formatRp(rev)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <div style={{ padding: '0 1.25rem 1rem' }}>
                  <Pagination
                    currentPage={srcPage + 1}
                    totalPages={Math.max(1, Math.ceil(Object.keys(sourceRevenue).length / srcPageSize))}
                    onPageChange={(p) => setSrcPage(p - 1)}
                    pageSize={srcPageSize}
                    onPageSizeChange={(s) => {
                      setSrcPageSize(s)
                      setSrcPage(0)
                    }}
                    totalItems={Object.keys(sourceRevenue).length}
                    startIndex={Object.keys(sourceRevenue).length === 0 ? 0 : srcPage * srcPageSize + 1}
                    endIndex={Math.min((srcPage + 1) * srcPageSize, Object.keys(sourceRevenue).length)}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid #e5e7eb',
              background: 'var(--neutral-100)'
            }}
          >
            <h2
              style={{
                fontSize: '0.9rem',
                fontWeight: '700',
                color: 'var(--neutral-700)',
                margin: 0
              }}
            >
              Produk Terlaris
            </h2>
          </div>
      {/* Mobile: card list */}
      <div className="mobile-only">
        {topProducts.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={pageProducts} keyOf={(p) => p.name} renderCard={(p) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Produk</span>
                  <span className="mobile-card-value">{p.name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Qty</span>
                  <span className="mobile-card-value">{p.count}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Revenue</span>
                  <span className="mobile-card-value">{formatRp(p.revenue)}</span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
            {loading ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--neutral-400)'
                }}
              >
                Memuat...
              </div>
            ) : topProducts.length === 0 ? (
              <EmptyState icon="📊" title="Tidak ada data" description="Tidak ada data untuk periode yang dipilih." />
            ) : (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th>Qty</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageProducts.map((p, i) => (
                      <tr key={p.name}>
                        <td style={{ fontWeight: '500' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 20,
                              height: 20,
                              background: i < 3 ? '#cc7030' : 'var(--neutral-200)',
                              color: i < 3 ? '#fff' : 'var(--neutral-600)',
                              borderRadius: '50%',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              marginRight: '0.5rem'
                            }}
                          >
                            {prodPage * prodPageSize + i + 1}
                          </span>
                          {p.name}
                        </td>
                        <td style={{ color: 'var(--neutral-600)' }}>{p.count}</td>
                        <td style={{ fontWeight: '600', color: '#cc7030' }}>{formatRp(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: '0 1.25rem 1rem' }}>
                  <Pagination
                    currentPage={prodPage + 1}
                    totalPages={Math.max(1, Math.ceil(topProducts.length / prodPageSize))}
                    onPageChange={(p) => setProdPage(p - 1)}
                    pageSize={prodPageSize}
                    onPageSizeChange={(s) => {
                      setProdPageSize(s)
                      setProdPage(0)
                    }}
                    totalItems={topProducts.length}
                    startIndex={topProducts.length === 0 ? 0 : prodPage * prodPageSize + 1}
                    endIndex={Math.min((prodPage + 1) * prodPageSize, topProducts.length)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
