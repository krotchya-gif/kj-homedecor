'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Calendar, MapPin, Package, TrendingUp } from 'lucide-react'

interface CompletedBooking {
  id: string
  type: string
  scheduled_date: string
  actual_date: string
  address: string
  notes: string
  order?: {
    id: string
    total_amount: number
    order_items?: Array<{
      product?: { name: string }
      qty: number
      meter_gorden?: number
      meter_vitras?: number
      meter_roman?: number
      meter_kupu_kupu?: number
    }>
    customer?: { name: string; phone: string }
  }
}

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function InstallerReportsPage() {
  const [bookings, setBookings] = useState<CompletedBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'all' | 'this_month' | 'last_month'>('this_month')
  const supabase = createClient()

  useEffect(() => {
    loadBookings()
  }, [period])

  async function loadBookings() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    let dateFilter: string | undefined
    const now = new Date()
    if (period === 'this_month') {
      dateFilter = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    } else if (period === 'last_month') {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      dateFilter = `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, '0')}`
    }

    let query = supabase
      .from('install_bookings')
      .select('*, order:orders(id, total_amount, customer:customers(name, phone), order_items:order_items(qty, product:products(name), meter_gorden, meter_vitras, meter_roman, meter_kupu_kupu))')
      .eq('installer_id', user?.id ?? '')
      .eq('status', 'done')
      .order('actual_date', { ascending: false })

    const { data } = await query
    let filtered = data ?? []

    if (dateFilter) {
      filtered = filtered.filter(b => b.actual_date?.startsWith(dateFilter!))
    }

    setBookings(filtered)
    setLoading(false)
  }

  const totalInstall = bookings.length
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.order?.total_amount ?? 0), 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Laporan Instalasi</h1>
        <p className="page-subtitle">Riwayat dan statistik pekerjaan pemasangan selesai</p>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Instalasi</div>
          <div className="stat-card-value">{totalInstall}</div>
          <div className="stat-card-sub">Pemasangan selesai</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Nilai Order</div>
          <div className="stat-card-value" style={{ color: '#cc7030' }}>{formatRp(totalRevenue)}</div>
          <div className="stat-card-sub">Total nilai pesanan</div>
        </div>
      </div>

      {/* Period Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {(['all', 'this_month', 'last_month'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid',
              borderColor: period === p ? '#cc7030' : '#d1d5db',
              borderRadius: '0.5rem',
              background: period === p ? '#cc7030' : '#fff',
              color: period === p ? '#fff' : '#374151',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            {p === 'all' ? 'Semua' : p === 'this_month' ? 'Bulan Ini' : 'Bulan Lalu'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
        ) : bookings.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <Calendar size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada data instalasi untuk periode ini</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Pelanggan</th>
                <th>Alamat</th>
                <th>Produk</th>
                <th>Nilai Order</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => {
                const items = b.order?.order_items ?? []
                const productNames = items.map((i: any) => i.product?.name ?? 'Produk').filter(Boolean)
                return (
                  <tr key={b.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                        {b.actual_date ? new Date(b.actual_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                        {b.scheduled_date}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{b.order?.customer?.name ?? '—'}</div>
                      {b.order?.customer?.phone && (
                        <a
                          href={`https://wa.me/${b.order.customer.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.75rem', color: '#16a34a', textDecoration: 'none' }}
                        >
                          💬 {b.order.customer.phone}
                        </a>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      {b.address || '—'}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>
                        {productNames.length > 0 ? productNames.slice(0, 2).join(', ') : '—'}
                        {productNames.length > 2 && <span style={{ color: '#9ca3af' }}> +{productNames.length - 2}</span>}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                        {items.length} item •{' '}
                        {items.reduce((sum: number, i: any) => sum + (i.meter_gorden ?? 0), 0)}m gorden
                      </div>
                    </td>
                    <td style={{ fontWeight: '600', color: '#cc7030' }}>
                      {formatRp(b.order?.total_amount ?? 0)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}