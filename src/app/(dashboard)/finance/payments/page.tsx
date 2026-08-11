'use client'
import MobileCards from '@/components/ui/MobileCards'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CheckCircle2, DollarSign, Search, Lock, ChevronLeft, ChevronRight } from 'lucide-react'
import { STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/types'
import type { Order, Customer } from '@/types'
import { createSimpleJournal } from '@/utils/journal/create'
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


interface VerifiedPayment {
  verified_by: string
  verified_at: string
  amount: number
  type: string
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

interface QcJob {
  id: string
  result?: string
  status?: string
  order?: (Order & { customer?: Customer }) | null
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
    date: new Date().toISOString().slice(0, 10)
  })
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'payment' | 'refund' | 'qc'>('payment')
  const [refundList, setRefundList] = useState<ReturnRow[]>([])
  const [processingRefund, setProcessingRefund] = useState<string | null>(null)
  const [qcOrders, setQcOrders] = useState<QcJob[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
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

    const [ordersData, returnsData, qcData] = await Promise.all([
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
      supabase
        .from('steam_jobs')
        .select(
          '*, order:orders(id, total_amount, dp_amount, lunas_amount, payment_status, status, customer:customers(name, phone))'
        )
        .eq('result', 'pass')
        .eq('status', 'done')
        .limit(100)
    ])

    setOrders((ordersData.data ?? []) as unknown as Order[])
    setTotalCount(ordersData.count ?? 0)
    setRefundList((returnsData.data ?? []) as ReturnRow[])
    const qcApproved = ((qcData.data ?? []) as QcJob[]).filter((sq) => sq.order?.payment_status !== 'paid')
    setQcOrders(qcApproved)
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [currentPage])

  async function getVerifiedPayment(orderId: string): Promise<VerifiedPayment | null> {
    const { data } = await supabase
      .from('payments')
      .select('verified_by, verified_at, amount, type')
      .eq('order_id', orderId)
      .not('verified_by', 'is', null)
      .order('verified_at', { ascending: false })
      .limit(1)
      .single()
    return data ?? null
  }

  const filtered = orders.filter((o) => {
    const matchFilter = !filter || o.payment_status === filter
    const matchSearch = !search || (o.customer?.name ?? '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    const amount = Number(payForm.amount)
    // Validasi nominal (temuan audit 2026-08-10): tolak <= 0 dan > sisa tagihan
    if (!payForm.amount || amount <= 0) {
      setSaving(false)
      toast('error', 'Nominal pembayaran wajib diisi dan lebih dari 0.')
      return
    }
    const sisaTagihan = (selected.total_amount ?? 0) - (selected.dp_amount ?? 0) - (selected.lunas_amount ?? 0)
    if (amount > sisaTagihan) {
      setSaving(false)
      toast('error', `Nominal melebihi sisa tagihan (Rp ${sisaTagihan.toLocaleString('id-ID')}).`)
      return
    }
    const now = new Date().toISOString()
    const { error: payErr } = await supabase.from('payments').insert({
      order_id: selected.id,
      type: payForm.type,
      amount,
      date: payForm.date,
      verified_by: currentUser?.id ?? null,
      verified_at: now
    })
    if (payErr) { setSaving(false); toast('error', 'Gagal catat pembayaran: ' + payErr.message); return }

    // Auto-create journal entry for payment
    try {
      await createSimpleJournal({
        transaction_type: 'payment_received',
        reference_type: 'order',
        reference_id: selected.id,
        description: `${payForm.type === 'dp' ? 'DP' : 'Pelunasan'} dari order ${selected.order_number ?? selected.id.slice(0, 8)} — ${selected.customer?.name ?? ''}`,
        amount,
        entry_date: payForm.date
      })
    } catch (e) {
      // CRITICAL: journal entry gagal = double-entry accounting rusak.
      // Alert user, bukan cuma console.warn.
      const errMsg = e instanceof Error ? e.message : String(e)
      console.error('Failed to create journal entry:', errMsg)
      toast('warning', 
        '⚠️ Pembayaran TERCATAT di payments, TAPI journal entry GAGAL.\n\n' +
          'Error: ' +
          errMsg +
          '\n\n' +
          'Ini masalah akuntansi serius. Hubungi Owner untuk fix double-entry.\n' +
          'Bisa karena: account_mappings belum di-setup. Lihat /finance/accounts/mapping')
    }
    const { error: logErr } = await supabase.from('order_logs').insert({
      order_id: selected.id,
      action: 'payment_input',
      notes: `Input ${payForm.type === 'dp' ? 'DP' : 'Pelunasan'} Rp${amount.toLocaleString('id-ID')} oleh ${currentUser?.name ?? 'Finance'}`,
      staff_id: currentUser?.id
    })
    if (logErr) { console.error('Gagal catat log pembayaran:', logErr) }
    const newDp = payForm.type === 'dp' ? selected.dp_amount + amount : selected.dp_amount
    const newLunas = payForm.type === 'lunas' ? selected.lunas_amount + amount : selected.lunas_amount
    const total = selected.total_amount
    const paidSum = newDp + newLunas
    const newPayStatus = paidSum >= total && total > 0 ? 'paid' : paidSum > 0 ? 'partial' : 'pending'
    const { error: ordErr } = await supabase
      .from('orders')
      .update({
        dp_amount: newDp,
        lunas_amount: newLunas,
        payment_status: newPayStatus
      })
      .eq('id', selected.id)
    if (ordErr) { setSaving(false); toast('error', 'Pembayaran tercatat, tapi gagal update order: ' + ordErr.message); return }
    setSaving(false)
    setSelected(null)
    setPayForm({
      type: 'dp',
      amount: '',
      date: new Date().toISOString().slice(0, 10)
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
      const { error: step1Err } = await supabase
        .from('orders')
        .update({ status: 'payment_ok' })
        .eq('id', freshOrder.id)
        .eq('status', 'new')
      if (step1Err) {
        toast('error', 'Gagal update ke Cek Bayar: ' + step1Err.message)
        return
      }
      const { error: logErr } = await supabase.from('order_logs').insert({
        order_id: freshOrder.id,
        action: 'payment_verified',
        notes: `Payment verified oleh ${currentUser?.name ?? 'Finance'} — pembayaran (DP/lunas) sudah masuk Rp${paidSum.toLocaleString('id-ID')}. Status: Baru → Cek Bayar. Lanjut Gudang sortir.`,
        staff_id: currentUser?.id
      })
      if (logErr) { console.error('Gagal catat log verify:', logErr) }
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

  async function handleQcApprove(order: Order) {
    if (
      !confirm(
        `Konfirmasi Approve Order\n\nPelanggan: ${order.customer?.name ?? '-'}\nTotal: ${fmt(order.total_amount)} — Lunas\n\nStatus akan berubah menjadi "Siap Kirim" dan order siap dikemas/dikirim.`
      )
    )
      return
    const paidSum = (order.dp_amount ?? 0) + (order.lunas_amount ?? 0)
    if (paidSum < (order.total_amount ?? 0)) {
      toast('error', `Gagal Approve — Sisa pembayaran ${fmt((order.total_amount ?? 0) - paidSum)}, order belum lunas!`)
      return
    }
    const verifiedPayment = await getVerifiedPayment(order.id)
    if (!verifiedPayment) {
      toast('error', 'Gagal Approve — Belum ada pembayaran yang diverifikasi.')
      return
    }
    if (order.status !== 'steam') {
      toast(
        'error',
        `Status order belum bisa diapprove. Order saat ini: "${(STATUS_LABELS as Record<string, string>)[order.status]}"`
      )
      return
    }
    const { error: qcErr } = await supabase.from('orders').update({ status: 'ready' }).eq('id', order.id).eq('status', 'steam')
    if (qcErr) { toast('error', 'Gagal update status ke Siap: ' + qcErr.message); return }
    const { error: qcLogErr } = await supabase.from('order_logs').insert({
      order_id: order.id,
      action: 'payment_approved',
      notes: `QC Approved — Finance approve oleh ${currentUser?.name ?? 'Finance'} — lunas Rp${paidSum.toLocaleString('id-ID')}`,
      staff_id: currentUser?.id
    })
    if (qcLogErr) { console.error('Gagal catat log approve:', qcLogErr) }
    toast('success', 'Order berhasil diapprove! Status berubah menjadi "Siap Kirim". Order siap dikemas dan dikirim.')
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

    // BUG-012 fix (2026-08-11):
    // - Guard idempotensi: return yang sudah selesai tidak boleh diproses ulang
    // - Guard nominal: refund tidak boleh melebihi yang sudah dibayar
    // - Jurnal reversal (refund_issued) + kurangi dp/lunas order
    const { data: ret, error: retErr } = await supabase
      .from('returns')
      .select('refund_status')
      .eq('id', returnRecord.id)
      .maybeSingle()
    if (retErr || !ret) {
      setProcessingRefund(null)
      toast('error', 'Gagal memuat data return.')
      return
    }
    if (ret.refund_status === 'completed') {
      setProcessingRefund(null)
      toast('warning', 'Refund sudah diproses sebelumnya (idempotent).')
      return
    }

    const { data: freshOrder } = await supabase
      .from('orders')
      .select('id, total_amount, dp_amount, lunas_amount, payment_status')
      .eq('id', returnRecord.order_id)
      .single()
    const paidBefore = (freshOrder?.dp_amount ?? 0) + (freshOrder?.lunas_amount ?? 0)
    if (refundAmount > paidBefore) {
      setProcessingRefund(null)
      toast('error', `Refund (${fmt(refundAmount)}) melebihi yang sudah dibayar (${fmt(paidBefore)}).`)
      return
    }

    // 1) Catat refund di tabel payments
    const { error: refundErr } = await supabase.from('payments').insert({
      order_id: returnRecord.order_id,
      type: 'refund',
      amount: refundAmount,
      date: new Date().toISOString(),
      verified_by: user?.id ?? null,
      verified_at: new Date().toISOString(),
      notes: `Refund untuk return: ${returnRecord.reason}`
    })
    if (refundErr) { setProcessingRefund(null); toast('error', 'Gagal catat refund: ' + refundErr.message); return }

    // 2) Jurnal reversal — Dr Piutang / Cr Kas (membalik pembayaran)
    try {
      await createSimpleJournal({
        transaction_type: 'refund_issued',
        reference_type: 'return',
        reference_id: returnRecord.id,
        description: `Refund Rp${fmt(refundAmount)} untuk return order ${returnRecord.order_id.slice(0, 8)}`,
        amount: refundAmount
      })
    } catch (e) {
      console.error('Gagal buat jurnal refund:', e)
      toast('warning', 'Refund tercatat, TAPI jurnal reversal GAGAL. Periksa /finance/accounts/mapping.')
    }

    // 3) Kurangi dp/lunas order (lunas dulu, baru dp) + hitung ulang payment_status
    let newLunas = freshOrder?.lunas_amount ?? 0
    let newDp = freshOrder?.dp_amount ?? 0
    let sisaRefund = refundAmount
    const fromLunas = Math.min(newLunas, sisaRefund)
    newLunas -= fromLunas
    sisaRefund -= fromLunas
    newDp = Math.max(0, newDp - sisaRefund)
    const paidNow = newDp + newLunas
    const newPayStatus = paidNow >= (freshOrder?.total_amount ?? 0) && (freshOrder?.total_amount ?? 0) > 0 ? 'paid' : paidNow > 0 ? 'partial' : 'pending'
    const { error: ordErr } = await supabase
      .from('orders')
      .update({ dp_amount: newDp, lunas_amount: newLunas, payment_status: newPayStatus })
      .eq('id', returnRecord.order_id)
    if (ordErr) { console.error('Gagal update order setelah refund:', ordErr) }

    // 4) Tandai return selesai (RLS diperbaiki di migration 063 — is_finance_role)
    const { error: retUpdErr } = await supabase.from('returns').update({ refund_status: 'completed' }).eq('id', returnRecord.id)
    if (retUpdErr) {
      setProcessingRefund(null)
      toast('error', 'Refund & jurnal tersimpan, tapi gagal update status return: ' + retUpdErr.message)
      return
    }

    const { error: refundLogErr } = await supabase.from('order_logs').insert({
      order_id: returnRecord.order_id,
      action: 'refund_issued',
      notes: `Refund Rp${fmt(refundAmount)} diproses oleh Finance. Alasan return: ${returnRecord.reason}`,
      staff_id: user?.id ?? null
    })
    if (refundLogErr) { console.error('Gagal catat log refund:', refundLogErr) }
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
            val: orders.filter((o) => o.payment_status === 'pending').length,
            color: '#ef4444'
          },
          {
            label: 'Bayar DP',
            val: orders.filter((o) => o.payment_status === 'partial').length,
            color: '#f59e0b'
          },
          {
            label: 'Lunas',
            val: orders.filter((o) => o.payment_status === 'paid').length,
            color: '#22c55e'
          },
          {
            label: 'Total Piutang',
            val: fmt(
              Math.max(
                0,
                orders
                  .filter((o) => o.payment_status !== 'paid')
                  .reduce((s, o) => s + (o.total_amount - o.dp_amount - o.lunas_amount), 0)
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
          { key: 'qc', label: '✅ QC Approved', count: qcOrders.length },
          {
            key: 'refund',
            label: '💸 Refund',
            count: refundList.filter((r) => r.refund_status === 'pending').length
          }
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as 'payment' | 'refund' | 'qc')}
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
                  {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={filtered} keyOf={(o) => o.id} renderCard={(o) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Order</span>
                  <span className="mobile-card-value">{o.order_number ?? o.id.slice(0, 8)}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Customer</span>
                  <span className="mobile-card-value">{o.customer?.name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Status</span>
                  <span className="mobile-card-value">{o.status}</span>
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
                                  date: new Date().toISOString().slice(0, 10)
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

      {activeTab === 'qc' && (
        <div>
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '0.75rem',
              padding: '1rem 1.25rem',
              marginBottom: '1.25rem'
            }}
          >
            <div style={{ fontSize: '0.85rem', color: '#166534' }}>
              <strong>✅ QC Approved</strong> — Order yang sudah LULUS QC Steam/QC dari Gudang.
            </div>
          </div>
          {qcOrders.length === 0 ? (
            <div className="section-card">
              <CheckCircle2 size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
              <p>Tidak ada order yang menunggu approval</p>
            </div>
          ) : (
            <>
            <div className="mobile-only">
              <MobileCards items={qcOrders} keyOf={(qc) => qc.id} renderCard={(qc) => {
                const o = qc.order
                return (
                  <div className="mobile-card">
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Pelanggan</span>
                      <span className="mobile-card-value">{o?.customer?.name ?? '—'}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Total</span>
                      <span className="mobile-card-value" style={{ color: '#cc7030' }}>{fmt(o?.total_amount ?? 0)}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Sisa</span>
                      <span className="mobile-card-value">{fmt((o?.total_amount ?? 0) - (o?.dp_amount ?? 0) - (o?.lunas_amount ?? 0))}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Status</span>
                      <span className="mobile-card-value" style={{ fontWeight: '400' }}>{o?.payment_status ?? qc.status}</span>
                    </div>
                  </div>
                )
              }} />
            </div>
            <div className="data-table desktop-only">
              <table>
                <thead>
                  <tr>
                    <th>Pelanggan</th>
                    <th>Total</th>
                    <th>DP</th>
                    <th>Lunas</th>
                    <th>Sisa</th>
                    <th>Status Bayar</th>
                    <th>QC Steam</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {qcOrders.map((qc) => {
                    const o = qc.order
                    const sisa = (o?.total_amount ?? 0) - (o?.dp_amount ?? 0) - (o?.lunas_amount ?? 0)
                    return (
                      <tr key={qc.id}>
                        <td style={{ fontWeight: '500' }}>{o?.customer?.name ?? '—'}</td>
                        <td style={{ fontWeight: '600', color: '#cc7030' }}>{fmt(o?.total_amount ?? 0)}</td>
                        <td>{fmt(o?.dp_amount ?? 0)}</td>
                        <td>{fmt(o?.lunas_amount ?? 0)}</td>
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
                              background: PAYMENT_COLORS[o?.payment_status ?? 'pending'].bg,
                              color: PAYMENT_COLORS[o?.payment_status ?? 'pending'].text,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}
                          >
                            {(PAYMENT_STATUS_LABELS as Record<string, string>)[o?.payment_status ?? 'pending']}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              background: '#d1fae5',
                              color: '#065f46',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}
                          >
                            ✅ Pass
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => {
                                setSelected(o ?? null)
                                setPayForm({
                                  type: 'dp',
                                  amount: String(sisa > 0 ? sisa : ''),
                                  date: new Date().toISOString().slice(0, 10)
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
                            <button
                              onClick={() => handleQcApprove(o!)}
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
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} maxWidth={440} padding="2rem" zIndex={200}>
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
                  onClick={() => setSelected(null)}
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
