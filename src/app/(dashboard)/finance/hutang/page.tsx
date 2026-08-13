'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, Pencil, Trash2, CreditCard, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import ActionMenu from '@/components/ui/ActionMenu'
import Pagination from '@/components/ui/Pagination'
import { createSimpleJournal } from '@/utils/journal/create'
import { formatRp } from '@/lib/utils'


interface Hutang {
  id: string
  supplier_id: string | null
  invoice_number: string | null
  invoice_date: string | null
  amount: number
  paid_amount: number
  return_amount: number
  status: string
  notes?: string | null
  supplier?: { name: string; phone?: string } | null
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  partial: { bg: '#dbeafe', text: '#1e40af' },
  paid: { bg: '#d1fae5', text: '#065f46' },
  cancelled: { bg: 'var(--neutral-100)', text: 'var(--neutral-600)' }
}

export default function HutangPage() {
  const { toast } = useToast()
  const [hutang, setHutang] = useState<Hutang[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name?: string }[]>([])
const [loading, setLoading] = useState(true)
const [search, setSearch] = useState('')
const [page, setPage] = useState(0)
const [pageSize, setPageSize] = useState(10)
  const [showForm, setShowForm] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [editItem, setEditItem] = useState<Hutang | null>(null)
  const [paymentItem, setPaymentItem] = useState<Hutang | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    supplier_id: '',
    invoice_number: '',
    invoice_date: '',
    amount: '',
    notes: ''
  })
  const [payForm, setPayForm] = useState({ amount: '', notes: '' })

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('hutang')
      .select('*, supplier:suppliers(name, phone)')
      .order('created_at', { ascending: false })
    setHutang((data as Hutang[]) ?? [])
    const { data: sup } = await supabase.from('suppliers').select('id, name').order('name')
    setSuppliers(sup ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = hutang.filter(
    (h) =>
      h.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      h.supplier?.name?.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditItem(null)
    setForm({ supplier_id: '', invoice_number: '', invoice_date: '', amount: '', notes: '' })
    setShowForm(true)
  }

  function openEdit(h: Hutang) {
    setEditItem(h)
    setForm({
      supplier_id: h.supplier_id ?? '',
      invoice_number: h.invoice_number ?? '',
      invoice_date: h.invoice_date ?? '',
      amount: String(h.amount ?? 0),
      notes: h.notes ?? ''
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      supplier_id: form.supplier_id || null,
      invoice_number: form.invoice_number || null,
      invoice_date: form.invoice_date || null,
      amount: Number(form.amount) || 0,
      notes: form.notes || null
    }
    if (editItem) {
        // BUG-013: tolak edit amount jika sudah ada pembayaran / lunas / batal
        const hasPayment = (editItem.paid_amount ?? 0) > 0 || (editItem.return_amount ?? 0) > 0
        if (hasPayment || editItem.status === 'paid' || editItem.status === 'cancelled') {
          setSaving(false)
          toast('error', 'Tidak bisa mengubah tagihan yang sudah dibayar / lunas / dibatalkan.')
          return
        }
        // UPDATE optimistic
        const prev = hutang
        setHutang((curr) => curr.map((x) => (x.id === editItem.id ? ({ ...x, ...payload } as Hutang) : x)))
        const { error } = await supabase.from('hutang').update(payload).eq('id', editItem.id)
        if (error) { setHutang(prev); setSaving(false); toast('error', 'Gagal simpan: ' + error.message); return }
      } else {
        // CREATE optimistic: id sementara dulu, diganti id asli dari server
        const tempId = crypto.randomUUID()
        const tempItem = { id: tempId, ...payload }
        setHutang((curr) => [tempItem as Hutang, ...curr])
        const { data, error } = await supabase.from('hutang').insert(payload).select('id').single()
        if (error) {
          setHutang((curr) => curr.filter((x) => x.id !== tempId))
          setSaving(false)
          toast('error', 'Gagal simpan: ' + error.message)
          return
        }
        if (data?.id) {
          setHutang((curr) => curr.map((x) => (x.id === tempId ? { ...x, id: data.id } : x)))
        }
      }
      setSaving(false)
      setShowForm(false)
      toast('success', editItem ? 'Berhasil diperbarui' : 'Berhasil ditambahkan')
  }

  async function handleDelete(id: string) {
    // BUG-072 fix (2026-08-13): tolak hapus tagihan yang sudah dibayar / lunas /
    // dibatalkan — mirror guard handleSave. Hapus tagihan ber-payment = menghapus
    // liabilitas + riwayat pembayaran dari pembukuan.
    const target = hutang.find((x) => x.id === id)
    if (target) {
      const hasPayment = (target.paid_amount ?? 0) > 0 || (target.return_amount ?? 0) > 0
      if (hasPayment || target.status === 'paid' || target.status === 'cancelled') {
        toast('error', 'Tidak bisa menghapus tagihan yang sudah dibayar / lunas / dibatalkan.')
        return
      }
    }
    if (!confirm('Yakin hapus?')) return
      // Optimistic delete
      const prev = hutang
      setHutang((curr) => curr.filter((x) => x.id !== id))
      const { error } = await supabase.from('hutang').delete().eq('id', id)
      if (error) { setHutang(prev); toast('error', 'Gagal hapus: ' + error.message); return }
      toast('success', 'Berhasil dihapus')
  }

  function openPayment(h: Hutang) {
    setPaymentItem(h)
    const sisa = (h.amount ?? 0) - (h.paid_amount ?? 0) - (h.return_amount ?? 0)
    setPayForm({ amount: String(sisa), notes: '' })
    setShowPayment(true)
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault()
    if (!paymentItem) return
    setSaving(true)
    const payAmount = Number(payForm.amount) || 0
    if (payAmount <= 0) {
      setSaving(false)
      toast('error', 'Nominal pembayaran harus lebih dari 0.')
      return
    }
    // F-11 fix: refetch FRESH (anti race 2 finance bayar bersamaan)
    const { data: fresh } = await supabase
      .from('hutang')
      .select('id, amount, paid_amount, return_amount, status, invoice_number, supplier:suppliers(name)')
      .eq('id', paymentItem.id)
      .single()
    if (!fresh) { setSaving(false); toast('error', 'Hutang tidak ditemukan.'); return }
    if (fresh.status === 'cancelled') {
      setSaving(false)
      toast('error', 'Hutang ini sudah dibatalkan — tidak bisa dibayar.')
      return
    }
    const sisaBefore = (fresh.amount ?? 0) - (fresh.paid_amount ?? 0) - (fresh.return_amount ?? 0)
    if (payAmount > sisaBefore) {
      setSaving(false)
      toast('error', `Nominal pembayaran melebihi sisa hutang (Rp ${sisaBefore.toLocaleString('id-ID')}).`)
      return
    }
    const newPaidAmount = (fresh.paid_amount ?? 0) + payAmount
    const sisa = (fresh.amount ?? 0) - newPaidAmount - (fresh.return_amount ?? 0)
    const newStatus = sisa <= 0 ? 'paid' : 'partial'
    const { error } = await supabase
      .from('hutang')
      .update({
        paid_amount: newPaidAmount,
        status: newStatus
      })
      .eq('id', paymentItem.id)
      .eq('paid_amount', fresh.paid_amount)
      .eq('return_amount', fresh.return_amount)
    if (error) { setSaving(false); toast('error', 'Gagal simpan pembayaran hutang (mungkin dibayar finance lain): ' + error.message); return }

    // BUG-013 fix (2026-08-11): bayar hutang wajib jurnal Dr Hutang Supplier / Cr Kas
    // F-11 fix: idempotent per pembayaran — retry tidak bikin jurnal ganda
    const payRefId = crypto.randomUUID()
    try {
      await createSimpleJournal({
        transaction_type: 'hutang_paid',
        reference_type: 'hutang',
        reference_id: paymentItem.id,
        description: `Pembayaran hutang ${fresh.invoice_number ?? 'Invoice'} — ${(fresh.supplier as { name?: string } | null)?.name ?? ''} Rp${payAmount.toLocaleString('id-ID')}`,
        amount: payAmount,
        idempotency_key: `hutang_paid:${paymentItem.id}:${payRefId}`
      })
    } catch (jErr) {
      console.error('Gagal buat jurnal bayar hutang:', jErr)
      toast('warning', 'Pembayaran tercatat, TAPI jurnal GAGAL. Periksa mapping akun di /finance/accounts/mapping.')
    }

    // F-39 fix: simpan catatan pembayaran (sebelumnya dikumpulkan tapi tidak pernah disimpan)
    if (payForm.notes?.trim()) {
      const { error: noteErr } = await supabase.from('hutang').update({ notes: payForm.notes.trim() }).eq('id', paymentItem.id)
      if (noteErr) console.error('Gagal simpan catatan pembayaran:', noteErr)
    }
    setSaving(false)
    setShowPayment(false)
    // Optimistic update: sisa hutang langsung berubah tanpa refetch
    setHutang((curr) => curr.map((h) => (h.id === paymentItem.id ? { ...h, paid_amount: newPaidAmount, status: newStatus } : h)))
    toast('success', 'Pembayaran hutang dicatat')
  }

  return (
    <div>
      <PageHeader title="HUTANG" subtitle="Tagihan supplier dan pembayaran" />

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
            placeholder="Cari invoice atau supplier..."
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
          <Plus size={16} /> Tambah Tagihan
        </button>
      </div>

            {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={filtered.slice(page * pageSize, (page + 1) * pageSize)} keyOf={(h) => h.id} renderCard={(h) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">No. Invoice</span>
                  <span className="mobile-card-value">{h.invoice_number}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Jumlah</span>
                  <span className="mobile-card-value">{h.amount ?? 0}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Sisa</span>
                  <span className="mobile-card-value">{(h.amount ?? 0) - (h.paid_amount ?? 0) - (h.return_amount ?? 0)}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Status</span>
                  <span className="mobile-card-value">{h.status === 'paid' ? 'Lunas' : h.status === 'partial' ? 'Sebagian' : 'Belum'}</span>
                </div>
                <div className="mobile-card-actions">
                        <button onClick={() => openPayment(h)} style={{ background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer' }} title="Catat pembayaran tagihan supplier (jurnal dibuat otomatis)">Bayar</button>
                  <button onClick={() => openEdit(h)} style={{ background: 'var(--neutral-100)', color: 'var(--neutral-700)', border: 'none', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDelete(h.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer' }}>Hapus</button>
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
            <CreditCard size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada tagihan</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Invoice</th>
                <th>Tanggal</th>
                <th>Tagihan</th>
                <th>Retur</th>
                <th>Sisa</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(page * pageSize, (page + 1) * pageSize).map((h) => {
                const sc = STATUS_COLORS[h.status] ?? STATUS_COLORS.pending
                const sisa = (h.amount ?? 0) - (h.paid_amount ?? 0) - (h.return_amount ?? 0)
                return (
                  <tr key={h.id}>
                    <td style={{ fontWeight: '500' }}>{h.supplier?.name ?? '—'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{h.invoice_number ?? '—'}</td>
                    <td style={{ color: 'var(--neutral-600)' }}>{h.invoice_date ?? '—'}</td>
                    <td style={{ fontWeight: '600', textAlign: 'right' }}>{formatRp(h.amount ?? 0)}</td>
                    <td style={{ color: '#dc2626', textAlign: 'right' }}>{formatRp(h.return_amount ?? 0)}</td>
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
                        {h.status}
                      </span>
                    </td>
                    <td>
                      <ActionMenu
                        items={[
                          {
                            label: 'Bayar',
                            icon: <CreditCard size={14} />,
                            onClick: () => openPayment(h),
                            danger: false
                          },
                          { label: 'Edit', icon: <Pencil size={14} />, onClick: () => openEdit(h) },
                          { label: 'Hapus', icon: <Trash2 size={14} />, onClick: () => handleDelete(h.id), danger: true }
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

      <Modal open={showForm} onClose={() => setShowForm(false)} maxWidth={480} padding="2rem" zIndex={200}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>
          {editItem ? 'Edit Tagihan' : 'Tambah Tagihan'}
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
              Supplier *
            </label>
            <select
              required
              value={form.supplier_id}
              onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
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
              <option value="">— Pilih Supplier —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
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
                Tanggal Invoice
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
              Jumlah Tagihan (Rp) *
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

      <Modal
        open={showPayment && !!paymentItem}
        onClose={() => setShowPayment(false)}
        maxWidth={420}
        padding="2rem"
        zIndex={200}
      >
        {paymentItem && (
          <>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}
            >
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Bayar Tagihan</h2>
              <button
                onClick={() => setShowPayment(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neutral-600)' }}
              >
                <X size={20} />
              </button>
            </div>
            <div
              style={{
                background: 'var(--neutral-100)',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                marginBottom: '1rem',
                fontSize: '0.85rem'
              }}
            >
              <div style={{ color: 'var(--neutral-600)', marginBottom: '0.25rem' }}>Supplier</div>
              <div style={{ fontWeight: '600' }}>{paymentItem.supplier?.name ?? '—'}</div>
              <div style={{ color: 'var(--neutral-600)', marginTop: '0.5rem', marginBottom: '0.25rem' }}>Sisa Tagihan</div>
              <div style={{ fontWeight: '700', color: '#cc7030', fontSize: '1.1rem' }}>
                {formatRp(
                  (paymentItem.amount ?? 0) - (paymentItem.paid_amount ?? 0) - (paymentItem.return_amount ?? 0)
                )}
              </div>
            </div>
            <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  Jumlah Bayar (Rp) *
                </label>
                <input
                  type="number"
                  required
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
                  Catatan
                </label>
                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Ketik nominal saja atau keterangan tambahan"
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
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowPayment(false)}
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
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {saving ? 'Menyimpan...' : 'Bayar'}
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  )
}
