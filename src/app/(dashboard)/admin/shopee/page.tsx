'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import MobileCards from '@/components/ui/MobileCards'
import Pagination from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/Toast'
import { formatRp } from '@/lib/utils'
import { Loader2, Info, ShoppingBag, Link2 } from 'lucide-react'

// ============================================================
// ADMIN → SHOPEE (sesi 55) — mirror admin/tiktok:
// stat cards, sync controls (date range), tabel order (filter + pagination),
// checkbox pilih-per-order utk Link ke Main Orders (Wave 3).
// ============================================================

interface ShopeeOrder {
  id: string
  order_sn: string
  order_status: string | null
  payment_status: string | null
  total_amount: number
  escrow_amount: number
  buyer_name: string | null
  is_synced: boolean
  order_date: string | null
  created_at: string
}

interface ShopeeSetting {
  id: string
  shop_name: string | null
  seller_name: string | null
  is_active: boolean
  token_expires_at: string | null
  sync_start_date?: string | null
}

const STATUS_LABEL: Record<string, string> = {
  UNPAID: 'Belum Bayar',
  READY_TO_SHIP: 'Siap Kirim',
  PROCESSED: 'Diproses',
  SHIPPED: 'Terkirim',
  COMPLETED: 'Selesai',
  CANCELLED: 'Batal',
  IN_CANCEL: 'Pembatalan',
  INVOICE_PENDING: 'Menunggu Invoice'
}

