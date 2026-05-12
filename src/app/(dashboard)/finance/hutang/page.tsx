'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, Pencil, Trash2, CreditCard } from 'lucide-react'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

interface Hutang {
  id: string
  supplier_id: string
  invoice_number: string
  invoice_date: string
  amount: number
  paid_amount: number
  return_amount: number
  status: string
  notes?: string
  supplier?: { name: string; phone: string }
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  partial: { bg: '#dbeafe', text: '#1e40af' },
  paid: { bg: '#d1fae5', text: '#065f46' },
  cancelled: { bg: '#f3f4f6', text: '#6b7280' },
}

export default function HutangPage() {
  const [hutang, setHutang] = useState<Hutang[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Hutang | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    supplier_id: '', invoice_number: '', invoice_date: '', amount: '', notes: '',
  })

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

  useEffect(() => { fetchData() }, [])

  const filtered = hutang.filter(h =>
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
      supplier_id: h.supplier_id,
      invoice_number: h.invoice_number ?? '',
      invoice_date: h.invoice_date ?? '',
      amount: String(h.amount ?? 0),
      notes: h.notes ?? '',
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
      notes: form.notes || null,
    }
    if (editItem) {
      await supabase.from('hutang').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('hutang').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus tagihan ini?')) return
    await supabase.from('hutang').delete().eq('id', id)
    fetchData()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">HUTANG</h1>
        <p className="page-subtitle">Tagihan supplier dan pembayaran</p>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="Cari invoice atau supplier..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.625rem 1rem 0.625rem 2.25rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
        </div>
        <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}>
          <Plus size={16} /> Tambah Tagihan
        </button>
      </div>

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
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
              {filtered.map((h) => {
                const sc = STATUS_COLORS[h.status] ?? STATUS_COLORS.pending
                const sisa = (h.amount ?? 0) - (h.paid_amount ?? 0) - (h.return_amount ?? 0)
                return (
                  <tr key={h.id}>
                    <td style={{ fontWeight: '500' }}>{h.supplier?.name ?? '—'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{h.invoice_number ?? '—'}</td>
                    <td style={{ color: '#6b7280' }}>{h.invoice_date ?? '—'}</td>
                    <td style={{ fontWeight: '600', textAlign: 'right' }}>{formatRp(h.amount ?? 0)}</td>
                    <td style={{ color: '#dc2626', textAlign: 'right' }}>{formatRp(h.return_amount ?? 0)}</td>
                    <td style={{ fontWeight: '700', color: '#cc7030', textAlign: 'right' }}>{formatRp(sisa)}</td>
                    <td>
                      <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600', background: sc.bg, color: sc.text, textTransform: 'capitalize' }}>
                        {h.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => openEdit(h)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '0.25rem' }}><Pencil size={15} /></button>
                        <button onClick={() => handleDelete(h.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0.25rem' }}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ background: '#fff', borderRadius: '0.875rem', padding: '2rem', width: '100%', maxWidth: 480, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>{editItem ? 'Edit Tagihan' : 'Tambah Tagihan'}</h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Supplier *</label>
                <select required value={form.supplier_id} onChange={(e) => setForm(f => ({ ...f, supplier_id: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }}>
                  <option value="">— Pilih Supplier —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>No. Invoice</label>
                  <input type="text" value={form.invoice_number} onChange={(e) => setForm(f => ({ ...f, invoice_number: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Tanggal Invoice</label>
                  <input type="date" value={form.invoice_date} onChange={(e) => setForm(f => ({ ...f, invoice_date: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Jumlah Tagihan (Rp) *</label>
                <input type="number" required placeholder="0" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Catatan</label>
                <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: '#fff', cursor: 'pointer', fontWeight: '600' }}>Batal</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.75rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}