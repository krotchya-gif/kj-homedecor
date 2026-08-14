'use client'
import MobileCards from '@/components/ui/MobileCards'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CheckCircle2, DollarSign, Search, Lock, ChevronLeft, ChevronRight } from 'lucide-react'
import { STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/types'
import type { Order, Customer } from '@/types'
import { useToast } from '@/components/ui/Toast'
import Pagination from '@/components/ui/Pagination'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { MotionStagger } from '@/components/ui/Motion'
import { Modal } from '@/components/ui/Modal'

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(n)


const PAYMENT_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef2f2', text: '#991b1b' },
  partial: { bg: '#fffbeb', text: '#92400e' },
  paid: { bg: '#d1fae5', text: '#065f46' }
}


interface ReturnRow {
  id: string
  order_id: string
  refund_amount: number
  refund_status?: string
  reason?: string
  status?: string
  order?: { id: string; customer?: { name?: string } | null } | null
}

export default function FinancePaymentsPage() {
  const { toast } = useToast()
  const [PAGE_SIZE, setPageSize] = useState(20)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<Order | null>(null)
  const [payForm, setPayForm] = useState({
    type: 'dp',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    cash_account_id: ''
  })
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'payment' | 'refund'>('payment')
  const [refundList, setRefundList] = useState<ReturnRow[]>([])
  const [processingRefund, setProcessingRefund] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [allOrders, setAllOrders] = useState<Order[]>([])
  // F-61 fix: total piutang dari tabel piutang (sumber utama)
  const [piutangData, setPiutangData] = useState<
    { amount: number; fee_amount?: number; paid_amount: number; return_amount: number }[]
  >([])
  // F-12 fix: daftar akun kas untuk pilihan di form pembayaran
  const [cashAccounts, setCashAccounts] = useState<{ id: string; name: string }[]>([])
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (user) {
      const { data: userData } = await supabase.from('users').select('id, name').eq('id', user.id).single()
      setCurrentUser(userData)
    }

    const from = (currentPage - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const [ordersData, returnsData, statsData, piutangData] = await Promise.all([
      supabase
        .from('orders')
        .select(
          'id, total_amount, dp_amount, lunas_amount, payment_status, status, created_at, customer:customers(name, phone)',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(from, to),
      supabase
        .from('returns')
        .select('*, order:orders(id, customer:customers(name))')
        .order('created_at', { ascending: false })
        .limit(100),
      // F-53 fix: stat card dihitung dari SEMUA order, bukan halaman aktif
      supabase
        .from('orders')
        .select('payment_status, total_amount, dp_amount, lunas_amount')
        .neq('status', 'cancelled'),
      // F-61 fix: Total Piutang dari TABEL piutang (sumber utama)
      supabase
        .from('piutang')
        .select('amount, fee_amount, paid_amount, return_amount')
        .in('status', ['pending', 'partial'])
    ])

    setOrders((ordersData.data ?? []) as unknown as Order[])
    setTotalCount(ordersData.count ?? 0)
    setRefundList((returnsData.data ?? []) as ReturnRow[])
    setAllOrders((statsData.data ?? []) as unknown as Order[])
    setPiutangData(
      (piutangData.data ?? []) as unknown as { amount: number; fee_amount?: number; paid_amount: number; return_amount: number }[]
    )
    // F-12 fix: muat daftar akun kas untuk pilihan di form pembayaran
    const { data: cashAcc } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('is_cash_account', true)
      .order('code')
    setCashAccounts((cashAcc ?? []) as { id: string; name: string }[])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [currentPage])

  const filtered = orders.filter((o) => {
    const matchFilter = !filter || o.payment_status === filter
    const matchSearch = !search || (o.customer?.name ?? '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  // Idempotency key per sesi modal: retry setelah timeout tidak mencatat dua kali.
  const payKeyRef = useRef<string | null>(null)
  function closePayModal() {
    payKeyRef.current = null
    setSelected(null)
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    const amount = Number(payForm.amount)
    // Validasi nominal (temuan audit 2026-08-10): tolak <= 0 dan > sisa tagihan
    if (!payForm.amount || isNaN(amount) || amount <= 0) {
      setSaving(false)
      toast('error', 'Nominal pembayaran wajib diisi dan lebih dari 0.')
      return
    }
    // F-64 fix: tanggal pembayaran tidak boleh di masa depan (juga dicek server)
    const todayStr = new Date().toISOString().slice(0, 10)
    if (payForm.date > todayStr) {
      setSaving(false)
      toast('error', 'Tanggal pembayaran tidak boleh di masa depan.')
      return
    }
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      toast('error', 'Sesi login berakhir.')
      return
    }
    if (!payKeyRef.current) {
      payKeyRef.current = `finance_pay:${selected.id}:${crypto.randomUUID()}`
    }

    // Pembayaran ATOMIC di server (add_order_payment_atomic): validasi sisa +
    // insert payments + jurnal payment_received + orders dp/lunas/payment_status
    // + order_logs dalam SATU transaksi. Rollback penuh jika salah satu gagal
    // (menggantikan jalur multi-step client yang bisa meninggalkan jurnal yatim).
    // Idempotency key + FOR UPDATE mencegah double-pay saat retry/2 finance.
    const { error: payErr } = await supabase.rpc('add_order_payment_atomic', {
      p_order_id: selected.id,
      p_type: payForm.type,
      p_amount: amount,
      p_actor: user.id,
      p_idempotency_key: payKeyRef.current,
      p_debit_account_id: payForm.cash_account_id || null,
      p_date: payForm.date
    })
    if (payErr) {
      setSaving(false)
      toast('error', 'Gagal catat pembayaran: ' + payErr.message)
      return
    }

    setSaving(false)
    payKeyRef.current = null
    setSelected(null)
    setPayForm({
      type: 'dp',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      cash_account_id: ''
    })
    load()
  }

  async function handleApprove(order: Order) {
    // PENTING: Fetch fresh order data dari DB untuk avoid stale data
    const { data: freshOrder, error: fetchErr } = await supabase
      .from('orders')
      .select('id, status, dp_amount, lunas_amount, total_amount, payment_status')
      .eq('id', order.id)
      .single()
    if (fetchErr || !freshOrder) {
      toast('error', 'Gagal Approve — order tidak ditemukan di database.')
      return
    }

    const paidSum = freshOrder.dp_amount + freshOrder.lunas_amount
    // 2026-07-31 Opsi A: approve di DEPAN — finance verifikasi pembayaran (DP/lunas) SUDAH MASUK
    // sebelum produksi. Cukup ada pembayaran tercatat; lunas penuh tetap
    // wajib sebelum packed (payment gate di API route).
    // BUG-004 fix (Opsi B): DP yang dicatat Admin saat buat pesanan otomatis masuk tabel
    // payments (auto-record di admin/orders). Tidak ada lagi blok getVerifiedPayment —
    // klik Approve oleh Finance SENDIRI adalah verifikasi final (cek bayar terakhir).
    if (paidSum <= 0) {
      toast('error', 'Gagal Approve — Belum ada pembayaran tercatat (DP/lunas). Catat pembayaran dulu.')
      return
    }
    if (freshOrder.payment_status === 'pending') {
      toast('error', `Gagal Approve — payment_status masih 'pending'. Catat DP/lunas dulu sebelum approve.`)
      return
    }

    const sisaTagihan = (freshOrder.total_amount ?? 0) - paidSum
    const belumLunas = sisaTagihan > 0

    // ALUR BARU (Opsi A, 2026-07-31): Finance 1 klik Approve di order 'new'
    //   new -> payment_ok
    // Verifikasi pembayaran (DP/lunas) sudah masuk → lanjut Gudang sortir.
    // TIDAK auto-advance ke packed lagi — packed adalah gate lunas (payment gate API).

    if (freshOrder.status === 'new') {
      // new -> payment_ok (Finance verify pembayaran masuk, lanjut Gudang sortir)
      const stepRes = await fetch(`/api/orders/${freshOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'payment_ok' })
      })
      const stepJson = await stepRes.json().catch(() => null)
      if (!stepRes.ok) {
        toast('error', 'Gagal update ke Cek Bayar: ' + (stepJson?.error?.message ?? `HTTP ${stepRes.status}`))
        return
      }
      toast(
        'success',
        belumLunas
          ? `✅ Pembayaran diverifikasi! Status: Baru → Cek Bayar. Sisa tagihan ${fmt(sisaTagihan)} — Finance wajib input pelunasan sebelum order dikemas (payment gate).`
          : `✅ Pembayaran diverifikasi (LUNAS)! Status: Baru → Cek Bayar. Lanjut Gudang untuk sortir.`
      )
    } else if (freshOrder.status === 'payment_ok') {
      // Sudah di Cek Bayar — gudang yang lanjut ke sortir
      toast('info', 'Order sudah di Cek Bayar. Gudang bisa lanjut ke "Sudah Sortir" di halaman order.')
      load()
      return
    } else if (freshOrder.status === 'ready') {
      // 2026-07-31: ready → packed langsung (tanpa finance lagi) — gudang/admin yang lanjutkan
      // TAPI payment gate tetap: belum lunas → packing diblokir API. Finance wajib input pelunasan dulu.
      if (belumLunas) {
        toast(
          'warning',
          `Order sudah Siap tapi BELUM LUNAS (sisa ${fmt(sisaTagihan)}). Finance harus input pelunasan dulu — order tidak bisa dikemas sampai lunas (payment gate).`
        )
        load()
        return
      }
      toast('info', 'Order sudah Siap & Lunas. Gudang/Admin lanjut ke "Dikemas" di halaman order.')
      load()
      return
    } else if (freshOrder.status === 'packed') {
      toast('info', 'Order sudah di Dikemas. Gudang tinggal input resi (di /admin/shipping).')
      load()
      return
    } else if (freshOrder.status === 'shipped' || freshOrder.status === 'done') {
      toast('info', 'Order sudah selesai.')
      load()
      return
    } else if (freshOrder.status === 'steam') {
      toast(
        'warning',
        `Order masih di "Steam/QC". Gudang harus QC Pass dulu di /gudang/steam sebelum Finance bisa approve.`
      )
      return
    } else {
      toast(
        'error',
        `Status order belum bisa diapprove: "${STATUS_LABELS[freshOrder.status as keyof typeof STATUS_LABELS]}".`
      )
      return
    }
    load()
  }

  async function handleRefund(returnRecord: ReturnRow) {
    const refundAmount = Number(returnRecord.refund_amount ?? 0)
    if (refundAmount <= 0) {
      toast('warning', 'Tidak ada jumlah refund untuk diproses.')
      return
    }
    if (
      !confirm(
        `Proses refund Rp${fmt(refundAmount)} untuk order ${returnRecord.order_id.slice(0, 8)}?\n\nIni akan mencatat pengurangan pembayaran.`
      )
    )
      return
    setProcessingRefund(returnRecord.id)
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      setProcessingRefund(null)
      toast('error', 'Sesi login berakhir.')
      return
    }

    // Refund ATOMIC di server (process_refund_atomic): payment refund + jurnal
    // sales_return + orders dp/lunas/payment_status + returns.refund_status +
    // order_logs dalam SATU transaksi. Idempotent (guard refund_status +
    // idempotency key) — menggantikan alur multi-step client yang bisa
    // meninggalkan jurnal/payment yatim (temuan audit 2026-08-14).
    const { error: refundErr } = await supabase.rpc('process_refund_atomic', {
      p_return_id: returnRecord.id,
      p_actor: user.id
    })
    if (refundErr) {
      setProcessingRefund(null)
      toast('error', 'Gagal proses refund: ' + refundErr.message)
      return
    }

    setProcessingRefund(null)
    toast('success', `Refund ${fmt(refundAmount)} berhasil diproses!`)
    load()
  }

  return (
    <div>
      <PageHeader
        title="Payment Tracking"
        subtitle="DP/Lunas tracking — Payment Gate aktif sebelum order bisa dikirim"
      />

      <div
        style={{
          background: 'linear-gradient(135deg, #1a0a00, #3d1a08)',
          borderRadius: '0.75rem',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}
      >
        <Lock size={18} style={{ color: '#f4a857', flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)' }}>
          <strong style={{ color: '#f4a857' }}>Payment Gate aktif:</strong> Order hanya bisa lanjut ke{' '}
          <strong>packing</strong> jika <strong style={{ color: '#fff' }}>(1)</strong> payment_status = 'paid' (DP +
          Lunas ≥ Total), dan <strong style={{ color: '#fff' }}>(2)</strong> ada record pembayaran dengan verified_by.
          Finance harus approve manual dari status <strong>Siap</strong> ke <strong>Cek Bayar</strong>.
        </div>
      </div>

      <MotionStagger className="stat-grid" style={{ marginBottom: '1.25rem' }}>
        {[
          {
            label: 'Belum Bayar',
            val: allOrders.filter((o) => o.payment_status === 'pending').length,
            color: '#ef4444'
          },
          {
            label: 'Bayar DP',
            val: allOrders.filter((o) => o.payment_status === 'partial').length,
            color: '#f59e0b'
          },
          {
            label: 'Lunas',
            val: allOrders.filter((o) => o.payment_status === 'paid').length,
            color: '#22c55e'
          },
          {
            label: 'Total Piutang',
            val: fmt(
              Math.max(
                0,
                piutangData.reduce((s, p) => s + (p.amount ?? 0) - (p.paid_amount ?? 0) - (p.return_amount ?? 0) - (p.fee_amount ?? 0), 0)
              )
            ),
            color: '#cc7030'
          }
        ].map((s, i) => (
          <StatCard key={s.label} label={s.label} value={s.val} accent={s.color} delay={i * 0.05} />
        ))}
      </MotionStagger>

      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '2px solid #e5e7eb',
          marginBottom: '1.25rem'
        }}
      >
        {[
          { key: 'payment', label: '💰 Pembayaran', count: orders.length },
          {
            key: 'refund',
            label: '💸 Refund',
            count: refundList.filter((r) => r.refund_status === 'pending').length
          }
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as 'payment' | 'refund')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${activeTab === t.key ? '#cc7030' : 'transparent'}`,
              cursor: 'pointer',
              fontWeight: activeTab === t.key ? '700' : '500',
              color: activeTab === t.key ? '#cc7030' : 'var(--neutral-600)',
              fontSize: '0.9rem',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span
                style={{
                  background: activeTab === t.key ? '#cc7030' : '#ef4444',
                  color: '#fff',
                  borderRadius: '999px',
                  fontSize: '0.65rem',
                  padding: '0.1rem 0.5rem',
                  fontWeight: '700'
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'refund' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              background: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: '0.75rem',
              padding: '1rem 1.25rem',
              marginBottom: '1.25rem'
            }}
          >
            <div style={{ fontSize: '0.85rem', color: '#92400e' }}>
              <strong>💸 Refund Tab</strong> — Proses refund untuk order yang di-return customer.
            </div>
          </div>
          {refundList.filter((r) => r.refund_status === 'pending').length === 0 ? (
            <div className="section-card">
              <p>Tidak ada refund yang menunggu proses</p>
            </div>
          ) : (
            <>
                  {/* Mobile: card list — F-52 fix: render REFUND, bukan filtered (orders) */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : refundList.filter((r) => r.refund_status === 'pending').length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards
            items={refundList.filter((r) => r.refund_status === 'pending')}
            keyOf={(r) => r.id}
            renderCard={(r) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Order</span>
                  <span className="mobile-card-value">{r.order_id?.slice(0, 8)}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Alasan</span>
                  <span className="mobile-card-value">{r.reason ?? '—'}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Refund</span>
                  <span className="mobile-card-value" style={{ color: '#cc7030' }}>{fmt(r.refund_amount ?? 0)}</span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Pelanggan</th>
                    <th>Alasan Return</th>
                    <th>Refund Amount</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {refundList
                    .filter((r) => r.refund_status === 'pending')
                    .map((r) => (
                      <tr key={r.id}>
                        <td
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.78rem',
                            color: 'var(--neutral-600)'
                          }}
                        >
                          {r.order_id?.slice(0, 8)}
                        </td>
                        <td style={{ fontWeight: '500' }}>{r.order?.customer?.name ?? '—'}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--neutral-600)' }}>{r.reason}</td>
                        <td style={{ fontWeight: '700', color: '#cc7030' }}>{fmt(r.refund_amount)}</td>
                        <td>
                          <span
                            style={{
                              background: '#fef3c7',
                              color: '#92400e',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}
                          >
                            ⏳ Pending
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleRefund(r)}
                            disabled={processingRefund === r.id}
                            style={{
                              padding: '0.4rem 1rem',
                              background: '#16a34a',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '0.375rem',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              cursor: processingRefund === r.id ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {processingRefund === r.id ? '...' : '💸 Proses Refund'}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'payment' && (
        <>
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '1.25rem',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--neutral-400)'
                }}
              />
              <input
                type="text"
                placeholder="Cari nama pelanggan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 1rem 0.625rem 2.25rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: '0.625rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                background: 'var(--surface)',
                outline: 'none'
              }}
            >
              <option value="">Semua Status</option>
              <option value="pending">Belum Bayar</option>
              <option value="partial">Bayar DP</option>
              <option value="paid">Lunas</option>
            </select>
          </div>

      {/* Mobile: card list */}
      <div className="mobile-only">
        {filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={filtered} keyOf={(o) => o.id} renderCard={(o) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Pelanggan</span>
                  <span className="mobile-card-value">{o.customer?.name ?? '—'}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Total</span>
                  <span className="mobile-card-value">{o.total_amount}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Status</span>
                  <span className="mobile-card-value">{o.payment_status ?? o.status}</span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
            {loading ? (
              <div style={{ padding: '1.5rem' }}>
                <TableSkeleton rows={8} cols={8} />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon="💰"
                title="Tidak ada data pembayaran"
                description="Tidak ada pembayaran yang cocok dengan filter saat ini."
              />
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Pelanggan</th>
                    <th>Total</th>
                    <th>DP</th>
                    <th>Lunas</th>
                    <th>Sisa</th>
                    <th>Status Bayar</th>
                    <th>Status Order</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => {
                    const sisa = o.total_amount - o.dp_amount - o.lunas_amount
                    const paidSum = o.dp_amount + o.lunas_amount
                    const pc = PAYMENT_COLORS[o.payment_status]
                    // 2026-07-31 Opsi A: finance approve di DEPAN — order 'new' yang sudah ada pembayaran
                    // (DP/lunas tercatat & diverifikasi) bisa di-approve. Lunas penuh bukan syarat di sini
                    // (gate lunas tetap di packed).
                    const canApprove = o.payment_status !== 'pending' && o.status === 'new'
                    return (
                      <tr key={o.id}>
                        <td style={{ fontWeight: '500' }}>{o.customer?.name ?? '—'}</td>
                        <td style={{ fontWeight: '600', color: '#cc7030' }}>{fmt(o.total_amount)}</td>
                        <td>{fmt(o.dp_amount)}</td>
                        <td>{fmt(o.lunas_amount)}</td>
                        <td
                          style={{
                            fontWeight: '600',
                            color: sisa > 0 ? '#ef4444' : '#16a34a'
                          }}
                        >
                          {fmt(sisa)}
                        </td>
                        <td>
                          <span
                            style={{
                              ...pc,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}
                          >
                            {(PAYMENT_STATUS_LABELS as Record<string, string>)[o.payment_status]}
                          </span>
                        </td>
                        <td>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.25rem'
                            }}
                          >
                            <span style={{ fontSize: '0.78rem', color: 'var(--neutral-600)' }}>
                              {(STATUS_LABELS as Record<string, string>)[o.status]}
                            </span>
                            {o.status === 'new' && o.payment_status !== 'pending' && (
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  color: '#16a34a',
                                  fontWeight: '600'
                                }}
                              >
                                ✓ Bisa Approve
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div
                            style={{
                              display: 'flex',
                              gap: '0.5rem',
                              flexWrap: 'wrap'
                            }}
                          >
                            <button
                              onClick={() => {
                                setSelected(o ?? null)
                                setPayForm({
                                  type: 'dp',
                                  amount: String(sisa > 0 ? sisa : ''),
                                  date: new Date().toISOString().slice(0, 10),
                                  cash_account_id: ''
                                })
                              }}
                              style={{
                                padding: '0.3rem 0.75rem',
                                background: '#cc7030',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              Input Bayar
                            </button>
                            {canApprove ? (
                              <button
                                onClick={() => handleApprove(o)}
                                title="Verifikasi pembayaran diterima → pesanan lanjut ke gudang"
                                style={{
                                  padding: '0.3rem 0.75rem',
                                  background: '#16a34a',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.2rem'
                                }}
                              >
                                <CheckCircle2 size={12} /> Approve
                              </button>
                            ) : (
                              <button
                                disabled
                                style={{
                                  padding: '0.3rem 0.75rem',
                                  background: 'var(--neutral-100)',
                                  color: 'var(--input-border)',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'not-allowed',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.2rem'
                                }}
                              >
                                <Lock size={11} /> Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
          onPageChange={setCurrentPage}
          pageSize={PAGE_SIZE}
          onPageSizeChange={(s) => {
            setPageSize(s)
            setCurrentPage(1)
          }}
          totalItems={totalCount}
          startIndex={(currentPage - 1) * PAGE_SIZE + 1}
          endIndex={Math.min(currentPage * PAGE_SIZE, totalCount)}
        />
        </>
      )}

      <Modal open={!!selected} onClose={closePayModal} maxWidth={440} padding="2rem" zIndex={200}>
        {selected && (
          <>
            <h2
              style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                marginBottom: '0.5rem'
              }}
            >
              Input Pembayaran
            </h2>
            <div
              style={{
                background: 'var(--neutral-100)',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '0.875rem',
                marginBottom: '1.25rem'
              }}
            >
              <div
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--neutral-700)',
                  marginBottom: '0.25rem'
                }}
              >
                <strong>{selected.customer?.name}</strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  color: 'var(--neutral-600)'
                }}
              >
                <span>
                  Total: <strong style={{ color: '#cc7030' }}>{fmt(selected.total_amount)}</strong>
                </span>
                <span>
                  Sisa:{' '}
                  <strong style={{ color: '#ef4444' }}>
                    {fmt(selected.total_amount - selected.dp_amount - selected.lunas_amount)}
                  </strong>
                </span>
              </div>
            </div>
            <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: 'var(--neutral-700)',
                    marginBottom: '0.3rem'
                  }}
                >
                  Jenis Pembayaran
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {['dp', 'lunas'].map((t) => (
                    <label
                      key={t}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '0.875rem'
                      }}
                    >
                      <input
                        type="radio"
                        name="paytype"
                        value={t}
                        checked={payForm.type === t}
                        onChange={() => setPayForm((f) => ({ ...f, type: t }))}
                      />
                      {t === 'dp' ? 'DP (Uang Muka)' : 'Pelunasan'}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: 'var(--neutral-700)',
                    marginBottom: '0.3rem'
                  }}
                >
                  Akun Kas Masuk
                </label>
                <select
                  value={payForm.cash_account_id}
                  onChange={(e) => setPayForm((f) => ({ ...f, cash_account_id: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    background: 'var(--surface)'
                  }}
                >
                  <option value="">— Default (dari mapping) —</option>
                  {cashAccounts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: 'var(--neutral-700)',
                    marginBottom: '0.3rem'
                  }}
                >
                  Jumlah (Rp) *
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  placeholder="0"
                  value={payForm.amount}
                  onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: 'var(--neutral-700)',
                    marginBottom: '0.3rem'
                  }}
                >
                  Tanggal
                </label>
                <input
                  type="date"
                  value={payForm.date}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setPayForm((f) => ({ ...f, date: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '0.375rem',
                  padding: '0.625rem 0.875rem',
                  fontSize: '0.78rem',
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <CheckCircle2 size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
                Pembayaran ini akan langsung diverifikasi oleh <strong>{currentUser?.name ?? 'Finance'}</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={closePayModal}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    background: 'var(--surface)',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#cc7030',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {saving ? 'Menyimpan...' : 'Simpan Pembayaran'}
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  )
}