export default function AdminShopeePage() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<ShopeeOrder[]>([])
  const [settings, setSettings] = useState<ShopeeSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [orderPage, setOrderPage] = useState(0)
  const [orderPageSize, setOrderPageSize] = useState(10)
  const [orderTotal, setOrderTotal] = useState(0)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [syncResult, setSyncResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  // Wave 3: pilih per-order utk Link ke Main Orders (Set order_sn)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const supabase = createClient()

  const activeShop = settings.find((s) => s.is_active)
  const orderPageCount = Math.max(1, Math.ceil(orderTotal / orderPageSize))

  function isTokenExpired(s?: ShopeeSetting) {
    if (!s?.token_expires_at) return true
    return new Date(s.token_expires_at).getTime() < Date.now()
  }

  async function fetchOrders(page = 0, statusFilter?: string, paymentFilter?: string, limit?: number) {
    setLoading(true)
    const sf = statusFilter ?? filterStatus
    const pf = paymentFilter ?? filterPayment
    const ps = limit ?? orderPageSize

    let orderQuery = supabase.from('shopee_shop_orders').select('*')
    if (sf) orderQuery = orderQuery.eq('order_status', sf)
    if (pf) orderQuery = orderQuery.eq('payment_status', pf)
    orderQuery = orderQuery
      .order('created_at', { ascending: false })
      .range(page * ps, (page + 1) * ps - 1)

    let countQuery = supabase.from('shopee_shop_orders').select('*', { count: 'exact', head: true })
    if (sf) countQuery = countQuery.eq('order_status', sf)
    if (pf) countQuery = countQuery.eq('payment_status', pf)

    const [settingsRes, ordersRes, totalRes] = await Promise.all([
      supabase
        .from('shopee_shop_settings')
        .select('id, shop_name, seller_name, is_active, token_expires_at, sync_start_date'),
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

  function toggleSelect(sn: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(sn)) next.delete(sn)
      else next.add(sn)
      return next
    })
  }

  function toggleSelectAllPage() {
    const pagePaid = orders.filter((o) => o.payment_status === 'paid')
    const allSelected = pagePaid.length > 0 && pagePaid.every((o) => selected.has(o.order_sn))
    setSelected((prev) => {
      const next = new Set(prev)
      for (const o of pagePaid) {
        if (allSelected) next.delete(o.order_sn)
        else next.add(o.order_sn)
      }
      return next
    })
  }

  async function runSync(action: string) {
    setBusy(action)
    setSyncResult(null)
    const body: Record<string, unknown> = {}
    if (activeShop) body.shop_id = activeShop.id
    if (action === 'sync-to-main-orders' && selected.size > 0) body.order_ids = Array.from(selected)
    if (dateRange.start) body.time_from = Math.floor(new Date(dateRange.start).getTime() / 1000)
    if (dateRange.end) body.time_to = Math.floor(new Date(dateRange.end).getTime() / 1000)
    try {
      const res = await fetch(`/api/shopee/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSyncResult({ type: 'error', text: json.error ?? `Gagal ${action}` })
        toast('error', json.error ?? `Gagal ${action}`)
      } else {
        setSyncResult({ type: 'success', text: json.message ?? `${action} selesai` })
        toast('success', json.message ?? `${action} selesai`)
        setSelected(new Set())
        fetchOrders()
      }
    } catch (err) {
      toast('error', String(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <PageHeader title="Shopee Seller" subtitle="Sync order Shopee → main orders (pembayaran platform otomatis terverifikasi)" />

      {/* Stat */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Orders (Synced)</div>
          <div className="stat-card-value" style={{ color: '#cc7030' }}>{orderTotal}</div>
          <div className="stat-card-sub">Order tersimpan dari Shopee</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Shop Terkoneksi</div>
          <div className="stat-card-value" style={{ color: activeShop && !isTokenExpired(activeShop) ? '#16a34a' : '#ef4444' }}>
            {activeShop ? (isTokenExpired(activeShop) ? 'Expired' : 'Aktif') : 'Tidak Ada'}
          </div>
          <div className="stat-card-sub">{activeShop?.seller_name || activeShop?.shop_name || 'Hubungi Owner untuk koneksi'}</div>
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
            style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--input-border)', borderRadius: '0.375rem', fontSize: '0.8rem', background: 'var(--surface)', color: 'var(--neutral-800)' }}
          />
          <label style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>End:</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((d) => ({ ...d, end: e.target.value }))}
            style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--input-border)', borderRadius: '0.375rem', fontSize: '0.8rem', background: 'var(--surface)', color: 'var(--neutral-800)' }}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', fontStyle: 'italic' }}>
            (kosongkan = pakai Tanggal Mulai Sync / default)
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => runSync('sync-orders')}
            disabled={!!busy}
            style={{ padding: '0.625rem 1.25rem', background: '#ee4d2d', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: busy ? 'not-allowed' : 'pointer' }}
          >
            {busy === 'sync-orders' ? 'Menyinkronkan...' : '🔄 Sync Orders'}
          </button>
          <button
            onClick={() => runSync('sync-escrow')}
            disabled={!!busy}
            style={{ padding: '0.625rem 1.25rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: busy ? 'not-allowed' : 'pointer' }}
          >
            {busy === 'sync-escrow' ? 'Menyinkronkan...' : '💰 Sync Settlement (Pencairan Dana)'}
          </button>
          <button
            onClick={() => runSync('sync-to-main-orders')}
            disabled={!!busy}
            style={{ padding: '0.625rem 1.25rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {busy === 'sync-to-main-orders' ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Memproses...
              </>
            ) : (
              <>
                <Link2 size={14} />
                {selected.size > 0 ? `Link Terpilih (${selected.size})` : 'Link ke Main Orders'}
              </>
            )}
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
            {syncResult.text}
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
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
          <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>Synced Orders</h2>
        </div>

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
            style={{ padding: '0.35rem 0.6rem', border: '1px solid var(--input-border)', borderRadius: '0.375rem', fontSize: '0.8rem', background: 'var(--surface)', color: 'var(--neutral-800)', cursor: 'pointer' }}
          >
            <option value="">Status: Semua</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filterPayment}
            onChange={async (e) => {
              const v = e.target.value
              setFilterPayment(v)
              setOrderPage(0)
              await fetchOrders(0, filterStatus, v)
            }}
            style={{ padding: '0.35rem 0.6rem', border: '1px solid var(--input-border)', borderRadius: '0.375rem', fontSize: '0.8rem', background: 'var(--surface)', color: 'var(--neutral-800)', cursor: 'pointer' }}
          >
            <option value="">Payment: Semua</option>
            <option value="paid">Lunas</option>
            <option value="pending">Belum</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
          <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Info size={12} />
            {orderTotal} order
          </span>
        </div>

        <div className="mobile-only">
          {loading ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
          ) : (
            <MobileCards items={orders} keyOf={(o) => o.id} renderCard={(o) => (
              <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Order</span>
                  <span className="mobile-card-value" style={{ fontFamily: 'monospace' }}>{o.order_sn}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Status</span>
                  <span className="mobile-card-value">{STATUS_LABEL[o.order_status ?? ''] ?? o.order_status ?? '—'}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Total</span>
                  <span className="mobile-card-value">{formatRp(o.total_amount ?? 0)}</span>
                </div>
              </div>
            )} />
          )}
        </div>
        <div className="data-table desktop-only">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
          ) : orders.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
              <ShoppingBag size={24} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
              <p style={{ fontSize: '0.85rem' }}>Belum ada order tersync. Klik "Sync Orders" untuk import.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={
                        orders.filter((o) => o.payment_status === 'paid').length > 0 &&
                        orders.filter((o) => o.payment_status === 'paid').every((o) => selected.has(o.order_sn))
                      }
                      onChange={toggleSelectAllPage}
                      title="Pilih semua order lunas di halaman ini"
                    />
                  </th>
                  <th>Order SN</th>
                  <th>Pembeli</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Settlement</th>
                  <th>Jurnal</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(o.order_sn)}
                        onChange={() => toggleSelect(o.order_sn)}
                        disabled={o.payment_status !== 'paid'}
                        title={o.payment_status === 'paid' ? 'Pilih order ini untuk di-link' : 'Hanya order lunas yang bisa di-link'}
                      />
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{o.order_sn}</td>
                    <td style={{ fontWeight: '500' }}>{o.buyer_name ?? '—'}</td>
                    <td>
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: o.order_status === 'CANCELLED' ? '#fef2f2' : o.payment_status === 'paid' ? '#d1fae5' : '#fef3c7',
                          color: o.order_status === 'CANCELLED' ? '#dc2626' : o.payment_status === 'paid' ? '#065f46' : '#92400e'
                        }}
                      >
                        {STATUS_LABEL[o.order_status ?? ''] ?? o.order_status ?? '—'}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: o.payment_status === 'paid' ? '#f0fdf4' : '#fef9c3',
                          color: o.payment_status === 'paid' ? '#166534' : '#854d0e'
                        }}
                      >
                        {o.payment_status || '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatRp(o.total_amount ?? 0)}</td>
                    <td style={{ textAlign: 'right', color: o.escrow_amount > 0 ? '#16a34a' : 'var(--neutral-400)', fontWeight: o.escrow_amount > 0 ? '600' : '400' }}>
                      {o.escrow_amount > 0 ? formatRp(o.escrow_amount) : '—'}
                    </td>
                    <td>{o.is_synced ? '✅' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
