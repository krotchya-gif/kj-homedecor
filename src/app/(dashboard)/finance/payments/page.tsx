'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CheckCircle2, DollarSign, Search, Lock, ChevronLeft, ChevronRight } from 'lucide-react'
import { STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/types'
import { createSimpleJournal } from '@/utils/journal/create'
import { useToast } from '@/components/ui/Toast'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const PAGE_SIZE = 20

const PAYMENT_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef2f2', text: '#991b1b' },
  partial: { bg: '#fffbeb', text: '#92400e' },
  paid:    { bg: '#d1fae5', text: '#065f46' },
}

export default function FinancePaymentsPage() {
  const [orders, setOrders]     = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('')
  const [selected, setSelected] = useState<any | null>(null)
  const [payForm, setPayForm]   = useState({ type: 'dp', amount: '', date: new Date().toISOString().slice(0,10) })
  const [saving, setSaving]     = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'payment'|'refund'|'qc'>('payment')
  const [refundList, setRefundList] = useState<any[]>([])
  const [processingRefund, setProcessingRefund] = useState<string | null>(null)
  const [qcOrders, setQcOrders] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const supabase = createClient()
  const { toast } = useToast()

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userData } = await supabase.from('users').select('id, name').eq('id', user.id).single()
      setCurrentUser(userData)
    }

    const from = (currentPage - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const [ordersData, returnsData, qcData] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total_amount, dp_amount, lunas_amount, payment_status, status, created_at, customer:customers(name, phone)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to),
      supabase.from('returns').select('*, order:orders(id, customer:customers(name))').order('created_at', { ascending: false }),
      supabase.from('steam_jobs').select('*, order:orders(id, total_amount, dp_amount, lunas_amount, payment_status, status, customer:customers(name, phone))').eq('result', 'pass').eq('status', 'done'),
    ])

    setOrders(ordersData.data ?? [])
    setTotalCount(ordersData.count ?? 0)
    setRefundList(returnsData.data ?? [])
    const qcApproved = (qcData.data ?? []).filter((sq: any) => sq.order?.payment_status !== 'paid')
    setQcOrders(qcApproved)
    setLoading(false)
  }
  useEffect(() => { load() }, [currentPage])

  async function getVerifiedPayment(orderId: string): Promise<any | null> {
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

  const filtered = orders.filter(o => {
    const matchFilter = !filter || o.payment_status === filter
    const matchSearch = !search || (o.customer?.name ?? '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    const amount = Number(payForm.amount)
    const now = new Date().toISOString()
    await supabase.from('payments').insert({
      order_id: selected.id, type: payForm.type, amount,
      date: payForm.date,
      verified_by: currentUser?.id ?? null,
      verified_at: now,
    })

    // Auto-create journal entry for payment
    try {
      await createSimpleJournal({
        transaction_type: 'payment_received',
        reference_type: 'order',
        reference_id: selected.id,
        description: `${payForm.type === 'dp' ? 'DP' : 'Pelunasan'} dari order ${selected.order_number ?? selected.id.slice(0,8)} — ${selected.customer?.name ?? ''}`,
        amount,
        entry_date: payForm.date,
      })
    } catch (e) {
      // CRITICAL: journal entry gagal = double-entry accounting rusak.
      // Alert user, bukan cuma console.warn.
      const errMsg = e instanceof Error ? e.message : String(e)
      console.error('Failed to create journal entry:', errMsg)
      alert('⚠️ Pembayaran TERCATAT di payments, TAPI journal entry GAGAL.\n\n' +
            'Error: ' + errMsg + '\n\n' +
            'Ini masalah akuntansi serius. Hubungi Owner untuk fix double-entry.\n' +
            'Bisa karena: account_mappings belum di-setup. Lihat /finance/accounts/mapping')
    }
    await supabase.from('order_logs').insert({
      order_id: selected.id, action: 'payment_input',
      notes: `Input ${payForm.type === 'dp' ? 'DP' : 'Pelunasan'} Rp${amount.toLocaleString('id-ID')} oleh ${currentUser?.name ?? 'Finance'}`,
      staff_id: currentUser?.id,
    })
    const newDp    = payForm.type === 'dp'    ? selected.dp_amount + amount    : selected.dp_amount
    const newLunas = payForm.type === 'lunas'  ? selected.lunas_amount + amount : selected.lunas_amount
    const total    = selected.total_amount
    const paidSum  = newDp + newLunas
    const newPayStatus = paidSum >= total && total > 0 ? 'paid' : paidSum > 0 ? 'partial' : 'pending'
    await supabase.from('orders').update({ dp_amount: newDp, lunas_amount: newLunas, payment_status: newPayStatus }).eq('id', selected.id)
    setSaving(false)
    setSelected(null)
    setPayForm({ type: 'dp', amount: '', date: new Date().toISOString().slice(0,10) })
    load()
  }

  async function handleApprove(order: any) {
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
    if (paidSum < freshOrder.total_amount) {
      toast('error', `Gagal Approve — Sisa pembayaran ${fmt(freshOrder.total_amount - paidSum)}, order belum lunas!`)
      return
    }
    if (freshOrder.payment_status !== 'paid') {
      toast('error', `Gagal Approve — payment_status belum 'paid' (saat ini: ${freshOrder.payment_status}).`)
      return
    }
    const verifiedPayment = await getVerifiedPayment(freshOrder.id)
    if (!verifiedPayment) {
      toast('error', 'Gagal Approve — Belum ada pembayaran yang diverifikasi.')
      return
    }

    // ALUR V2 YANG SEBENARNYA: Finance 1 klik Approve = langsung 2 tahap
    //   ready -> payment_ok -> packed
    // Karena Finance TIDAK perlu submit bukti lagi (berbeda dengan Gudang/Penjahit/Installer
    // yang perlu detail pesanan untuk lanjut). Finance cukup konfirmasi lunas, sisanya
    // adalah auto-advance ke Gudang untuk packing.

    if (freshOrder.status === 'ready') {
      // Auto-advance: ready -> payment_ok (Finance verify) -> packed (lanjut Gudang)
      // Step 1: ready -> payment_ok
      const { error: step1Err } = await supabase
        .from('orders')
        .update({ status: 'payment_ok' })
        .eq('id', freshOrder.id)
        .eq('status', 'ready')
      if (step1Err) {
        toast('error', 'Gagal update ke Cek Bayar: ' + step1Err.message)
        return
      }
      await supabase.from('order_logs').insert({
        order_id: freshOrder.id, action: 'payment_verified',
        notes: `Payment verified oleh ${currentUser?.name ?? 'Finance'} — lunas Rp${paidSum.toLocaleString('id-ID')}. Status: ready → payment_ok`,
        staff_id: currentUser?.id,
      })

      // Step 2: payment_ok -> packed (Finance tidak perlu submit bukti lagi,
      // auto-advance ke Gudang untuk packing)
      const { error: step2Err } = await supabase
        .from('orders')
        .update({ status: 'packed' })
        .eq('id', freshOrder.id)
        .eq('status', 'payment_ok')
      if (step2Err) {
        toast('error', 'Gagal auto-advance ke Dikemas: ' + step2Err.message)
        return
      }
      await supabase.from('order_logs').insert({
        order_id: freshOrder.id, action: 'packed',
        notes: `Auto-advance ke Dikemas (siap untuk packing oleh Gudang) — order sudah lunas, tidak perlu detail submission di Finance. Status: payment_ok → packed`,
        staff_id: currentUser?.id,
      })
      toast('success', '✅ Order berhasil diapprove! Status: Siap → Cek Bayar → Dikemas. Lanjut Gudang untuk input resi.')
    } else if (freshOrder.status === 'payment_ok') {
      // Order sudah di-approve sampai Cek Bayar, lanjut ke packed
      const { error: step2Err } = await supabase
        .from('orders')
        .update({ status: 'packed' })
        .eq('id', freshOrder.id)
        .eq('status', 'payment_ok')
      if (step2Err) {
        toast('error', 'Gagal auto-advance ke Dikemas: ' + step2Err.message)
        return
      }
      toast('success', '✅ Lanjut ke Dikemas.')
    } else if (freshOrder.status === 'packed') {
      toast('info', 'Order sudah di Dikemas. Gudang tinggal input resi (di /admin/shipping).')
      load()
      return
    } else if (freshOrder.status === 'shipped' || freshOrder.status === 'done') {
      toast('info', 'Order sudah selesai.')
      load()
      return
    } else if (freshOrder.status === 'steam') {
      toast('warning', `Order masih di "Steam/QC". Gudang harus QC Pass dulu di /gudang/steam sebelum Finance bisa approve.`)
      return
    } else {
      toast('error', `Status order belum bisa diapprove: "${STATUS_LABELS[freshOrder.status as keyof typeof STATUS_LABELS]}".`)
      return
    }
    load()
  }

  async function handleQcApprove(order: any) {
    if (!confirm(`Konfirmasi Approve Order\n\nPelanggan: ${order.customer?.name ?? '-'}\nTotal: ${fmt(order.total_amount)} — Lunas\n\nStatus akan berubah menjadi "Siap Kirim" dan order siap dikemas/dikirim.`)) return
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
      toast('error', `Status order belum bisa diapprove. Order saat ini: "${(STATUS_LABELS as Record<string,string>)[order.status]}"`)
      return
    }
    await supabase.from('orders').update({ status: 'ready' }).eq('id', order.id).eq('status', 'steam')
    await supabase.from('order_logs').insert({
      order_id: order.id, action: 'payment_approved',
      notes: `QC Approved — Finance approve oleh ${currentUser?.name ?? 'Finance'} — lunas Rp${paidSum.toLocaleString('id-ID')}`,
      staff_id: currentUser?.id,
    })
    toast('success', 'Order berhasil diapprove! Status berubah menjadi "Siap Kirim". Order siap dikemas dan dikirim.')
    load()
  }

  async function handleRefund(returnRecord: any) {
    if (returnRecord.refund_amount <= 0) { toast('warning', 'Tidak ada jumlah refund untuk diproses.'); return }
    if (!confirm(`Proses refund Rp${fmt(returnRecord.refund_amount)} untuk order ${returnRecord.order_id.slice(0,8)}?\n\nIni akan mencatat pengurangan pembayaran.`)) return
    setProcessingRefund(returnRecord.id)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('payments').insert({
      order_id: returnRecord.order_id, type: 'refund', amount: returnRecord.refund_amount,
      date: new Date().toISOString(), verified_by: user?.id ?? null, verified_at: new Date().toISOString(),
      notes: `Refund untuk return: ${returnRecord.reason}`,
    })
    await supabase.from('returns').update({ refund_status: 'completed' }).eq('id', returnRecord.id)
    await supabase.from('order_logs').insert({
      order_id: returnRecord.order_id, action: 'refund_issued',
      notes: `Refund Rp${fmt(returnRecord.refund_amount)} diproses oleh Finance. Alasan return: ${returnRecord.reason}`,
      staff_id: user?.id ?? null,
    })
    setProcessingRefund(null)
    toast('success', `Refund ${fmt(returnRecord.refund_amount)} berhasil diproses!`)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payment Tracking</h1>
        <p className="page-subtitle">DP/Lunas tracking — Payment Gate aktif sebelum order bisa dikirim</p>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #1a0a00, #3d1a08)', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Lock size={18} style={{ color: '#f4a857', flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)' }}>
          <strong style={{ color: '#f4a857' }}>Payment Gate aktif:</strong> Order hanya bisa lanjut ke <strong>packing</strong> jika{' '}
          <strong style={{ color: '#fff' }}>(1)</strong> payment_status = 'paid' (DP + Lunas ≥ Total), dan{' '}
          <strong style={{ color: '#fff' }}>(2)</strong> ada record pembayaran dengan verified_by. Finance harus approve manual dari status <strong>Siap</strong> ke <strong>Cek Bayar</strong>.
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
        {[
          { label: 'Belum Bayar',  val: orders.filter(o=>o.payment_status==='pending').length,  color:'#ef4444' },
          { label: 'Bayar DP',     val: orders.filter(o=>o.payment_status==='partial').length,  color:'#f59e0b' },
          { label: 'Lunas',        val: orders.filter(o=>o.payment_status==='paid').length,     color:'#22c55e' },
          { label: 'Total Piutang',val: fmt(Math.max(0, orders.filter(o=>o.payment_status!=='paid').reduce((s,o)=>s+(o.total_amount-o.dp_amount-o.lunas_amount),0))), color:'#cc7030' },
        ].map(s=>(
          <div className="stat-card" key={s.label}>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value" style={{color:s.color,fontSize:'1.5rem'}}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:0, borderBottom:'2px solid #e5e7eb', marginBottom:'1.25rem' }}>
        {[
          { key: 'payment', label: '💰 Pembayaran', count: orders.length },
          { key: 'qc', label: '✅ QC Approved', count: qcOrders.length },
          { key: 'refund', label: '💸 Refund', count: refundList.filter(r=>r.refund_status==='pending').length },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as 'payment'|'refund'|'qc')}
            style={{ padding:'0.75rem 1.5rem', background:'none', border:'none', borderBottom:`2px solid ${activeTab===t.key?'#cc7030':'transparent'}`,
              cursor:'pointer', fontWeight: activeTab===t.key?'700':'500', color: activeTab===t.key?'#cc7030':'#6b7280', fontSize:'0.9rem', marginBottom:'-2px',
              display:'flex', alignItems:'center', gap:'0.5rem' }}>
            {t.label}
            {t.count > 0 && (
              <span style={{ background: activeTab===t.key?'#cc7030':'#ef4444', color:'#fff', borderRadius:'999px', fontSize:'0.65rem', padding:'0.1rem 0.5rem', fontWeight:'700' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'refund' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ background:'#fef3c7', border:'1px solid #fde68a', borderRadius:'0.75rem', padding:'1rem 1.25rem', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'0.85rem', color:'#92400e' }}>
              <strong>💸 Refund Tab</strong> — Proses refund untuk order yang di-return customer.
            </div>
          </div>
          {refundList.filter(r=>r.refund_status==='pending').length === 0 ? (
            <div style={{ padding:'3rem', textAlign:'center', color:'#9ca3af', background:'#fff', border:'1px solid #e5e7eb', borderRadius:'0.75rem' }}>
              <p>Tidak ada refund yang menunggu proses</p>
            </div>
          ) : (
            <div className="data-table">
              <table>
                <thead>
                  <tr><th>Order</th><th>Pelanggan</th><th>Alasan Return</th><th>Refund Amount</th><th>Status</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {refundList.filter(r=>r.refund_status==='pending').map(r => (
                    <tr key={r.id}>
                      <td style={{ fontFamily:'monospace', fontSize:'0.78rem', color:'#6b7280' }}>{r.order_id?.slice(0,8)}</td>
                      <td style={{ fontWeight:'500' }}>{r.order?.customer?.name ?? '—'}</td>
                      <td style={{ fontSize:'0.82rem', color:'#6b7280' }}>{r.reason}</td>
                      <td style={{ fontWeight:'700', color:'#cc7030' }}>{fmt(r.refund_amount)}</td>
                      <td><span style={{ background:'#fef3c7', color:'#92400e', padding:'0.2rem 0.6rem', borderRadius:'999px', fontSize:'0.72rem', fontWeight:'600' }}>⏳ Pending</span></td>
                      <td>
                        <button onClick={() => handleRefund(r)} disabled={processingRefund === r.id}
                          style={{ padding:'0.4rem 1rem', background:'#16a34a', color:'#fff', border:'none', borderRadius:'0.375rem', fontSize:'0.78rem', fontWeight:'600', cursor: processingRefund === r.id ? 'not-allowed' : 'pointer' }}>
                          {processingRefund === r.id ? '...' : '💸 Proses Refund'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'payment' && (
        <>
          <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:1, minWidth:200 }}>
              <Search size={15} style={{ position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }} />
              <input type="text" placeholder="Cari nama pelanggan..." value={search} onChange={e=>setSearch(e.target.value)}
                style={{ width:'100%', padding:'0.625rem 1rem 0.625rem 2.25rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none' }} />
            </div>
            <select value={filter} onChange={e=>setFilter(e.target.value)}
              style={{ padding:'0.625rem 1rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', background:'#fff', outline:'none' }}>
              <option value="">Semua Status</option>
              <option value="pending">Belum Bayar</option>
              <option value="partial">Bayar DP</option>
              <option value="paid">Lunas</option>
            </select>
          </div>

          <div className="data-table">
            {loading ? (
              <div style={{ padding: '1.5rem' }}><TableSkeleton rows={8} cols={8} /></div>
            ) : filtered.length === 0 ? (
              <EmptyState icon="💰" title="Tidak ada data pembayaran" description="Tidak ada pembayaran yang cocok dengan filter saat ini." />
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Pelanggan</th><th>Total</th><th>DP</th><th>Lunas</th>
                    <th>Sisa</th><th>Status Bayar</th><th>Status Order</th><th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(o => {
                    const sisa = o.total_amount - o.dp_amount - o.lunas_amount
                    const paidSum = o.dp_amount + o.lunas_amount
                    const pc = PAYMENT_COLORS[o.payment_status]
                    const canApprove = o.payment_status === 'paid' && o.status === 'ready'
                    return (
                      <tr key={o.id}>
                        <td style={{ fontWeight:'500' }}>{o.customer?.name ?? '—'}</td>
                        <td style={{ fontWeight:'600', color:'#cc7030' }}>{fmt(o.total_amount)}</td>
                        <td>{fmt(o.dp_amount)}</td>
                        <td>{fmt(o.lunas_amount)}</td>
                        <td style={{ fontWeight:'600', color: sisa > 0 ? '#ef4444' : '#16a34a' }}>{fmt(sisa)}</td>
                        <td>
                          <span style={{ ...pc, padding:'0.2rem 0.6rem', borderRadius:'999px', fontSize:'0.72rem', fontWeight:'600' }}>
                            {(PAYMENT_STATUS_LABELS as Record<string,string>)[o.payment_status]}
                          </span>
                        </td>
                        <td>
                          <div style={{ display:'flex', flexDirection:'column', gap:'0.25rem' }}>
                            <span style={{ fontSize:'0.78rem', color:'#6b7280' }}>{(STATUS_LABELS as Record<string,string>)[o.status]}</span>
                            {o.status === 'sorted' && o.payment_status === 'paid' && (
                              <span style={{ fontSize:'0.65rem', color:'#16a34a', fontWeight:'600' }}>✓ Bisa Approve</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                            <button onClick={() => { setSelected(o); setPayForm({type:'dp',amount:String(sisa > 0 ? sisa : ''),date:new Date().toISOString().slice(0,10)}) }}
                              style={{ padding:'0.3rem 0.75rem', background:'#cc7030', color:'#fff', border:'none', borderRadius:'0.375rem', fontSize:'0.75rem', fontWeight:'600', cursor:'pointer' }}>
                              Input Bayar
                            </button>
                            {canApprove ? (
                              <button onClick={() => handleApprove(o)}
                                style={{ padding:'0.3rem 0.75rem', background:'#16a34a', color:'#fff', border:'none', borderRadius:'0.375rem', fontSize:'0.75rem', fontWeight:'600', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.2rem' }}>
                                <CheckCircle2 size={12}/> Approve
                              </button>
                            ) : (
                              <button disabled
                                style={{ padding:'0.3rem 0.75rem', background:'#f3f4f6', color:'#d1d5db', border:'none', borderRadius:'0.375rem', fontSize:'0.75rem', fontWeight:'600', cursor:'not-allowed', display:'flex', alignItems:'center', gap:'0.2rem' }}>
                                <Lock size={11}/> Approve
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
          {!loading && filtered.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', padding: '0.75rem 0', borderTop: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                Halaman {currentPage} dari {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))} — {totalCount} order
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', color: currentPage === 1 ? '#9ca3af' : '#374151' }}
                >
                  <ChevronLeft size={14} /> Sebelumnya
                </button>
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: '#fff', cursor: currentPage >= Math.ceil(totalCount / PAGE_SIZE) ? 'not-allowed' : 'pointer', fontSize: '0.8rem', color: currentPage >= Math.ceil(totalCount / PAGE_SIZE) ? '#9ca3af' : '#374151' }}
                >
                  Selanjutnya <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'qc' && (
        <div>
          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'0.75rem', padding:'1rem 1.25rem', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'0.85rem', color:'#166534' }}>
              <strong>✅ QC Approved</strong> — Order yang sudah LULUS QC Steam/QC dari Gudang.
            </div>
          </div>
          {qcOrders.length === 0 ? (
            <div style={{ padding:'3rem', textAlign:'center', color:'#9ca3af', background:'#fff', border:'1px solid #e5e7eb', borderRadius:'0.75rem' }}>
              <CheckCircle2 size={32} style={{ opacity:0.3, margin:'0 auto 0.75rem' }} />
              <p>Tidak ada order yang menunggu approval</p>
            </div>
          ) : (
            <div className="data-table">
              <table>
                <thead>
                  <tr><th>Pelanggan</th><th>Total</th><th>DP</th><th>Lunas</th><th>Sisa</th><th>Status Bayar</th><th>QC Steam</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {qcOrders.map(qc => {
                    const o = qc.order
                    const sisa = (o?.total_amount ?? 0) - (o?.dp_amount ?? 0) - (o?.lunas_amount ?? 0)
                    return (
                      <tr key={qc.id}>
                        <td style={{ fontWeight:'500' }}>{o?.customer?.name ?? '—'}</td>
                        <td style={{ fontWeight:'600', color:'#cc7030' }}>{fmt(o?.total_amount ?? 0)}</td>
                        <td>{fmt(o?.dp_amount ?? 0)}</td>
                        <td>{fmt(o?.lunas_amount ?? 0)}</td>
                        <td style={{ fontWeight:'600', color: sisa > 0 ? '#ef4444' : '#16a34a' }}>{fmt(sisa)}</td>
                        <td>
                          <span style={{ background: PAYMENT_COLORS[o?.payment_status ?? 'pending'].bg, color: PAYMENT_COLORS[o?.payment_status ?? 'pending'].text, padding:'0.2rem 0.6rem', borderRadius:'999px', fontSize:'0.72rem', fontWeight:'600' }}>
                            {(PAYMENT_STATUS_LABELS as Record<string,string>)[o?.payment_status ?? 'pending']}
                          </span>
                        </td>
                        <td><span style={{ background:'#d1fae5', color:'#065f46', padding:'0.2rem 0.6rem', borderRadius:'999px', fontSize:'0.72rem', fontWeight:'600' }}>✅ Pass</span></td>
                        <td>
                          <div style={{ display:'flex', gap:'0.5rem' }}>
                            <button onClick={() => { setSelected(o); setPayForm({type:'dp',amount:String(sisa > 0 ? sisa : ''),date:new Date().toISOString().slice(0,10)}) }}
                              style={{ padding:'0.3rem 0.75rem', background:'#cc7030', color:'#fff', border:'none', borderRadius:'0.375rem', fontSize:'0.75rem', fontWeight:'600', cursor:'pointer' }}>
                              Input Bayar
                            </button>
                            <button onClick={() => handleQcApprove(o)}
                              style={{ padding:'0.3rem 0.75rem', background:'#16a34a', color:'#fff', border:'none', borderRadius:'0.375rem', fontSize:'0.75rem', fontWeight:'600', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.2rem' }}>
                              <CheckCircle2 size={12}/> Approve
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
          onClick={e=>{ if (e.target===e.currentTarget) setSelected(null) }}>
          <div style={{ background:'#fff', borderRadius:'0.875rem', padding:'2rem', width:'100%', maxWidth:440, boxShadow:'0 25px 60px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize:'1.1rem', fontWeight:'700', marginBottom:'0.5rem' }}>Input Pembayaran</h2>
            <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:'0.5rem', padding:'0.875rem', marginBottom:'1.25rem' }}>
              <div style={{ fontSize:'0.875rem', color:'#374151', marginBottom:'0.25rem' }}><strong>{selected.customer?.name}</strong></div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8rem', color:'#6b7280' }}>
                <span>Total: <strong style={{color:'#cc7030'}}>{fmt(selected.total_amount)}</strong></span>
                <span>Sisa: <strong style={{color:'#ef4444'}}>{fmt(selected.total_amount - selected.dp_amount - selected.lunas_amount)}</strong></span>
              </div>
            </div>
            <form onSubmit={handlePay} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.3rem' }}>Jenis Pembayaran</label>
                <div style={{ display:'flex', gap:'0.75rem' }}>
                  {['dp','lunas'].map(t=>(
                    <label key={t} style={{ display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer', fontWeight:'500', fontSize:'0.875rem' }}>
                      <input type="radio" name="paytype" value={t} checked={payForm.type===t} onChange={()=>setPayForm(f=>({...f,type:t}))} />
                      {t==='dp' ? 'DP (Uang Muka)' : 'Pelunasan'}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.3rem' }}>Jumlah (Rp) *</label>
                <input required type="number" min="1" placeholder="0" value={payForm.amount} onChange={e=>setPayForm(f=>({...f,amount:e.target.value}))}
                  style={{ width:'100%', padding:'0.625rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.3rem' }}>Tanggal</label>
                <input type="date" value={payForm.date} onChange={e=>setPayForm(f=>({...f,date:e.target.value}))}
                  style={{ width:'100%', padding:'0.625rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none' }} />
              </div>
              <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'0.375rem', padding:'0.625rem 0.875rem', fontSize:'0.78rem', color:'#166534', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <CheckCircle2 size={13} style={{ color:'#16a34a', flexShrink:0 }} />
                Pembayaran ini akan langsung diverifikasi oleh <strong>{currentUser?.name ?? 'Finance'}</strong>
              </div>
              <div style={{ display:'flex', gap:'0.75rem' }}>
                <button type="button" onClick={()=>setSelected(null)} style={{ flex:1, padding:'0.75rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', background:'#fff', cursor:'pointer', fontWeight:'600' }}>Batal</button>
                <button type="submit" disabled={saving} style={{ flex:1, padding:'0.75rem', background:'#cc7030', color:'#fff', border:'none', borderRadius:'0.5rem', cursor:saving?'not-allowed':'pointer', fontWeight:'600' }}>
                  {saving ? 'Menyimpan...' : 'Simpan Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}