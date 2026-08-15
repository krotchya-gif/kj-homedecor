'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import MobileCards from '@/components/ui/MobileCards'
import Pagination from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/Toast'
import { formatRp } from '@/lib/utils'
import {
  Store,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Loader2,
  Link2,
  Info,
  ShoppingBag
} from 'lucide-react'

// ============================================================
// OWNER → SHOPEE (sesi 55) — mirror TikTok Shop:
// multi-shop (Add Shop / Authorize / Re-auth / Delete / Tanggal Mulai Sync),
// stat cards (Total Order, Total Settlement, Settlement per Bulan, Shop Terkoneksi),
// sync controls (date range + Sync Orders + Sync Settlement + Link to Main Orders),
// tabel order (filter + pagination), tabel Settlement/Pencairan Dana per order.
// Terminologi: "escrow" (internal DB) ditampilkan sebagai "Settlement / Pencairan Dana".
// ============================================================

interface ShopeeSetting {
  id: string
  partner_id: string
  partner_key: string
  shop_id: string | null
  shop_name: string | null
  seller_name: string | null
  is_active: boolean
  access_token: string | null
  token_expires_at: string | null
  sync_start_date?: string | null
}

interface ShopeeOrder {
  id: string
  order_sn: string
  order_status: string | null
  payment_status: string | null
  total_amount: number
  escrow_amount: number
  commission_fee: number
  transaction_fee: number
  service_fee: number
  shipping_amount: number
  buyer_name: string | null
  is_synced: boolean
  escrow_release_time: string | null
  order_date: string | null
  created_at: string
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

export default function OwnerShopeePage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<ShopeeSetting[]>([])
  const [orders, setOrders] = useState<ShopeeOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  // Filter + pagination order
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [orderPage, setOrderPage] = useState(0)
  const [orderPageSize, setOrderPageSize] = useState(10)
  const [orderTotal, setOrderTotal] = useState(0)
  // Modal tambah toko
  const [showAddShop, setShowAddShop] = useState(false)
  const [shopForm, setShopForm] = useState({ partner_id: '', partner_key: '', shop_name: '' })
  const [savingShop, setSavingShop] = useState(false)
  const [syncResult, setSyncResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const supabase = createClient()

  const activeShop = settings.find((s) => s.is_active)
  const orderPageCount = Math.max(1, Math.ceil(orderTotal / orderPageSize))

  function isTokenExpired(s?: ShopeeSetting) {
    if (!s?.token_expires_at) return true
    return new Date(s.token_expires_at).getTime() < Date.now()
  }

  async function fetchData() {
    setLoading(true)
    const [settingsRes, ordersRes, totalRes] = await Promise.all([
      supabase
        .from('shopee_shop_settings')
        .select('id, partner_id, partner_key, shop_id, shop_name, seller_name, is_active, access_token, token_expires_at, sync_start_date')
        .order('created_at', { ascending: true }),
      orderQuery(),
      orderCountQuery()
    ])
    setSettings((settingsRes.data as ShopeeSetting[]) ?? [])
    setOrders((ordersRes.data as ShopeeOrder[]) ?? [])
    setOrderTotal(totalRes.count ?? 0)
    setLoading(false)
  }

  function orderQuery() {
    let q = supabase.from('shopee_shop_orders').select('*')
    if (filterStatus) q = q.eq('order_status', filterStatus)
    if (filterPayment) q = q.eq('payment_status', filterPayment)
    return q.order('created_at', { ascending: false }).range(orderPage * orderPageSize, (orderPage + 1) * orderPageSize - 1)
  }

  function orderCountQuery() {
    let q = supabase.from('shopee_shop_orders').select('*', { count: 'exact', head: true })
    if (filterStatus) q = q.eq('order_status', filterStatus)
    if (filterPayment) q = q.eq('payment_status', filterPayment)
    return q
  }

  useEffect(() => {
    fetchData()
    const qs = new URLSearchParams(window.location.search)
    if (qs.get('success') === 'connected') toast('success', 'Shopee berhasil terhubung!')
    else if (qs.get('error')) toast('error', 'Gagal terhubung: ' + qs.get('error'))
    if (qs.get('success') || qs.get('error')) window.history.replaceState({}, '', '/owner/shopee')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- CRUD toko ----

  async function addShop(e: React.FormEvent) {
    e.preventDefault()
    setSavingShop(true)
    const res = await fetch('/api/shopee/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shopForm)
    })
    const json = await res.json().catch(() => ({}))
    setSavingShop(false)
    if (!res.ok) {
      toast('error', json.error ?? 'Gagal simpan kredensial')
      return
    }
    toast('success', 'Toko Shopee ditambahkan — lanjutkan dengan Authorize')
    setShowAddShop(false)
    setShopForm({ partner_id: '', partner_key: '', shop_name: '' })
    fetchData()
  }

  async function authorize(shopId: string) {
    setBusy(`auth:${shopId}`)
    try {
      const res = await fetch('/api/shopee/auth/reauthorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shopId })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.oauth_url) {
        toast('error', json.error ?? 'Gagal membuat link authorize')
        return
      }
      window.open(json.oauth_url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast('error', String(err))
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete(shopId: string) {
    if (!confirm('Hapus toko Shopee ini? Data orders & settlement tetap tersimpan.')) return
    const { error } = await supabase.from('shopee_shop_settings').delete().eq('id', shopId)
    if (error) { toast('error', 'Gagal hapus toko: ' + error.message); return }
    toast('success', 'Toko Shopee dihapus')
    fetchData()
  }

  async function handleSyncStartDate(shopId: string, value: string) {
    if (!value) { toast('warning', 'Pilih tanggal dahulu'); return }
    const { error } = await supabase.from('shopee_shop_settings').update({ sync_start_date: value }).eq('id', shopId)
    if (error) { toast('error', 'Gagal simpan tanggal mulai sync: ' + error.message); return }
    toast('success', `Tanggal mulai sync disimpan (${value}) — data sebelum tanggal ini tidak ikut sync`)
    fetchData()
  }

  // ---- Sync ----

  async function runSync(action: string) {
    setBusy(action)
    setSyncResult(null)
    const body: Record<string, unknown> = {}
    if (activeShop) body.shop_id = activeShop.id
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
        fetchData()
      }
    } catch (err) {
      toast('error', String(err))
    } finally {
      setBusy(null)
    }
  }

  // ---- Settlement (Pencairan Dana) ----

  async function catatSettlement(orderSn: string) {
    setBusy(`settle:${orderSn}`)
    const {
      data: { user }
    } = await supabase.auth.getUser()
    const { error } = await supabase.rpc('process_shopee_escrow_atomic', {
      p_order_sn: orderSn,
      p_actor: user?.id ?? null
    })
    setBusy(null)
    if (error) {
      toast('error', 'Gagal catat settlement: ' + error.message)
      return
    }
    toast('success', `Settlement ${orderSn} dicatat (Dr E Wallet Shopee / Cr Piutang + fee)`)
    fetchData()
  }

  // ---- Statistik ----

  const escrowRows = orders.filter((o) => o.escrow_amount > 0)
  const totalEscrow = escrowRows.reduce((s, o) => s + o.escrow_amount, 0)
  const totalFees = escrowRows.reduce(
    (s, o) => s + o.commission_fee + o.transaction_fee + o.service_fee + o.shipping_amount,
    0
  )
  const totalUnposted = escrowRows.filter((o) => !o.is_synced).reduce((s, o) => s + o.escrow_amount, 0)

  // Settlement per bulan (dari escrow_release_time) — 6 bulan terakhir
  const monthlyMap = new Map<string, { total: number; count: number }>()
  for (const o of escrowRows) {
    if (!o.escrow_release_time) continue
    const d = new Date(o.escrow_release_time)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = monthlyMap.get(key) ?? { total: 0, count: 0 }
    cur.total += o.escrow_amount
    cur.count += 1
    monthlyMap.set(key, cur)
  }
  const monthlyStats = [...monthlyMap.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 6)
    .map(([month, v]) => ({
      month: new Date(month + '-01').toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
      total: v.total,
      count: v.count
    }))

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: 400 }}>
        <Loader2 size={28} className="spin" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Shopee Seller" subtitle="Integrasi Shopee — Order, Settlement (Pencairan Dana), Rekonsiliasi" />

      {/* Stat cards */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Orders (Synced)</div>
          <div className="stat-card-value" style={{ color: '#cc7030' }}>{orderTotal}</div>
          <div className="stat-card-sub">Order tersimpan dari Shopee</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Settlement (masuk Shopee Pay)</div>
          <div className="stat-card-value" style={{ color: '#2563eb' }}>{formatRp(totalEscrow)}</div>
          <div className="stat-card-sub">Fee potongan {formatRp(totalFees)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Settlement per Bulan</div>
          <div className="stat-card-value" style={{ color: '#16a34a', fontSize: '1rem' }}>
            {monthlyStats.length > 0 ? formatRp(monthlyStats[0].total) : '—'}
          </div>
          <div className="stat-card-sub" style={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
            {monthlyStats.map((m) => (
              <div key={m.month} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span>{m.month}</span>
                <span style={{ fontWeight: '700' }}>{formatRp(m.total)} ({m.count})</span>
              </div>
            ))}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Shop Terkoneksi</div>
          <div className="stat-card-value" style={{ color: activeShop && !isTokenExpired(activeShop) ? '#16a34a' : '#ef4444' }}>
            {activeShop ? (isTokenExpired(activeShop) ? 'Expired' : 'Aktif') : 'Tidak Ada'}
          </div>
          <div className="stat-card-sub">{activeShop?.seller_name || activeShop?.shop_name || 'Hubungi Owner untuk koneksi'}</div>
        </div>
      </div>

      {/* Daftar toko (multi-shop) */}
      <div className="section-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>
            <Store size={14} style={{ display: 'inline', marginRight: '0.375rem', verticalAlign: 'middle' }} />
            Toko Shopee ({settings.length})
          </h2>
          <button
            onClick={() => setShowAddShop(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.4rem 0.9rem', background: '#ee4d2d', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            <Plus size={14} /> Tambah Toko
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {settings.length === 0 && (
            <p style={{ fontSize: '0.85rem', color: 'var(--neutral-500)' }}>
              Belum ada toko — klik "Tambah Toko" lalu isi Partner ID/Key dari open.shopee.com, kemudian Authorize.
            </p>
          )}
          {settings.map((s) => {
            const expired = isTokenExpired(s)
            return (
              <div
                key={s.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', background: s.is_active ? '#faf5ef' : 'var(--neutral-100)', borderRadius: '0.5rem', border: s.is_active ? '1px solid #f0dcc0' : '1px solid #e5e7eb', flexWrap: 'wrap', gap: '0.5rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: expired ? '#ef4444' : s.is_active ? '#16a34a' : 'var(--input-border)', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--neutral-700)' }}>
                      {s.seller_name || s.shop_name || 'Unnamed Shop'}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                      {s.shop_id && <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>Shop ID: {s.shop_id}</span>}
                      {expired && (
                        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '500', background: '#fef2f2', padding: '0.1rem 0.4rem', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Clock size={10} /> Token expired
                        </span>
                      )}
                      {!expired && s.is_active && (
                        <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '500', background: '#f0fdf4', padding: '0.1rem 0.4rem', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <CheckCircle2 size={10} /> Siap sync
                        </span>
                      )}
                    </div>
                    {/* Tanggal Mulai Sync (Wave 2) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem' }}>
                      <Calendar size={12} style={{ color: 'var(--neutral-500)', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.72rem', color: 'var(--neutral-600)', whiteSpace: 'nowrap' }}>Sync mulai:</span>
                      <input
                        type="date"
                        value={s.sync_start_date?.slice(0, 10) ?? ''}
                        onChange={(e) => handleSyncStartDate(s.id, e.target.value)}
                        title="Tanggal mulai sync — data sebelum tanggal ini (sudah diinput manual/saldo awal) TIDAK ikut tersinkronkan"
                        style={{ padding: '0.2rem 0.4rem', border: '1px solid var(--input-border)', borderRadius: '0.375rem', fontSize: '0.72rem', background: 'var(--surface)', color: 'var(--neutral-800)' }}
                      />
                      {s.sync_start_date && (
                        <span style={{ fontSize: '0.68rem', color: '#92400e', background: '#fef3c7', padding: '0.1rem 0.4rem', borderRadius: '999px' }}>
                          Order/settlement sebelum {s.sync_start_date.slice(0, 10)} di-skip
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  <button
                    onClick={() => authorize(s.id)}
                    disabled={!!busy}
                    style={{ padding: '0.35rem 0.65rem', background: '#ee4d2d', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <RefreshCw size={12} />
                    {s.is_active ? 'Re-authorize' : 'Authorize'}
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    title="Hapus toko"
                    style={{ padding: '0.35rem 0.5rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', fontSize: '0.75rem', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sync controls */}
      <div className="section-card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', marginBottom: '0.75rem' }}>
          Sinkronisasi
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
          <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', fontStyle: 'italic' }}>(kosongkan = pakai Tanggal Mulai Sync / default)</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => runSync('sync-orders')} disabled={!!busy} style={{ padding: '0.625rem 1.25rem', background: '#ee4d2d', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: busy ? 'not-allowed' : 'pointer' }}>
            {busy === 'sync-orders' ? 'Menyinkronkan...' : '🔄 Sync Orders'}
          </button>
          <button onClick={() => runSync('sync-escrow')} disabled={!!busy} style={{ padding: '0.625rem 1.25rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: busy ? 'not-allowed' : 'pointer' }}>
            {busy === 'sync-escrow' ? 'Menyinkronkan...' : '💰 Sync Settlement (Pencairan Dana)'}
          </button>
          <button onClick={() => runSync('sync-to-main-orders')} disabled={!!busy} style={{ padding: '0.625rem 1.25rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: busy ? 'not-allowed' : 'pointer' }}>
            {busy === 'sync-to-main-orders' ? 'Memproses...' : '📦 Link ke Main Orders'}
          </button>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Info size={12} />
          Settlement = uang yang ditahan Shopee (escrow), dicairkan setelah order selesai — fee potongan dicatat otomatis ke pembukuan.
        </p>
        {syncResult && (
          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: syncResult.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${syncResult.type === 'success' ? '#86efac' : '#fecaca'}`, borderRadius: '0.5rem', fontSize: '0.8rem', color: syncResult.type === 'success' ? '#166534' : '#991b1b', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {syncResult.text}
          </div>
        )}
      </div>

      {/* Tabel Orders */}
      <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: 'var(--neutral-100)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShoppingBag size={16} />
          <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>Synced Orders</h2>
        </div>
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--neutral-50)' }}>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setOrderPage(0); }}
            style={{ padding: '0.35rem 0.6rem', border: '1px solid var(--input-border)', borderRadius: '0.375rem', fontSize: '0.8rem', background: 'var(--surface)', color: 'var(--neutral-800)', cursor: 'pointer' }}
          >
            <option value="">Status: Semua</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filterPayment}
            onChange={(e) => { setFilterPayment(e.target.value); setOrderPage(0); }}
            style={{ padding: '0.35rem 0.6rem', border: '1px solid var(--input-border)', borderRadius: '0.375rem', fontSize: '0.8rem', background: 'var(--surface)', color: 'var(--neutral-800)', cursor: 'pointer' }}
          >
            <option value="">Payment: Semua</option>
            <option value="paid">Lunas</option>
            <option value="pending">Belum</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
          <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Info size={12} /> {orderTotal} order
          </span>
        </div>
        <div className="mobile-only">
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
              <div className="mobile-card-row">
                <span className="mobile-card-label">Settlement</span>
                <span className="mobile-card-value" style={{ color: o.escrow_amount > 0 ? '#16a34a' : 'inherit' }}>
                  {o.escrow_amount > 0 ? formatRp(o.escrow_amount) : '—'}
                </span>
              </div>
            </div>
          )} />
        </div>
        <div className="data-table desktop-only">
          {orders.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
              <ShoppingBag size={24} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
              <p style={{ fontSize: '0.85rem' }}>Belum ada order tersync. Klik "Sync Orders" untuk import.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Order SN</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Settlement</th>
                  <th>Pembeli</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{o.order_sn}</td>
                    <td>
                      <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', background: o.order_status === 'CANCELLED' ? '#fef2f2' : o.payment_status === 'paid' ? '#f0fdf4' : '#fef9c3', color: o.order_status === 'CANCELLED' ? '#dc2626' : o.payment_status === 'paid' ? '#166534' : '#854d0e' }}>
                        {STATUS_LABEL[o.order_status ?? ''] ?? o.order_status ?? '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', background: o.payment_status === 'paid' ? '#f0fdf4' : '#fef9c3', color: o.payment_status === 'paid' ? '#166534' : '#854d0e' }}>
                        {o.payment_status || '—'}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700' }}>{formatRp(o.total_amount ?? 0)}</td>
                    <td style={{ color: o.escrow_amount > 0 ? '#16a34a' : 'var(--neutral-400)', fontWeight: o.escrow_amount > 0 ? '600' : '400' }}>
                      {o.escrow_amount > 0 ? formatRp(o.escrow_amount) : '—'}
                    </td>
                    <td>{o.buyer_name || '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
                      {(o.order_date || o.created_at) ? new Date(o.order_date || o.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
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
            onPageChange={(p) => { setOrderPage(p - 1); fetchData(); }}
            pageSize={orderPageSize}
            onPageSizeChange={(s) => { setOrderPageSize(s); setOrderPage(0); fetchData(); }}
            totalItems={orderTotal}
            startIndex={orderTotal === 0 ? 0 : orderPage * orderPageSize + 1}
            endIndex={Math.min((orderPage + 1) * orderPageSize, orderTotal)}
          />
        </div>
      </div>

      {/* Tabel Settlement / Pencairan Dana */}
      <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: 'var(--neutral-100)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Info size={16} />
          <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>Settlement / Pencairan Dana</h2>
          <span style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', fontStyle: 'italic' }}>
            Uang ditahan Shopee, dicairkan setelah order selesai
          </span>
        </div>
        <div className="data-table">
          {escrowRows.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
              <p style={{ fontSize: '0.85rem' }}>Belum ada settlement — klik "Sync Settlement (Pencairan Dana)"</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Order SN</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Net Cair</th>
                  <th style={{ textAlign: 'right' }}>Komisi</th>
                  <th style={{ textAlign: 'right' }}>Txn Fee</th>
                  <th style={{ textAlign: 'right' }}>Service</th>
                  <th style={{ textAlign: 'right' }}>Ongkir</th>
                  <th>Rilis</th>
                  <th>Jurnal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {escrowRows.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{o.order_sn}</td>
                    <td style={{ textAlign: 'right' }}>{formatRp(o.total_amount ?? 0)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>{formatRp(o.escrow_amount ?? 0)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--neutral-600)' }}>{formatRp(o.commission_fee ?? 0)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--neutral-600)' }}>{formatRp(o.transaction_fee ?? 0)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--neutral-600)' }}>{formatRp(o.service_fee ?? 0)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--neutral-600)' }}>{formatRp(o.shipping_amount ?? 0)}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                      {o.escrow_release_time ? new Date(o.escrow_release_time).toLocaleDateString('id-ID') : '—'}
                    </td>
                    <td>{o.is_synced ? '✅' : '⏳'}</td>
                    <td>
                      {!o.is_synced && (
                        <button
                          onClick={() => catatSettlement(o.order_sn)}
                          disabled={busy === `settle:${o.order_sn}`}
                          style={{ padding: '0.25rem 0.75rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                        >
                          {busy === `settle:${o.order_sn}` ? 'Memproses...' : 'Catat'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal tambah toko */}
      <Modal open={showAddShop} onClose={() => setShowAddShop(false)} maxWidth={440} padding="1.5rem" zIndex={300}>
        <h2 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--neutral-800)', marginBottom: '0.5rem' }}>Tambah Toko Shopee</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', marginBottom: '1rem' }}>
          Isi kredensial Shopee Open Platform — setelah disimpan, klik Authorize pada kartu toko untuk menghubungkan akun.
        </p>
        <form onSubmit={addShop} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input required placeholder="Partner ID (dari Shopee Open Platform)" value={shopForm.partner_id} onChange={(e) => setShopForm((f) => ({ ...f, partner_id: e.target.value }))} style={{ padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }} />
          <div style={{ position: 'relative' }}>
            <input required type={showKey ? 'text' : 'password'} placeholder="Partner Key (rahasia)" value={shopForm.partner_key} onChange={(e) => setShopForm((f) => ({ ...f, partner_key: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }} />
            <button type="button" onClick={() => setShowKey((v) => !v)} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--neutral-600)' }}>
              {showKey ? 'Sembunyi' : 'Lihat'}
            </button>
          </div>
          <input placeholder="Nama toko (opsional)" value={shopForm.shop_name} onChange={(e) => setShopForm((f) => ({ ...f, shop_name: e.target.value }))} style={{ padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }} />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" onClick={() => setShowAddShop(false)} style={{ flex: 1, padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: 'var(--surface)', cursor: 'pointer', fontWeight: '600' }}>Batal</button>
            <button type="submit" disabled={savingShop} style={{ flex: 1, padding: '0.625rem', background: '#ee4d2d', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '700', cursor: savingShop ? 'not-allowed' : 'pointer' }}>
              {savingShop ? 'Menyimpan...' : 'Simpan & Lanjut Authorize'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
