'use client'
import MobileCards from '@/components/ui/MobileCards'
import Pagination from '@/components/ui/Pagination'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ShoppingBag, RefreshCw, Link2, Loader2, AlertCircle, Info } from 'lucide-react'
import { formatRp } from '@/lib/utils'

interface TikTokOrder {
  id: string
  order_number?: string
  tiktok_order_id?: string
  order_status?: string
  status?: string
  payment_status?: string
  buyer_name?: string
  order_date?: string
  created_at?: string
  total_amount?: number
}

interface TikTokSetting {
  id: string
  shop_name?: string
  is_active?: boolean
  token_expires_at?: string
}

// Halaman khusus ADMIN — tugasnya: Sync Orders (tarik order dari TikTok) +
// Link to Main Orders (ubah order yang sudah dibayar jadi pesanan utama).
// Settlement/piutang/connect adalah urusan Owner/Finance (di /owner/tiktok).
export default function AdminTikTokPage() {
  const [settings, setSettings] = useState<TikTokSetting[]>([])
  const [orders, setOrders] = useState<TikTokOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [orderPage, setOrderPage] = useState(0)
  const [orderTotal, setOrderTotal] = useState(0)
  const [orderPageSize, setOrderPageSize] = useState(10)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [syncing, setSyncing] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  // Wave 3: pilih per-order utk Link to Main Orders (Set tiktok_order_id)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const supabase = createClient()

  const activeShop = settings.find((s) => s.is_active)
  const orderPageCount = Math.max(1, Math.ceil(orderTotal / orderPageSize))

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // "pilih semua" per halaman (hanya yang berstatus PAID — yang bisa di-link)
  function toggleSelectAllPage() {
    const pagePaid = orders.filter((o) => o.payment_status === 'PAID')
    const allSelected = pagePaid.length > 0 && pagePaid.every((o) => selected.has(o.tiktok_order_id ?? ''))
    setSelected((prev) => {
      const next = new Set(prev)
      for (const o of pagePaid) {
        if (!o.tiktok_order_id) continue
        if (allSelected) next.delete(o.tiktok_order_id)
        else next.add(o.tiktok_order_id)
      }
      return next
    })
  }

  function isTokenExpired(s?: TikTokSetting) {
    if (!s?.token_expires_at) return true
    return new Date(s.token_expires_at).getTime() < Date.now()
  }

  async function fetchOrders(page = 0, statusFilter?: string, paymentFilter?: string, limit?: number) {
    setLoading(true)
    const sf = statusFilter ?? filterStatus
    const pf = paymentFilter ?? filterPayment
    const ps = limit ?? orderPageSize

    let orderQuery = supabase.from('tiktok_shop_orders').select('*')
    if (sf) orderQuery = orderQuery.eq('order_status', sf)
    if (pf) orderQuery = orderQuery.eq('payment_status', pf)
    orderQuery = orderQuery
      .order('order_date', { ascending: false, nullsFirst: false })
      .range(page * ps, (page + 1) * ps - 1)

    let countQuery = supabase.from('tiktok_shop_orders').select('*', { count: 'exact', head: true })
    if (sf) countQuery = countQuery.eq('order_status', sf)
    if (pf) countQuery = countQuery.eq('payment_status', pf)

    const [settingsRes, ordersRes, totalRes] = await Promise.all([
      supabase
        .from('tiktok_shop_settings')
        .select('id, shop_name, is_active, token_expires_at'),
      orderQuery,
      countQuery
    ])
    setSettings(settingsRes.data ?? [])
    setOrders(ordersRes.data ?? [])
    setOrderTotal(totalRes.count ?? 0)
    setOrderPage(page)
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSyncOrders() {
    setSyncing('orders')
    setSyncResult(null)
    const res = await fetch('/api/tiktok/sync-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop_id: activeShop?.id,
        ...(dateRange.start ? { start_date: dateRange.start } : {}),
        ...(dateRange.end ? { end_date: dateRange.end } : {})
      })
    })
    const json = await res.json()
    if (json.error) {
      setSyncResult({ type: 'error', text: json.error })
    } else {
      setSyncResult({ type: 'success', text: json.message || 'Sync Orders selesai' })
    }
    setSyncing(null)
    fetchOrders()
  }

  async function handleLinkToMain() {
    setSyncing('orders_backfill')
    setSyncResult(null)
    // Wave 3: kalau ada order terpilih → link hanya yang dipilih; kosong → bulk semua
    const orderIds = selected.size > 0 ? Array.from(selected) : undefined
    const res = await fetch('/api/tiktok/sync-to-main-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop_id: activeShop?.id,
        ...(orderIds ? { order_ids: orderIds } : {}),
        ...(dateRange.start ? { start_date: dateRange.start } : {}),
        ...(dateRange.end ? { end_date: dateRange.end } : {})
      })
    })
    const json = await res.json()
    if (json.error) {
      setSyncResult({ type: 'error', text: json.error })
    } else {
      setSyncResult({ type: 'success', text: json.message || 'Link to Main Orders selesai' })
    }
    setSyncing(null)
    setSelected(new Set())
    fetchOrders()
  }

  return (
    <div>
      <PageHeader title="TikTok Shop" subtitle="Tarik order dari TikTok & jadikan pesanan utama" />

      {/* Stat */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Orders (Synced)</div>
          <div className="stat-card-value" style={{ color: '#cc7030' }}>{orderTotal}</div>
          <div className="stat-card-sub">Order tersimpan dari TikTok</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Shop Terkoneksi</div>
          <div
            className="stat-card-value"
            style={{ color: activeShop && !isTokenExpired(activeShop) ? '#16a34a' : '#ef4444' }}
          >
            {activeShop ? (isTokenExpired(activeShop) ? 'Expired' : 'Aktif') : 'Tidak Ada'}
          </div>
          <div className="stat-card-sub">{activeShop?.shop_name || 'Hubungi Owner untuk koneksi'}</div>
        </div>
      </div>

      {/* Sync Controls */}
      <div className="section-card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', marginBottom: '0.75rem' }}>
          Sinkronisasi Pesanan
        </h2>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>Start:</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((d) => ({ ...d, start: e.target.value }))}
            style={{
              padding: '0.4rem 0.6rem',
              border: '1px solid var(--input-border)',
              borderRadius: '0.375rem',
              fontSize: '0.8rem',
              background: 'var(--surface)',
              color: 'var(--neutral-800)'
            }}
          />
          <label style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>End:</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((d) => ({ ...d, end: e.target.value }))}
            style={{
              padding: '0.4rem 0.6rem',
              border: '1px solid var(--input-border)',
              borderRadius: '0.375rem',
              fontSize: '0.8rem',
              background: 'var(--surface)',
              color: 'var(--neutral-800)'
            }}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', fontStyle: 'italic' }}>
            (kosongkan untuk sync semua order)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleSyncOrders}
            disabled={syncing !== null || !activeShop}
            title="Ambil order terbaru dari TikTok (belum jadi pesanan)"
            style={{
              padding: '0.5rem 1rem',
              background: syncing === 'orders' || !activeShop ? 'var(--neutral-200)' : 'var(--neutral-100)',
              color: syncing === 'orders' || !activeShop ? 'var(--neutral-400)' : 'var(--neutral-700)',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: syncing !== null || !activeShop ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '0.15rem'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {syncing === 'orders' ? (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <RefreshCw size={14} />
              )}
              Sync Orders
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: '400', color: 'var(--neutral-500)', lineHeight: 1.3 }}>
              Ambil order terbaru dari TikTok (belum jadi pesanan)
            </span>
          </button>
          <button
            onClick={handleLinkToMain}
            disabled={syncing !== null || !activeShop}
            title="Ubah order yang sudah dibayar jadi pesanan utama"
            style={{
              padding: '0.5rem 1rem',
              background: syncing === 'orders_backfill' || !activeShop ? 'var(--neutral-200)' : '#dbeafe',
              color: syncing === 'orders_backfill' || !activeShop ? 'var(--neutral-400)' : '#1e40af',
              border: '1px solid #bfdbfe',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: syncing !== null || !activeShop ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '0.15rem'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {syncing === 'orders_backfill' ? (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Link2 size={14} />
              )}
              {selected.size > 0 ? `Link Terpilih (${selected.size})` : 'Link to Main Orders'}
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: '400', color: 'var(--neutral-500)', lineHeight: 1.3 }}>
              {selected.size > 0 ? 'Proses hanya order yang dicentang' : 'Ubah order yang sudah dibayar jadi pesanan utama'}
            </span>
          </button>
        </div>

        {syncResult && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.5rem 0.75rem',
              background: syncResult.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${syncResult.type === 'success' ? '#86efac' : '#fecaca'}`,
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
              color: syncResult.type === 'success' ? '#166534' : '#991b1b',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {syncResult.type === 'error' && (
              <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
            )}
            {syncResult.text.includes('(36009004)') ? (
              <>
                <strong>Error shop_id invalid</strong> — TikTok butuh re-authorization.
                <br />
                Minta Owner untuk klik <strong>Re-authorize</strong> di halaman TikTok Shop Owner.
              </>
            ) : (
              syncResult.text
            )}
          </div>
        )}
      </div>

      {/* Orders Table */}
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
            background: 'var(--neutral-100)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ShoppingBag size={16} />
          <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>
            Synced Orders
          </h2>
        </div>

        {orders.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <ShoppingBag size={24} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.85rem' }}>Belum ada order tersync. Klik "Sync Orders" untuk import.</p>
          </div>
        ) : (
          <>
            <div
              style={{
                padding: '0.75rem 1.25rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                alignItems: 'center',
                background: 'var(--neutral-50)'
              }}
            >
              <select
                value={filterStatus}
                onChange={async (e) => {
                  const v = e.target.value
                  setFilterStatus(v)
                  setOrderPage(0)
                  await fetchOrders(0, v, filterPayment)
                }}
                style={{
                  padding: '0.35rem 0.6rem',
                  border: '1px solid var(--input-border)',
                  borderRadius: '0.375rem',
                  fontSize: '0.8rem',
                  background: 'var(--surface)',
                  color: 'var(--neutral-800)',
                  cursor: 'pointer'
                }}
              >
                <option value="">Status: Semua</option>
                <option value="COMPLETED">Completed</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Dibatalkan</option>
              </select>
              <select
                value={filterPayment}
                onChange={async (e) => {
                  const v = e.target.value
                  setFilterPayment(v)
                  setOrderPage(0)
                  await fetchOrders(0, filterStatus, v)
                }}
                style={{
                  padding: '0.35rem 0.6rem',
                  border: '1px solid var(--input-border)',
                  borderRadius: '0.375rem',
                  fontSize: '0.8rem',
                  background: 'var(--surface)',
                  color: 'var(--neutral-800)',
                  cursor: 'pointer'
                }}
              >
                <option value="">Payment: Semua</option>
                <option value="PAID">Lunas</option>
                <option value="CANCELLED">Dibatalkan</option>
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Info size={12} />
                {orderTotal} order
              </span>
            </div>

            {/* Mobile: card list */}
            <div className="mobile-only">
              {loading ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
              ) : (
                <MobileCards items={orders} keyOf={(o) => o.id} renderCard={(o) => (
                  <div className="mobile-card">
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Order</span>
                      <span className="mobile-card-value">{o.order_number ?? o.tiktok_order_id ?? o.id.slice(0, 8)}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Status</span>
                      <span className="mobile-card-value">{o.order_status ?? o.status}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Total</span>
                      <span className="mobile-card-value">{formatRp(Number(o.total_amount || 0))}</span>
                    </div>
                  </div>
                )} />
              )}
            </div>
            <div className="data-table desktop-only">
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>
                        <input
                          type="checkbox"
                          checked={
                            orders.filter((o) => o.payment_status === 'PAID').length > 0 &&
                            orders.filter((o) => o.payment_status === 'PAID').every((o) => selected.has(o.tiktok_order_id ?? ''))
                          }
                          onChange={toggleSelectAllPage}
                          title="Pilih semua order lunas di halaman ini"
                        />
                      </th>
                      <th>Order ID</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th>Total</th>
                      <th>Buyer</th>
                      <th>Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.has(o.tiktok_order_id ?? '')}
                            onChange={() => o.tiktok_order_id && toggleSelect(o.tiktok_order_id)}
                            disabled={o.payment_status !== 'PAID'}
                            title={o.payment_status === 'PAID' ? 'Pilih order ini untuk di-link' : 'Hanya order lunas yang bisa di-link'}
                          />
                        </td>
                        <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                          {o.tiktok_order_id?.slice(0, 16)}...
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              background: ['DELIVERED', 'COMPLETED'].includes(o.order_status ?? '') ? '#f0fdf4' : '#fef9c3',
                              color: ['DELIVERED', 'COMPLETED'].includes(o.order_status ?? '') ? '#166534' : '#854d0e'
                            }}
                          >
                            {o.order_status || '-'}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              background: o.payment_status === 'PAID' ? '#f0fdf4' : '#fef9c3',
                              color: o.payment_status === 'PAID' ? '#166534' : '#854d0e'
                            }}
                          >
                            {o.payment_status || '-'}
                          </span>
                        </td>
                        <td style={{ fontWeight: '700' }}>{formatRp(Number(o.total_amount || 0))}</td>
                        <td>{o.buyer_name || '-'}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
                          {o.order_date
                            ? new Date(o.order_date).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })
                            : new Date(o.created_at ?? '').toLocaleDateString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        <div style={{ padding: '0 1.25rem 1rem' }}>
          <Pagination
            currentPage={orderPage + 1}
            totalPages={orderPageCount}
            onPageChange={(p) => fetchOrders(p - 1)}
            pageSize={orderPageSize}
            onPageSizeChange={(s) => {
              setOrderPageSize(s)
              fetchOrders(0, filterStatus, filterPayment, s)
            }}
            totalItems={orderTotal}
            startIndex={orderTotal === 0 ? 0 : orderPage * orderPageSize + 1}
            endIndex={Math.min((orderPage + 1) * orderPageSize, orderTotal)}
          />
        </div>
      </div>
    </div>
  )
}
