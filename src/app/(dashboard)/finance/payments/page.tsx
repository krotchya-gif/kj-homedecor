'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CheckCircle2, DollarSign, AlertTriangle, Search, Lock } from 'lucide-react'
import { STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/types'

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const PAYMENT_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef2f2', text: '#991b1b' },
  partial: { bg: '#fffbeb', text: '#92400e' },
  paid:    { bg: '#d1fae5', text: '#065f46' },
}

export default function FinancePaymentsPage() {
  const [orders, setOrders]     = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('') // pending|partial|paid
  const [selected, setSelected] = useState<any | null>(null)
  const [payForm, setPayForm]   = useState({ type: 'dp', amount: '', date: new Date().toISOString().slice(0,10) })
  const [saving, setSaving]     = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [refundTab, setRefundTab] = useState(false)
  const [refundList, setRefundList] = useState<any[]>([])
  const [processingRefund, setProcessingRefund] = useState<string | null>(null)
  const [refundForm, setRefundForm] = useState({ order_id: '', amount: '', notes: '' })
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userData } = await supabase.from('users').select('id, name').eq('id', user.id).single()
      setCurrentUser(userData)
    }

    const [ordersData, returnsData] = await Promise.all([
      supabase.from('orders').select('id, total_amount, dp_amount, lunas_amount, payment_status, status, created_at, customer:customers(name, phone)').order('created_at', { ascending: false }),
      supabase.from('returns').select('*, order:orders(id, customer:customers(name))').order('created_at', { ascending: false }),
    ])

    setOrders(ordersData.data ?? [])
    setRefundList(returnsData.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // Fetch payment records to check verified_by for a given order
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

    // Insert payment record — auto-verify if cash/received
    await supabase.from('payments').insert({
      order_id: selected.id,
      type: payForm.type,
      amount,
      date: payForm.date,
      verified_by: currentUser?.id ?? 'system',
      verified_at: now,
    })

    // Log payment input
    await supabase.from('order_logs').insert({
      order_id: selected.id,
      action: 'payment_input',
      notes: `Input ${payForm.type === 'dp' ? 'DP' : 'Pelunasan'} Rp${amount.toLocaleString('id-ID')} oleh ${currentUser?.name ?? 'Finance'}`,
      staff_id: currentUser?.id,
    })

    // Update order amounts
    const newDp    = payForm.type === 'dp'    ? selected.dp_amount + amount    : selected.dp_amount
    const newLunas = payForm.type === 'lunas'  ? selected.lunas_amount + amount : selected.lunas_amount
    const total    = selected.total_amount
    const paidSum  = newDp + newLunas
    const newPayStatus = paidSum >= total && total > 0 ? 'paid' : paidSum > 0 ? 'partial' : 'pending'

    await supabase.from('orders').update({
      dp_amount: newDp,
      lunas_amount: newLunas,
      payment_status: newPayStatus,
    }).eq('id', selected.id)

    setSaving(false)
    setSelected(null)
    setPayForm({ type: 'dp', amount: '', date: new Date().toISOString().slice(0,10) })
    load()
  }

  async function handleApprove(order: any) {
    const paidSum = order.dp_amount + order.lunas_amount

    // Gate 1: Payment must be fully paid
    if (paidSum < order.total_amount) {
      alert(`❌ Gagal Approve\n\nSisa pembayaran: ${fmt(order.total_amount - paidSum)}\n\nOrder belum lunas!`)
      return
    }

    // Gate 2: Must have at least one verified payment record
    const verifiedPayment = await getVerifiedPayment(order.id)
    if (!verifiedPayment) {
      alert('❌ Gagal Approve\n\nBelum ada pembayaran yang diverifikasi.\n\nLakukan input pembayaran terlebih dahulu.')
      return
    }

    // Gate 3: Order must be in 'sorted' status before advancing
    if (order.status !== 'sorted') {
      alert(`❌ Status order belum bisa diapprove.\n\nOrder saat ini: "${STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]}"\n\nApprove hanya untuk order dengan status "Sudah Disortir".`)
      return
    }

    // All gates passed — advance to payment_ok
    await supabase.from('orders').update({ status: 'payment_ok' }).eq('id', order.id).eq('status', 'sorted')

    // Log approval
    await supabase.from('order_logs').insert({
      order_id: order.id,
      action: 'payment_approved',
      notes: `Payment gate approved oleh ${currentUser?.name ?? 'Finance'} — lunas Rp${paidSum.toLocaleString('id-ID')}`,
      staff_id: currentUser?.id,
    })

    alert(`✅ Order berhasil diapprove!\n\nStatus berubah menjadi: "Pembayaran OK"\n\nOrder siap masuk ke produksi.`)
    load()
  }

  // Process refund from a return record
  async function handleRefund(returnRecord: any) {
    if (returnRecord.refund_amount <= 0) {
      alert('Tidak ada jumlah refund untuk diproses.')
      return
    }
    if (!confirm(`Proses refund Rp${fmt(returnRecord.refund_amount)} untuk order ${returnRecord.order_id.slice(0,8)}?\n\nIni akan mencatat pengurangan pembayaran.`)) return
    setProcessingRefund(returnRecord.id)
    const { data: { user } } = await supabase.auth.getUser()

    // Insert refund payment
    await supabase.from('payments').insert({
      order_id: returnRecord.order_id,
      type: 'refund',
      amount: returnRecord.refund_amount,
      date: new Date().toISOString(),
      verified_by: user?.id ?? 'unknown',
      verified_at: new Date().toISOString(),
      notes: `Refund untuk return: ${returnRecord.reason}`,
    })

    // Update return status
    await supabase.from('returns').update({ refund_status: 'completed' }).eq('id', returnRecord.id)

    // Log
    await supabase.from('order_logs').insert({
      order_id: returnRecord.order_id,
      action: 'refund_issued',
      notes: `Refund Rp${fmt(returnRecord.refund_amount)} diproses oleh Finance. Alasan return: ${returnRecord.reason}`,
      staff_id: user?.id ?? null,
    })

    setProcessingRefund(null)
    alert(`✅ Refund Rp${fmt(returnRecord.refund_amount)} berhasil diproses!`)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payment Tracking</h1>
        <p className="page-subtitle">DP/Lunas tracking — Payment Gate aktif sebelum order bisa dikirim</p>
      </div>

      {/* Payment Gate Info Banner */}
      <div style={{ background: 'linear-gradient(135deg, #1a0a00, #3d1a08)', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Lock size={18} style={{ color: '#f4a857', flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)' }}>
          <strong style={{ color: '#f4a857' }}>Payment Gate aktif:</strong> Order hanya bisa lanjut ke produksi jika{' '}
          <strong style={{ color: '#fff' }}>(1)</strong> payment_status = 'paid' (DP + Lunas ≥ Total), dan{' '}
          <strong style={{ color: '#fff' }}>(2)</strong> ada record pembayaran dengan verified_by. Finance harus approve manually.
        </div>
      </div>

      {/* Summary stats */}
      <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
        {[
          { label: 'Belum Bayar',  val: orders.filter(o=>o.payment_status==='pending').length,  color:'#ef4444' },
          { label: 'Bayar DP',     val: orders.filter(o=>o.payment_status==='partial').length,  color:'#f59e0b' },
          { label: 'Lunas',        val: orders.filter(o=>o.payment_status==='paid').length,     color:'#22c55e' },
          { label: 'Total Piutang',val: fmt(orders.filter(o=>o.payment_status!=='paid').reduce((s,o)=>s+(o.total_amount-o.dp_amount-o.lunas_amount),0)), color:'#cc7030' },
        ].map(s=>(
          <div className="stat-card" key={s.label}>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value" style={{color:s.color,fontSize:'1.5rem'}}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{ display:'flex', gap:0, borderBottom:'2px solid #e5e7eb', marginBottom:'1.25rem' }}>
        {[
          { key: false, label: '💰 Pembayaran', count: orders.length },
          { key: true, label: '💸 Refund', count: refundList.filter(r=>r.refund_status==='pending').length },
        ].map(t => (
          <button key={String(t.key)} onClick={() => setRefundTab(t.key as boolean)}
            style={{ padding:'0.75rem 1.5rem', background:'none', border:'none', borderBottom:`2px solid ${!refundTab===!t.key?'#cc7030':'transparent'}`,
              cursor:'pointer', fontWeight: !refundTab===!t.key?'700':'500', color: !refundTab===!t.key?'#cc7030':'#6b7280', fontSize:'0.9rem', marginBottom:'-2px',
              display:'flex', alignItems:'center', gap:'0.5rem' }}>
            {t.label}
            {t.count > 0 && (
              <span style={{ background: !refundTab===!t.key?'#cc7030':'#ef4444', color:'#fff', borderRadius:'999px', fontSize:'0.65rem', padding:'0.1rem 0.5rem', fontWeight:'700' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ========== REFUND TAB ========== */}
      {refundTab && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ background:'#fef3c7', border:'1px solid #fde68a', borderRadius:'0.75rem', padding:'1rem 1.25rem', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'0.85rem', color:'#92400e' }}>
              <strong>💸 Refund Tab</strong> — Proses refund untuk order yang di-return customer.<br/>
              Refund akan mengurangi piutang dan dicatat sebagai transaksi keluar.
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
                      <td>
                        <span style={{ background:'#fef3c7', color:'#92400e', padding:'0.2rem 0.6rem', borderRadius:'999px', fontSize:'0.72rem', fontWeight:'600' }}>
                          ⏳ Pending
                        </span>
                      </td>
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
          {/* Completed refunds */}
          {refundList.filter(r=>r.refund_status==='completed').length > 0 && (
            <div style={{ marginTop:'2rem' }}>
              <h3 style={{ fontSize:'0.9rem', fontWeight:'600', color:'#6b7280', marginBottom:'0.75rem' }}>✅ Refund Completed</h3>
              <div className="data-table">
                <table>
                  <thead>
                    <tr><th>Order</th><th>Pelanggan</th><th>Alasan</th><th>Amount</th><th>Tanggal</th></tr>
                  </thead>
                  <tbody>
                    {refundList.filter(r=>r.refund_status==='completed').map(r => (
                      <tr key={r.id}>
                        <td style={{ fontFamily:'monospace', fontSize:'0.78rem', color:'#6b7280' }}>{r.order_id?.slice(0,8)}</td>
                        <td style={{ fontWeight:'500' }}>{r.order?.customer?.name ?? '—'}</td>
                        <td style={{ fontSize:'0.82rem', color:'#6b7280' }}>{r.reason}</td>
                        <td style={{ fontWeight:'600', color:'#cc7030' }}>{fmt(r.refund_amount)}</td>
                        <td style={{ fontSize:'0.75rem', color:'#9ca3af' }}>{r.resolved_at ? new Date(r.resolved_at).toLocaleDateString('id-ID') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter toolbar */}
      {!refundTab && (
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
      )}

      <div className="data-table">
        {loading ? (
          <div style={{ padding:'3rem', textAlign:'center', color:'#9ca3af' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'3rem', textAlign:'center', color:'#9ca3af' }}>
            <DollarSign size={32} style={{ opacity:0.3, margin:'0 auto 0.75rem' }} />
            <p>Tidak ada data pembayaran</p>
          </div>
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
                const canApprove = o.payment_status === 'paid' && o.status === 'sorted'
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
                        {o.status !== 'sorted' && o.status !== 'done' && o.status !== 'payment_ok' && (
                          <span style={{ fontSize:'0.65rem', color:'#9ca3af' }}>Harus sortir dulu</span>
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

      {/* Payment modal */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
          onClick={e=>{ if (e.target===e.currentTarget) setSelected(null) }}>
          <div style={{ background:'#fff', borderRadius:'0.875rem', padding:'2rem', width:'100%', maxWidth:440, boxShadow:'0 25px 60px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize:'1.1rem', fontWeight:'700', marginBottom:'0.5rem' }}>Input Pembayaran</h2>
            <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:'0.5rem', padding:'0.875rem', marginBottom:'1.25rem' }}>
              <div style={{ fontSize:'0.875rem', color:'#374151', marginBottom:'0.25rem' }}>
                <strong>{selected.customer?.name}</strong>
              </div>
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
              {/* Verified info */}
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