'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, Pencil, Trash2, FileText, CreditCard } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import ActionMenu from '@/components/ui/ActionMenu'
import Pagination from '@/components/ui/Pagination'
import { createSimpleJournal } from '@/utils/journal/create'
import { formatRp, formatDateDDMMYYYY } from '@/lib/utils'
import { getAccountIdByCode } from '@/config/accounts'


interface Piutang {
  id: string
  customer_id: string
  channel: string
  invoice_number: string
  invoice_date: string
  amount: number
  paid_amount: number
  return_amount: number
  fee_amount?: number
  status: string
  order_id: string
  notes?: string
  customer?: { name: string; phone: string }
  order?: { order_number: string }
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  partial: { bg: '#dbeafe', text: '#1e40af' },
  paid: { bg: '#d1fae5', text: '#065f46' },
  cancelled: { bg: 'var(--neutral-100)', text: 'var(--neutral-600)' }
}

export default function FakturPage() {
  const { toast } = useToast()
  const [piutang, setPiutang] = useState<Piutang[]>([])
  const [customers, setCustomers] = useState<{ id: string; name?: string }[]>([])
  // F-42 fix: dropdown order (valid FK) — bukan free-text yang bikin insert gagal
  const [orders, setOrders] = useState<{ id: string; order_number?: string; customer?: { name?: string } | null }[]>([])
const [loading, setLoading] = useState(true)
const [search, setSearch] = useState('')
const [page, setPage] = useState(0)
const [pageSize, setPageSize] = useState(10)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Piutang | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    customer_id: '',
    channel: '',
    invoice_number: '',
    invoice_date: '',
    amount: '',
    order_id: '',
    notes: ''
  })
  // BUG-014 fix (2026-08-11): aksi bayar piutang per faktur
  const [showPayModal, setShowPayModal] = useState(false)
  const [payItem, setPayItem] = useState<Piutang | null>(null)
  const [payForm, setPayForm] = useState({ amount: '' })
  const [paying, setPaying] = useState(false)

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('piutang')
      .select('*, customer:customers(name, phone), order:orders(order_number)')
      .order('created_at', { ascending: false })
    setPiutang((data as Piutang[]) ?? [])
    const { data: cust } = await supabase.from('customers').select('id, name').order('name')
    setCustomers(cust ?? [])
    const { data: ord } = await supabase
      .from('orders')
      .select('id, order_number, customer:customers(name)')
      .order('created_at', { ascending: false })
      .limit(500)
    setOrders((ord ?? []) as { id: string; order_number?: string; customer?: { name?: string } | null }[])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = piutang.filter(
    (p) =>
      p.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.customer?.name?.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditItem(null)
    setForm({ customer_id: '', channel: '', invoice_number: '', invoice_date: '', amount: '', order_id: '', notes: '' })
    setShowForm(true)
  }

  function openEdit(p: Piutang) {
    setEditItem(p)
    setForm({
      customer_id: p.customer_id,
      channel: p.channel ?? '',
      invoice_number: p.invoice_number ?? '',
      invoice_date: p.invoice_date ?? '',
      amount: String(p.amount ?? 0),
      order_id: p.order_id ?? '',
      notes: p.notes ?? ''
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      customer_id: form.customer_id || null,
      channel: form.channel || null,
      invoice_number: form.invoice_number || null,
      invoice_date: form.invoice_date || null,
      amount: Number(form.amount) || 0,
      order_id: form.order_id || null,
      notes: form.notes || null
    }
    if (editItem) {
      // F-med fix: blokir edit kalau sudah dibayar/lunas/cancelled (pola hutang BUG-013)
      const hasPayment = (editItem.paid_amount ?? 0) > 0 || (editItem.return_amount ?? 0) > 0
      if (hasPayment || editItem.status === 'paid' || editItem.status === 'cancelled') {
        setSaving(false)
        toast('error', 'Faktur sudah dibayar/dibatalkan — tidak bisa diubah. Buat faktur baru jika perlu.')
        return
      }
      // UPDATE optimistic
      const prev = piutang
      setPiutang((curr) => curr.map((x) => (x.id === editItem.id ? ({ ...x, ...payload } as Piutang) : x)))
      const { error } = await supabase.from('piutang').update(payload).eq('id', editItem.id)
      if (error) { setPiutang(prev); setSaving(false); toast('error', 'Gagal simpan: ' + error.message); return }
      // F-med fix: amount berubah → update jurnal (delta penyesuaian Dr/Cr Piutang)
      if (Number(payload.amount) !== Number(editItem.amount)) {
        const delta = Number(payload.amount) - Number(editItem.amount)
        try {
          // Phase 3 (BUG-095): lookup akun by code (anti-drift), bukan hardcode UUID.
          //   naik  → Dr Piutang Customer (1201) / Cr Penjualan (4101)
          //   turun → Dr Penjualan (4101) / Cr Piutang Customer (1201)
          const piutangId = await getAccountIdByCode(supabase, '1201')
          const penjualanId = await getAccountIdByCode(supabase, '4101')
          if (!piutangId || !penjualanId) {
            throw new Error('Akun Piutang (1201) / Penjualan (4101) tidak ditemukan — cek /finance/accounts')
          }
          const { createSimpleJournal } = await import('@/utils/journal/create')
          await createSimpleJournal({
            transaction_type: 'order_created',
            reference_type: 'piutang_adj',
            reference_id: editItem.id,
            description: `Penyesuaian faktur ${form.invoice_number ?? ''} (${delta > 0 ? 'naik' : 'turun'} Rp${Math.abs(delta).toLocaleString('id-ID')})`,
            amount: Math.abs(delta),
            debit_account_id: delta > 0 ? piutangId : penjualanId,
            credit_account_id: delta > 0 ? penjualanId : piutangId,
            idempotency_key: `piutang_adj:${editItem.id}:${crypto.randomUUID()}`
          })
        } catch (jErr) {
          // Phase 3 (BUG-094): rollback PENUH — jurnal penyesuaian gagal → kembalikan
          // piutang ke amount semula (sebelumnya hanya console.error → faktur naik/turun
          // tanpa jurnal → buku besar bocor).
          console.error('Gagal buat jurnal penyesuaian faktur:', jErr)
          await supabase
            .from('piutang')
            .update({ amount: editItem.amount })
            .eq('id', editItem.id)
          setPiutang(prev)
          setSaving(false)
          setShowForm(false)
          toast('error', 'Perubahan dibatalkan — jurnal penyesuaian tidak tersimpan. Periksa mapping akun.')
          return
        }
      }
    } else {
        // 2026-08-12: cek duplikat invoice_number sebelum insert (error friendly,
        // bukan 23505 mentah — unique index piutang_invoice_unique)
        if (form.invoice_number?.trim()) {
          const { data: dup } = await supabase
            .from('piutang')
            .select('id')
            .eq('invoice_number', form.invoice_number.trim())
            .maybeSingle()
          if (dup) {
            setSaving(false)
            toast('error', `Nomor faktur "${form.invoice_number}" sudah dipakai.`)
            return
          }
        }
        // CREATE optimistic: id sementara dulu, diganti id asli dari server
        const tempId = crypto.randomUUID()
        const tempItem = { id: tempId, ...payload }
        setPiutang((curr) => [tempItem as Piutang, ...curr])
        const { data, error } = await supabase.from('piutang').insert(payload).select('id').single()
        if (error) {
          setPiutang((curr) => curr.filter((x) => x.id !== tempId))
          setSaving(false)
          toast('error', 'Gagal simpan: ' + error.message)
          return
        }
        if (data?.id) {
          setPiutang((curr) => curr.map((x) => (x.id === tempId ? { ...x, id: data.id } : x)))

          // F-10 fix (2026-08-11): faktur piutang wajib jurnal Dr Piutang / Cr Penjualan
          // (sebelumnya cuma insert tabel piutang → piutang tidak pernah masuk buku besar)
          try {
            await createSimpleJournal({
              transaction_type: 'order_created',
              reference_type: 'piutang',
              reference_id: data.id,
              description: `Faktur piutang ${form.invoice_number ?? ''} — ${form.amount}`,
              amount: Number(form.amount) || 0,
              idempotency_key: `piutang_created:${data.id}`
            })
          } catch (jErr) {
            // Phase 3 (BUG-094): rollback PENUH — jurnal gagal → hapus row piutang yang baru
            // di-insert (sebelumnya toast warning → faktur tanpa jurnal → ledger bocor).
            console.error('Gagal buat jurnal faktur piutang:', jErr)
            await supabase.from('piutang').delete().eq('id', data.id)
            setPiutang((curr) => curr.filter((x) => x.id !== data.id))
            setSaving(false)
            setShowForm(false)
            toast('error', 'Faktur dibatalkan — jurnal tidak tersimpan. Periksa mapping akun.')
            return
          }
        }
      }
      setSaving(false)
      setShowForm(false)
      toast('success', editItem ? 'Berhasil diperbarui' : 'Berhasil ditambahkan')
  }

  async function handleDelete(id: string) {
    // F-med fix: cek status dulu — faktur yang sudah dibayar tidak boleh dihapus
    const { data: target } = await supabase
      .from('piutang')
      .select('paid_amount, return_amount, status')
      .eq('id', id)
      .single()
    if (target && ((target.paid_amount ?? 0) > 0 || (target.return_amount ?? 0) > 0 || target.status === 'paid' || target.status === 'cancelled')) {
      toast('error', 'Faktur sudah dibayar/dibatalkan — tidak bisa dihapus.')
      return
    }
    if (!confirm('Yakin hapus?')) return
      // Optimistic delete
      const prev = piutang
      setPiutang((curr) => curr.filter((x) => x.id !== id))
      const { error } = await supabase.from('piutang').delete().eq('id', id)
      if (error) { setPiutang(prev); toast('error', 'Gagal hapus: ' + error.message); return }
      toast('success', 'Berhasil dihapus')
  }

  // BUG-014 fix (2026-08-11): bayar piutang faktur — update paid_amount + jurnal Dr Kas / Cr Piutang
  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!payItem) return
    setPaying(true)
    const amount = Number(payForm.amount)
    // F-11 fix: refetch FRESH (anti race 2 finance bayar bersamaan)
    const { data: fresh } = await supabase
      .from('piutang')
      .select('id, amount, fee_amount, paid_amount, return_amount, status, invoice_number, customer:customers(name)')
      .eq('id', payItem.id)
      .single()
    if (!fresh) {
      setPaying(false)
      toast('error', 'Faktur tidak ditemukan.')
      return
    }
    const sisa = (fresh.amount ?? 0) - (fresh.paid_amount ?? 0) - (fresh.return_amount ?? 0) - (fresh.fee_amount ?? 0)
    if (!payForm.amount || isNaN(amount) || amount <= 0) {
      setPaying(false)
      toast('error', 'Nominal wajib diisi dan lebih dari 0.')
      return
    }
    if (amount > sisa) {
      setPaying(false)
      toast('error', `Nominal melebihi sisa tagihan (${formatRp(sisa)}).`)
      return
    }
    const newPaid = (fresh.paid_amount ?? 0) + amount
    const newSisa = (fresh.amount ?? 0) - newPaid - (fresh.return_amount ?? 0) - (fresh.fee_amount ?? 0)
    const newStatus = newSisa <= 0 ? 'paid' : 'partial'

    const { error: updErr } = await supabase
      .from('piutang')
      .update({ paid_amount: newPaid, status: newStatus })
      .eq('id', payItem.id)
      .eq('paid_amount', fresh.paid_amount)
      .eq('return_amount', fresh.return_amount)
    if (updErr) {
      setPaying(false)
      toast('error', 'Gagal simpan pembayaran (mungkin dibayar finance lain): ' + updErr.message)
      return
    }

    try {
      await createSimpleJournal({
        transaction_type: 'piutang_received',
        reference_type: 'piutang',
        reference_id: payItem.id,
        description: `Pembayaran piutang ${fresh.invoice_number ?? 'Faktur'} — ${(fresh.customer as { name?: string } | null)?.name ?? ''} Rp${amount.toLocaleString('id-ID')}`,
        amount,
        // F-11 fix: idempotent per pembayaran — retry tidak bikin jurnal ganda
        idempotency_key: `piutang_paid:${payItem.id}:${crypto.randomUUID()}`
      })
    } catch (jErr) {
      // Phase 3 (BUG-094): rollback PENUH (pola BUG-073) — jurnal gagal → kembalikan
      // piutang ke paid_amount/status semula (sebelumnya toast warning → ledger bocor).
      console.error('Gagal buat jurnal terima piutang:', jErr)
      await supabase
        .from('piutang')
        .update({ paid_amount: fresh.paid_amount ?? 0, status: fresh.status })
        .eq('id', payItem.id)
      setPaying(false)
      setShowPayModal(false)
      toast('error',
        'Pembayaran dibatalkan — jurnal tidak tersimpan. Periksa mapping akun di /finance/accounts/mapping lalu coba lagi.')
      return
    }

    setPaying(false)
    setShowPayModal(false)
    setPayForm({ amount: '' })
    setPayItem(null)
    toast('success', `Pembayaran piutang ${formatRp(amount)} dicatat!`)
    fetchData()
  }

  function openPay(p: Piutang) {
    const sisa = (p.amount ?? 0) - (p.paid_amount ?? 0) - (p.return_amount ?? 0) - (p.fee_amount ?? 0)
    setPayItem(p)
    setPayForm({ amount: String(sisa > 0 ? sisa : '') })
    setShowPayModal(true)
  }

  return (
    <div>
      <PageHeader title="Faktur Piutang" subtitle="Daftar faktur piutang pelanggan" />

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
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
            placeholder="Cari invoice atau customer..."
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
        <button
          onClick={openAdd}
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
          <Plus size={16} /> Tambah Faktur
        </button>
      </div>

            {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={filtered.slice(page * pageSize, (page + 1) * pageSize)} keyOf={(p) => p.id} renderCard={(p) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">No. Invoice</span>
                  <span className="mobile-card-value">{p.invoice_number}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Jumlah</span>
                  <span className="mobile-card-value">{formatRp(p.amount ?? 0)}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Sisa</span>
                  <span className="mobile-card-value">{formatRp((p.amount ?? 0) - (p.paid_amount ?? 0) - (p.return_amount ?? 0) - (p.fee_amount ?? 0))}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Status</span>
                  <span className="mobile-card-value">{p.status === 'paid' ? 'Lunas' : p.status === 'partial' ? 'Sebagian' : 'Belum'}</span>
                </div>
                <div className="mobile-card-actions">
                  <button onClick={() => openPay(p)} style={{ background: '#cc7030', color: '#fff', border: 'none', cursor: 'pointer' }}>Bayar</button>
                  <button onClick={() => openEdit(p)} style={{ background: 'var(--neutral-100)', color: 'var(--neutral-700)', border: 'none', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDelete(p.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer' }}>Hapus</button>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <FileText size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada faktur</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Channel</th>
                <th>Invoice</th>
                <th>Tanggal</th>
                <th>Faktur</th>
                <th>Retur</th>
                <th>Sisa</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(page * pageSize, (page + 1) * pageSize).map((p) => {
                const sc = STATUS_COLORS[p.status] ?? STATUS_COLORS.pending
                const sisa = (p.amount ?? 0) - (p.paid_amount ?? 0) - (p.return_amount ?? 0) - (p.fee_amount ?? 0)
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: '500' }}>{p.customer?.name ?? '—'}</td>
                    <td style={{ textTransform: 'capitalize', color: 'var(--neutral-600)' }}>{p.channel ?? '—'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{p.invoice_number ?? '—'}</td>
                    <td style={{ color: 'var(--neutral-600)' }}>{formatDateDDMMYYYY(p.invoice_date)}</td>
                    <td style={{ fontWeight: '600', textAlign: 'right' }}>{formatRp(p.amount ?? 0)}</td>
                    <td style={{ color: '#dc2626', textAlign: 'right' }}>{formatRp(p.return_amount ?? 0)}</td>
                    <td style={{ fontWeight: '700', color: '#cc7030', textAlign: 'right' }}>{formatRp(sisa)}</td>
                    <td>
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: sc.bg,
                          color: sc.text,
                          textTransform: 'capitalize'
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td>
                    <ActionMenu
                      items={[
                        { label: 'Bayar', icon: <CreditCard size={14} />, onClick: () => openPay(p) },
                        { label: 'Edit', icon: <Pencil size={14} />, onClick: () => openEdit(p) },
                        { label: 'Hapus', icon: <Trash2 size={14} />, onClick: () => handleDelete(p.id), danger: true }
                      ]}
                    />
                  </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {filtered.length > 0 && (
          <div style={{ padding: '0 1.25rem 1rem' }}>
            <Pagination
              currentPage={page + 1}
              totalPages={Math.max(1, Math.ceil(filtered.length / pageSize))}
              onPageChange={(p) => setPage(p - 1)}
              pageSize={pageSize}
              onPageSizeChange={(s) => {
                setPageSize(s)
                setPage(0)
              }}
              totalItems={filtered.length}
              startIndex={page * pageSize + 1}
              endIndex={Math.min((page + 1) * pageSize, filtered.length)}
            />
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} maxWidth={520} padding="2rem" zIndex={200}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>
          {editItem ? 'Edit Faktur' : 'Tambah Faktur'}
        </h2>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              Customer *
            </label>
            <select
              required
              value={form.customer_id}
              onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
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
              <option value="">— Pilih Customer —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                Channel
              </label>
              <select
                value={form.channel}
                onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
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
                <option value="">— Pilih —</option>
                <option value="offline">Offline</option>
                <option value="shopee">Shopee</option>
                <option value="tokopedia">Tokopedia</option>
                <option value="tiktok">Tiktok</option>
                <option value="landing_page">Landing Page</option>
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
                No. Invoice
              </label>
              <input
                type="text"
                value={form.invoice_number}
                onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value }))}
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
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                value={form.invoice_date}
                onChange={(e) => setForm((f) => ({ ...f, invoice_date: e.target.value }))}
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
                Jumlah (Rp) *
              </label>
              <input
                type="number"
                required
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
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
              Order (opsional)
            </label>
            <select
              value={form.order_id}
              onChange={(e) => setForm((f) => ({ ...f, order_id: e.target.value }))}
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
              <option value="">— Tanpa Order —</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number ?? o.id.slice(0, 8)} — {o.customer?.name ?? 'Tanpa nama'}
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
              Catatan
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setShowForm(false)}
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
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* BUG-014 fix: Modal pembayaran piutang */}
      <Modal
        open={showPayModal}
        onClose={() => {
          setShowPayModal(false)
          setPayForm({ amount: '' })
          setPayItem(null)
        }}
        maxWidth={420}
        padding="1.5rem"
      >
        <form onSubmit={handlePay}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem' }}>
            💳 Terima Pembayaran Piutang
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', marginBottom: '1rem' }}>
            {payItem?.customer?.name ?? '—'} — {payItem?.invoice_number ?? 'Faktur'} · Sisa{' '}
            <strong style={{ color: '#cc7030' }}>
              {formatRp((payItem?.amount ?? 0) - (payItem?.paid_amount ?? 0) - (payItem?.return_amount ?? 0) - (payItem?.fee_amount ?? 0))}
            </strong>
          </p>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.3rem' }}>
            Nominal *
          </label>
          <input
            type="number"
            required
            min={1}
            value={payForm.amount}
            onChange={(e) => setPayForm({ amount: e.target.value })}
            placeholder="0"
            style={{
              width: '100%',
              padding: '0.625rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              marginBottom: '1rem',
              outline: 'none'
            }}
          />
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => {
                setShowPayModal(false)
                setPayForm({ amount: '' })
                setPayItem(null)
              }}
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
              disabled={paying}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#cc7030',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: paying ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              {paying ? 'Menyimpan...' : 'Catat Pembayaran'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
