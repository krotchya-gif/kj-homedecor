'use client'
import MobileCards from '@/components/ui/MobileCards'
import Pagination from '@/components/ui/Pagination'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  ShoppingBag,
  DollarSign,
  RefreshCw,
  Link2,
  Loader2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Info,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { formatRp } from '@/lib/utils'



interface TikTokSetting {
  id: string
  shop_name?: string
  seller_name?: string
  is_active?: boolean
  shop_cipher?: string
  access_token?: string
  token_expires_at?: string
  /** Wave 2: batas bawah sync — data sebelum tanggal ini tidak ikut disinkronkan. */
  sync_start_date?: string | null
}

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

interface TikTokStatement {
  id: string
  statement_id?: string
  statement_type?: string
  piutang_id?: string
  period?: string
  status?: string
  start_date?: string
  total_amount?: number
  revenue_amount?: number
  fee_amount?: number
  shipping_cost_amount?: number
  net_sales_amount?: number
  adjustment_amount?: number
}

export default function TikTokDashboardPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<TikTokSetting[]>([])
  const [orders, setOrders] = useState<TikTokOrder[]>([])
  const [statements, setStatements] = useState<TikTokStatement[]>([])
  const [loading, setLoading] = useState(true)
  const [orderPage, setOrderPage] = useState(0)
  const [orderTotal, setOrderTotal] = useState(0)
  const [orderPageSize, setOrderPageSize] = useState(10)
  const [stmtPage, setStmtPage] = useState(0)
  const [stmtTotal, setStmtTotal] = useState(0)
  const [stmtPageSize, setStmtPageSize] = useState(10)
  const [filterStmtStatus, setFilterStmtStatus] = useState('')
  const [salesByStatus, setSalesByStatus] = useState<Record<string, number>>({})
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [syncing, setSyncing] = useState<string | null>(null)
  const [monthlyStats, setMonthlyStats] = useState<{ month: string; total: number; count: number }[]>([])
  const [syncResult, setSyncResult] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showReauthConfirm, setShowReauthConfirm] = useState<string | null>(null)
  const [reauthLoading, setReauthLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    shop_name: '',
    app_key: '',
    app_secret: '',
    shop_cipher: ''
  })
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const supabase = createClient()

  const activeShop = settings.find((s) => s.is_active)

  useEffect(() => {
    fetchData()
  }, [])

  const orderPageCount = Math.ceil(orderTotal / orderPageSize)

  async function fetchData(
    page = 0,
    statusFilter?: string,
    paymentFilter?: string,
    limit?: number,
    stmtPageArg?: number,
    stmtStatusFilter?: string,
    stmtLimit?: number
  ) {
    setLoading(true)
    const sf = statusFilter ?? filterStatus
    const pf = paymentFilter ?? filterPayment
    const ps = limit ?? orderPageSize
    const sPage = stmtPageArg ?? stmtPage
    const sStatus = stmtStatusFilter ?? filterStmtStatus
    const sPs = stmtLimit ?? stmtPageSize

    let orderQuery = supabase.from('tiktok_shop_orders').select('*')
    if (sf) orderQuery = orderQuery.eq('order_status', sf)
    if (pf) orderQuery = orderQuery.eq('payment_status', pf)
    orderQuery = orderQuery
      .order('order_date', { ascending: false, nullsFirst: false })
      .range(page * ps, (page + 1) * ps - 1)

    let countQuery = supabase.from('tiktok_shop_orders').select('*', { count: 'exact', head: true })
    if (sf) countQuery = countQuery.eq('order_status', sf)
    if (pf) countQuery = countQuery.eq('payment_status', pf)

    let stmtQuery = supabase.from('tiktok_shop_statements').select('*')
    if (sStatus) stmtQuery = stmtQuery.eq('status', sStatus)
    stmtQuery = stmtQuery
      .order('created_at', { ascending: false })
      .range(sPage * sPs, (sPage + 1) * sPs - 1)

    let stmtCountQuery = supabase.from('tiktok_shop_statements').select('*', { count: 'exact', head: true })
    if (sStatus) stmtCountQuery = stmtCountQuery.eq('status', sStatus)

    const [settingsRes, ordersRes, totalRes, salesGroupRes, monthlyStatsRes, statementsRes, stmtTotalRes] =
      await Promise.all([
        // F-19 fix: app_secret & access_token TIDAK boleh ke browser — batasi kolom
        supabase
          .from('tiktok_shop_settings')
          .select('id, shop_name, is_active, seller_name, open_id, token_expires_at, shop_cipher, sync_start_date'),
        orderQuery,
        countQuery,
        // Fetch total_amount grouped by order_status
        supabase.from('tiktok_shop_orders').select('order_status, total_amount'),
        // Monthly settlement stats
        supabase.from('tiktok_shop_statements').select('start_date, total_amount'),
        stmtQuery,
        stmtCountQuery
      ])
    setSettings(settingsRes.data ?? [])
    setOrders(ordersRes.data ?? [])
    setOrderTotal(totalRes.count ?? 0)
    setOrderPage(page)
    setStatements(statementsRes.data ?? [])
    setStmtTotal(stmtTotalRes.count ?? 0)
    setStmtPage(sPage)

    // Group by order_status
    const grouped: Record<string, number> = {}
    const rows = salesGroupRes.data ?? []
    for (const r of rows) {
      const st = r.order_status || 'UNKNOWN'
      grouped[st] = (grouped[st] || 0) + Number(r.total_amount || 0)
    }
    setSalesByStatus(grouped)

    // Compute monthly stats
    const monthMap: Record<string, { total: number; count: number }> = {}
    for (const r of monthlyStatsRes.data ?? []) {
      if (!r.start_date) continue
      const month = r.start_date.slice(0, 7) // "YYYY-MM"
      if (!monthMap[month]) monthMap[month] = { total: 0, count: 0 }
      monthMap[month].total += Number(r.total_amount || 0)
      monthMap[month].count++
    }
    setMonthlyStats(
      Object.entries(monthMap)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 12)
        .map(([month, val]) => ({ month, ...val }))
    )
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/tiktok/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const json = await res.json()
      if (json.oauth_url) {
        window.location.href = json.oauth_url
      } else {
        setSyncResult({
          type: 'error',
          text: json.error || 'Gagal menyimpan settings'
        })
      }
    } catch (err) {
      setSyncResult({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    }
    setSaving(false)
  }

  async function handleReauthorize(shopId: string | null) {
    if (!shopId) return
    setReauthLoading(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/tiktok/auth/reauthorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shopId })
      })
      const json = await res.json()
      if (json.oauth_url) {
        setShowReauthConfirm(null)
        window.location.href = json.oauth_url
      } else {
        setSyncResult({
          type: 'error',
          text: json.error || 'Gagal mendapatkan OAuth URL'
        })
      }
    } catch (err) {
      setSyncResult({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    }
    setReauthLoading(false)
  }

  async function handleSync(type: 'orders' | 'finance') {
    setSyncing(type)
    setSyncResult(null)

    const res = await fetch(`/api/tiktok/sync-${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop_id: activeShop?.id,
        ...(dateRange.start ? { start_date: dateRange.start } : {}),
        ...(dateRange.end ? { end_date: dateRange.end } : {}),
        auto_create_piutang: type === 'finance'
      })
    })
    const json = await res.json()
    if (json.error) {
      setSyncResult({ type: 'error', text: json.error })
    } else {
      setSyncResult({ type: 'success', text: json.message || 'Sync selesai' })
    }
    setSyncing(null)
    fetchData()
  }

  async function handleBackfill(mode: 'piutang' | 'orders') {
    setSyncing(mode)
    setSyncResult(null)

    const res = await fetch(`/api/tiktok/${mode === 'piutang' ? 'create-piutang' : 'sync-to-main-orders'}`, {
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
      setSyncResult({ type: 'success', text: json.message || `${mode} selesai` })
    }
    setSyncing(null)
    fetchData()
  }

  async function handleDelete(shopId: string) {
    if (!confirm('Hapus TikTok Shop ini? Data orders & statements tetap tersimpan.')) return
    const { error } = await supabase.from('tiktok_shop_settings').delete().eq('id', shopId)
    if (error) { toast('error', 'Gagal hapus shop: ' + error.message); return }
    fetchData()
  }

  // Wave 2: simpan Tanggal Mulai Sync per-shop (batas bawah semua operasi sync)
  async function handleSyncStartDate(shopId: string, value: string) {
    if (!value) {
      toast('warning', 'Pilih tanggal dahulu')
      return
    }
    const { error } = await supabase.from('tiktok_shop_settings').update({ sync_start_date: value }).eq('id', shopId)
    if (error) { toast('error', 'Gagal simpan tanggal mulai sync: ' + error.message); return }
    toast('success', `Tanggal mulai sync disimpan (${value}) — data sebelum tanggal ini tidak ikut sync`)
    fetchData()
  }

  function isTokenExpired(shop: TikTokSetting): boolean {
    // F-19 fix: cek hanya token_expires_at (access_token tidak lagi dikirim ke browser)
    if (!shop.token_expires_at) return true
    return new Date(shop.token_expires_at) < new Date()
  }

  // 073 fix: total_amount = GROSS (pembayaran customer), revenue_amount = NET (masuk bank)
  const totalSettlements = statements.reduce((s, st) => s + Number(st.revenue_amount ?? (st.total_amount || 0)), 0)
  const totalFees = statements.reduce((s, st) => s + Number(st.fee_amount || 0), 0)
  const totalRevenues = statements.reduce((s, st) => s + Number(st.total_amount || 0), 0)
  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: 400 }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#cc7030' }} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="TikTok Shop" subtitle="Integrasi TikTok Shop — Order, Settlement, Rekonsiliasi" />
      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Orders (Synced)</div>
          <div className="stat-card-value" style={{ color: '#cc7030' }}>
            {orderTotal}
          </div>
          <div className="stat-card-sub" style={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
            {Object.entries(salesByStatus).map(([status, total]) => (
              <div key={status}>
                <span
                  style={{
                    color: status === 'CANCELLED' ? '#ef4444' : '#16a34a',
                    fontWeight: 500
                  }}
                >
                  {status}
                </span>
                : {formatRp(total)}
              </div>
            ))}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Settlements</div>
          <div className="stat-card-value" style={{ color: '#2563eb' }}>
            {statements.length}
          </div>
          <div className="stat-card-sub" style={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
            <div>{formatRp(totalSettlements)} masuk bank</div>
            <div style={{ color: 'var(--neutral-500)' }}>Revenue (gross): {formatRp(totalRevenues)}</div>
            <div style={{ color: '#dc2626' }}>
              Fee: {formatRp(totalFees)}
              {totalRevenues > 0 ? ` (${Math.round((totalFees / totalRevenues) * 100)}%)` : ''}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Settlement per Bulan</div>
          <div style={{ fontSize: '0.72rem', lineHeight: 1.5, maxHeight: 160, overflowY: 'auto' }}>
            {monthlyStats.slice(0, 6).map((m) => (
              <div key={m.month} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span style={{ color: 'var(--neutral-600)', fontWeight: 500, flexShrink: 0 }}>{m.month}</span>
                <span style={{ color: '#2563eb', textAlign: 'right', minWidth: 0, whiteSpace: 'nowrap' }}>
                  {formatRp(m.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Shop Terkoneksi</div>
          <div
            className="stat-card-value"
            style={{
              color: activeShop && !isTokenExpired(activeShop) ? '#16a34a' : '#ef4444'
            }}
          >
            {activeShop ? (isTokenExpired(activeShop) ? 'Expired' : 'Aktif') : 'Tidak Ada'}
          </div>
          <div className="stat-card-sub">{activeShop?.seller_name || activeShop?.shop_name || '-'}</div>
        </div>
      </div>
      {/* Shop Management */}
      {settings.length > 0 && (
        <div className="section-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}
          >
            <h2
              style={{
                fontSize: '0.9rem',
                fontWeight: '700',
                color: 'var(--neutral-700)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Link2 size={16} />
              Shop Terhubung
            </h2>
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                padding: '0.4rem 0.8rem',
                background: '#cc7030',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              + Add Shop
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {settings.map((s) => {
              const expired = isTokenExpired(s)
              const missingCipher = !s.shop_cipher
              return (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.75rem',
                    background: s.is_active ? '#faf5ef' : 'var(--neutral-100)',
                    borderRadius: '0.5rem',
                    border: s.is_active ? '1px solid #f0dcc0' : '1px solid #e5e7eb'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      flex: 1,
                      minWidth: 0
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: expired ? '#ef4444' : s.is_active ? '#16a34a' : 'var(--input-border)',
                        flexShrink: 0
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          color: 'var(--neutral-700)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {s.seller_name || s.shop_name || 'Unnamed Shop'}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          marginTop: '0.15rem'
                        }}
                      >
                        {expired && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: '#ef4444',
                              fontWeight: '500',
                              background: '#fef2f2',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '999px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem'
                            }}
                          >
                            <Clock size={10} /> Token expired
                          </span>
                        )}
                        {missingCipher && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: '#d97706',
                              fontWeight: '500',
                              background: '#fffbeb',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '999px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem'
                            }}
                          >
                            <AlertCircle size={10} /> Perlu re-authorize
                          </span>
                        )}
                        {s.shop_cipher && !expired && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: '#16a34a',
                              fontWeight: '500',
                              background: '#f0fdf4',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '999px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem'
                            }}
                          >
                            <CheckCircle2 size={10} /> Siap sync
                          </span>
                        )}
                      </div>
                      {/* Wave 2: Tanggal Mulai Sync — batas bawah semua operasi sync */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem' }}>
                        <Calendar size={12} style={{ color: 'var(--neutral-500)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.72rem', color: 'var(--neutral-600)', whiteSpace: 'nowrap' }}>
                          Sync mulai:
                        </span>
                        <input
                          type="date"
                          value={s.sync_start_date?.slice(0, 10) ?? ''}
                          onChange={(e) => handleSyncStartDate(s.id, e.target.value)}
                          title="Tanggal mulai sync — data sebelum tanggal ini (sudah diinput manual/saldo awal) TIDAK ikut tersinkronkan"
                          style={{
                            padding: '0.2rem 0.4rem',
                            border: '1px solid var(--input-border)',
                            borderRadius: '0.375rem',
                            fontSize: '0.72rem',
                            background: 'var(--surface)',
                            color: 'var(--neutral-800)'
                          }}
                        />
                        {s.sync_start_date && (
                          <span style={{ fontSize: '0.68rem', color: '#92400e', background: '#fef3c7', padding: '0.1rem 0.4rem', borderRadius: '999px' }}>
                            Order/statement sebelum {s.sync_start_date.slice(0, 10)} di-skip
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <button
                      onClick={() => setShowReauthConfirm(s.id)}
                      disabled={reauthLoading}
                      title="Re-authorize (refresh token & shop_cipher)"
                      style={{
                        padding: '0.35rem 0.65rem',
                        background: 'var(--neutral-100)',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        color: 'var(--neutral-700)'
                      }}
                    >
                      <RefreshCw size={12} />
                      Re-authorize
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      title="Hapus shop"
                      style={{
                        padding: '0.35rem 0.5rem',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {/* Sync Controls */}
      <div className="section-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem'
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
            Sync Controls
          </h2>
          {settings.length === 0 && (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                padding: '0.4rem 0.8rem',
                background: '#cc7030',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Link2 size={14} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
              Connect TikTok
            </button>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>Start:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((d) => ({ ...d, start: e.target.value }))}
              style={{
                padding: '0.4rem 0.6rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.8rem'
              }}
            />
            <label style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>End:</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((d) => ({ ...d, end: e.target.value }))}
              style={{
                padding: '0.4rem 0.6rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.8rem'
              }}
            />
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--neutral-400)',
                fontStyle: 'italic'
              }}
            >
              (kosongkan untuk sync semua order)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleSync('orders')}
            disabled={syncing !== null || !activeShop}
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
            title={!activeShop ? 'Tidak ada shop aktif' : 'Ambil order terbaru dari TikTok (belum jadi pesanan)'}
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
            onClick={() => handleSync('finance')}
            disabled={syncing !== null || !activeShop}
            style={{
              padding: '0.5rem 1rem',
              background: syncing === 'finance' || !activeShop ? 'var(--neutral-200)' : 'var(--neutral-100)',
              color: syncing === 'finance' || !activeShop ? 'var(--neutral-400)' : 'var(--neutral-700)',
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
            title={!activeShop ? 'Tidak ada shop aktif' : 'Ambil penarikan dana TikTok + catat piutang otomatis'}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {syncing === 'finance' ? (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <DollarSign size={14} />
              )}
              Sync Settlement
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: '400', color: 'var(--neutral-500)', lineHeight: 1.3 }}>
              Ambil penarikan dana TikTok + catat piutang otomatis
            </span>
          </button>
          <button
            onClick={() => handleBackfill('piutang')}
            disabled={syncing !== null || !activeShop}
            style={{
              padding: '0.5rem 1rem',
              background: syncing === 'piutang' || !activeShop ? 'var(--neutral-200)' : '#fef3c7',
              color: syncing === 'piutang' || !activeShop ? 'var(--neutral-400)' : '#92400e',
              border: '1px solid #fde68a',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: syncing !== null || !activeShop ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '0.15rem'
            }}
            title={!activeShop ? 'Tidak ada shop aktif' : 'Buat piutang untuk settlement yang terlewat (backfill)'}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {syncing === 'piutang' ? (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <DollarSign size={14} />
              )}
              Buat Piutang
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: '400', color: 'var(--neutral-500)', lineHeight: 1.3 }}>
              Buat piutang untuk settlement yang terlewat (backfill)
            </span>
          </button>
          <button
            onClick={() => handleBackfill('orders')}
            disabled={syncing !== null || !activeShop}
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
            title={!activeShop ? 'Tidak ada shop aktif' : 'Ubah order yang sudah dibayar jadi pesanan utama'}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {syncing === 'orders_backfill' ? (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Link2 size={14} />
              )}
              Link to Main Orders
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: '400', color: 'var(--neutral-500)', lineHeight: 1.3 }}>
              Ubah order yang sudah dibayar jadi pesanan utama
            </span>
          </button>
        </div>

        {/* Error/Success Result */}
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
                Klik tombol <strong>Re-authorize</strong> di atas untuk refresh token & dapatkan shop_cipher dari
                TikTok.
              </>
            ) : syncResult.text.includes('(36009004)') ? null : (
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
          overflow: 'hidden',
          marginBottom: '1.5rem'
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
          <h2
            style={{
              fontSize: '0.9rem',
              fontWeight: '700',
              color: 'var(--neutral-700)',
              margin: 0
            }}
          >
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
                  await fetchData(0, v, filterPayment)
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
                  await fetchData(0, filterStatus, v)
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
              <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>{orderTotal} order</span>
            </div>
                  {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
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
                  <span className="mobile-card-value">{o.total_amount}</span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
              <table>
                <thead>
                  <tr>
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
            </div>
          </>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={orderPage + 1}
          totalPages={orderPageCount}
          onPageChange={(p) => fetchData(p - 1)}
          pageSize={orderPageSize}
          onPageSizeChange={(s) => {
            setOrderPageSize(s)
            fetchData(0, filterStatus, filterPayment, s)
          }}
          totalItems={orderTotal}
          startIndex={orderPage * orderPageSize + 1}
          endIndex={Math.min((orderPage + 1) * orderPageSize, orderTotal)}
        />
      </div>
      {/* Statements Table */}
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
          <DollarSign size={16} />
          <h2
            style={{
              fontSize: '0.9rem',
              fontWeight: '700',
              color: 'var(--neutral-700)',
              margin: 0
            }}
          >
            Settlements
          </h2>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>Status:</label>
            <select
              value={filterStmtStatus}
              onChange={async (e) => {
                const v = e.target.value
                setFilterStmtStatus(v)
                await fetchData(0, filterStatus, filterPayment, orderPageSize, 0, v)
              }}
              style={{
                padding: '0.3rem 0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                fontSize: '0.78rem',
                background: 'var(--surface)',
                color: 'var(--neutral-700)',
                cursor: 'pointer'
              }}
            >
              <option value="">Semua</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="PAID">PAID</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>
        </div>
        {statements.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <DollarSign size={24} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.85rem' }}>Belum ada settlement tersync. Klik "Sync Settlement" untuk import.</p>
          </div>
        ) : (
          <>
      {/* Mobile: card list */}
      <div className="mobile-only">
        {statements.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={statements} keyOf={(st) => st.id} renderCard={(st) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Period</span>
                  <span className="mobile-card-value">{st.start_date ?? st.period}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Revenue (gross)</span>
                  <span className="mobile-card-value">{formatRp(Number(st.total_amount ?? 0))}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Fee</span>
                  <span className="mobile-card-value" style={{ color: '#dc2626' }}>
                    -{formatRp(Number(st.fee_amount ?? 0))}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Settlement (bank)</span>
                  <span className="mobile-card-value">{formatRp(Number(st.revenue_amount ?? st.total_amount ?? 0))}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Status</span>
                  <span className="mobile-card-value">{st.status}</span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
            <table>
              <thead>
                <tr>
                  <th>Statement ID</th>
                  <th>Type</th>
                  <th>Revenue (gross)</th>
                  <th>Fee</th>
                  <th>Settlement (bank)</th>
                  <th>Status</th>
                  <th>Period</th>
                  <th>Piutang</th>
                </tr>
              </thead>
              <tbody>
                {statements.map((st) => (
                  <tr key={st.id}>
                    <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{st.statement_id?.slice(0, 16)}...</td>
                    <td>{st.statement_type || '-'}</td>
                    <td style={{ fontWeight: '500' }}>{formatRp(Number(st.total_amount ?? 0))}</td>
                    <td style={{ color: '#dc2626' }}>-{formatRp(Number(st.fee_amount ?? 0))}</td>
                    <td style={{ fontWeight: '700', color: '#16a34a' }}>{formatRp(Number(st.revenue_amount ?? st.total_amount ?? 0))}</td>
                    <td>
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: ['SUCCESS', 'PAID'].includes(st.status ?? '') ? '#f0fdf4' : '#fef9c3',
                          color: ['SUCCESS', 'PAID'].includes(st.status ?? '') ? '#166534' : '#854d0e'
                        }}
                      >
                        {st.status || '-'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
                      {st.start_date ? new Date(st.start_date).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td>
                      {st.piutang_id ? (
                        <a
                          href={`/finance/piutang`}
                          style={{
                            color: '#cc7030',
                            fontSize: '0.8rem',
                            textDecoration: 'none'
                          }}
                        >
                          ✓ Linked
                        </a>
                      ) : (
                        <span style={{ color: 'var(--neutral-400)', fontSize: '0.8rem' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '0 1.25rem 1rem' }}>
            <Pagination
              currentPage={stmtPage + 1}
              totalPages={Math.max(1, Math.ceil(stmtTotal / stmtPageSize))}
              onPageChange={(p) => fetchData(0, filterStatus, filterPayment, orderPageSize, p - 1, filterStmtStatus)}
              pageSize={stmtPageSize}
              onPageSizeChange={(s) => {
                setStmtPageSize(s)
                fetchData(0, filterStatus, filterPayment, orderPageSize, 0, filterStmtStatus, s)
              }}
              totalItems={stmtTotal}
              startIndex={stmtTotal === 0 ? 0 : stmtPage * stmtPageSize + 1}
              endIndex={Math.min((stmtPage + 1) * stmtPageSize, stmtTotal)}
            />
          </div>
          </>
        )}
      </div>
      <Modal open={showAddForm} onClose={() => setShowAddForm(false)} maxWidth={480} padding="1.5rem" zIndex={1000}>
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: '700',
            margin: '0 0 1rem'
          }}
        >
          {settings.length > 0 ? 'Add Another TikTok Shop' : 'Connect TikTok Shop'}
        </h3>

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                marginBottom: '0.3rem'
              }}
            >
              Shop Name
            </label>
            <input
              value={form.shop_name}
              onChange={(e) => setForm((f) => ({ ...f, shop_name: e.target.value }))}
              placeholder="TikTok Shop Saya"
              style={{
                width: '100%',
                padding: '0.6rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.85rem'
              }}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                marginBottom: '0.3rem'
              }}
            >
              App Key * <span style={{ fontWeight: '400', color: 'var(--neutral-400)' }}>(dari TikTok Partner Center)</span>
            </label>
            <input
              value={form.app_key}
              required
              onChange={(e) => setForm((f) => ({ ...f, app_key: e.target.value }))}
              placeholder="Your TikTok Shop App Key"
              style={{
                width: '100%',
                padding: '0.6rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.85rem'
              }}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                marginBottom: '0.3rem'
              }}
            >
              App Secret * <span style={{ fontWeight: '400', color: 'var(--neutral-400)' }}>(dari TikTok Partner Center)</span>
            </label>
            <input
              value={form.app_secret}
              required
              onChange={(e) => setForm((f) => ({ ...f, app_secret: e.target.value }))}
              type="password"
              placeholder="App Secret TikTok Shop"
              style={{
                width: '100%',
                padding: '0.6rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.85rem'
              }}
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.8rem',
                fontWeight: '600',
                marginBottom: '0.3rem'
              }}
            >
              Shop Cipher{' '}
              <Info
                size={12}
                style={{ color: 'var(--neutral-400)', cursor: 'help' }}
                data-tip="Akan otomatis terisi setelah OAuth"
              />
              <span style={{ fontWeight: '400', color: 'var(--neutral-400)' }}>(otomatis dari TikTok)</span>
            </label>
            <input
              value={form.shop_cipher}
              onChange={(e) => setForm((f) => ({ ...f, shop_cipher: e.target.value }))}
              placeholder="Nanti otomatis terisi"
              disabled
              style={{
                width: '100%',
                padding: '0.6rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                background: 'var(--neutral-100)',
                color: 'var(--neutral-400)'
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'flex-end'
            }}
          >
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--neutral-100)',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.5rem 1.25rem',
                background: '#cc7030',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? 'Menyimpan...' : 'Save & Connect'}
            </button>
          </div>
        </form>

        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: '#f0f9ff',
            border: '1px solid #93c5fd',
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            color: '#1e40af'
          }}
        >
          <strong>Langkah-langkah:</strong>
          <ol
            style={{
              margin: '0.3rem 0 0',
              paddingLeft: '1rem',
              lineHeight: 1.6
            }}
          >
            <li>
              Buka{' '}
              <a href="https://partner.tiktokshop.com" target="_blank" style={{ color: '#cc7030' }} rel="noopener">
                TikTok Partner Center
              </a>
            </li>
            <li>Buat aplikasi → dapatkan App Key & App Secret</li>
            <li>
              Set redirect URL:{' '}
              <code
                style={{
                  background: '#e0e7ff',
                  padding: '0.1rem 0.3rem',
                  borderRadius: '0.25rem'
                }}
              >
                https://kjhomedecor.com/api/tiktok/auth
              </code>
            </li>
            <li>Isi App Key & Secret, klik "Save & Connect"</li>
          </ol>
        </div>
      </Modal>

      <Modal
        open={!!showReauthConfirm}
        onClose={() => setShowReauthConfirm(null)}
        maxWidth={400}
        padding="1.5rem"
        zIndex={1000}
      >
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: '700',
            margin: '0 0 0.5rem'
          }}
        >
          Re-authorize Shop?
        </h3>
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--neutral-600)',
            margin: '0 0 0.25rem'
          }}
        >
          Ini akan membuka halaman OAuth TikTok untuk refresh token & mendownload shop_cipher.
        </p>
        <p
          style={{
            fontSize: '0.8rem',
            color: '#d97706',
            margin: '0 0 1rem',
            background: '#fffbeb',
            padding: '0.5rem',
            borderRadius: '0.375rem'
          }}
        >
          <AlertCircle size={12} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
          Pastikan IP server sudah di-whitelist di TikTok Partner Center.
        </p>
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'flex-end'
          }}
        >
          <button
            onClick={() => setShowReauthConfirm(null)}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--neutral-100)',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Batal
          </button>
          <button
            onClick={() => handleReauthorize(showReauthConfirm)}
            disabled={reauthLoading}
            style={{
              padding: '0.5rem 1.25rem',
              background: '#cc7030',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: reauthLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {reauthLoading ? 'Loading...' : 'Ya, Re-authorize'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
