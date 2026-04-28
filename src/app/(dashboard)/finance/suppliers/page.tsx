'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, Pencil, Trash2, Users, FileText, Loader2 } from 'lucide-react'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'suppliers' | 'po'>('suppliers')
  const [poList, setPoList] = useState<any[]>([])
  const [poLoading, setPoLoading] = useState(false)
  const [showPOForm, setShowPOForm] = useState(false)
  const [selectedPR, setSelectedPR] = useState<any | null>(null)
  const [poSaving, setPoSaving] = useState(false)

  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' })
  const [poForm, setPoForm] = useState({ supplier_id: '', actual_cost: '', invoice_document: '', notes: '' })

  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('suppliers').select('*').order('name')
    setSuppliers(data ?? [])
    setLoading(false)
  }

  async function loadPOs() {
    setPoLoading(true)
    const { data } = await supabase
      .from('purchase_orders')
      .select('*, supplier:suppliers(name), pr:purchase_requests(material:materials(name))')
      .order('created_at', { ascending: false })
    setPoList(data ?? [])
    setPoLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (tab === 'po') loadPOs() }, [tab])

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_person ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditItem(null)
    setForm({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' })
    setShowForm(true)
  }

  function openEdit(s: any) {
    setEditItem(s)
    setForm({ name: s.name, contact_person: s.contact_person ?? '', phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '', notes: s.notes ?? '' })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { name: form.name, contact_person: form.contact_person || null, phone: form.phone || null, email: form.email || null, address: form.address || null, notes: form.notes || null }
    if (editItem) {
      await supabase.from('suppliers').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('suppliers').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus supplier ini?')) return
    await supabase.from('suppliers').delete().eq('id', id)
    load()
  }

  async function createPO(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPR) return
    setPoSaving(true)
    await supabase.from('purchase_orders').insert({
      pr_id: selectedPR.id,
      supplier_id: poForm.supplier_id,
      actual_cost: Number(poForm.actual_cost),
      status: 'pending',
      invoice_document: poForm.invoice_document || null,
    })
    // Update PR status to approved (already done by admin)
    setPoSaving(false)
    setShowPOForm(false)
    setSelectedPR(null)
    setPoForm({ supplier_id: '', actual_cost: '', invoice_document: '', notes: '' })
    loadPOs()
  }

  async function updatePOStatus(poId: string, status: string) {
    const updates: any = { status }
    if (status === 'received') updates.received_at = new Date().toISOString()
    if (status === 'paid') {
      const { data: { user } } = await supabase.auth.getUser()
      updates.paid_at = new Date().toISOString()
      updates.paid_by = user?.id
    }
    await supabase.from('purchase_orders').update(updates).eq('id', poId)
    loadPOs()
  }

  async function openCreatePO(pr: any) {
    setSelectedPR(pr)
    setPoForm({ supplier_id: pr.material?.supplier_id ?? '', actual_cost: String(pr.estimated_cost), invoice_document: '', notes: '' })
    setShowPOForm(true)
  }

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

  const FIELDS = [
    { label: 'Nama Supplier *', id: 'name', placeholder: 'PT. Kain Nusantara', required: true },
    { label: 'Contact Person', id: 'contact_person', placeholder: 'Bapak/Ibu ...', required: false },
    { label: 'No. HP / WA', id: 'phone', placeholder: '08xxx', required: false },
    { label: 'Email', id: 'email', placeholder: 'supplier@email.com', required: false },
    { label: 'Alamat', id: 'address', placeholder: 'Jl. ...', required: false },
    { label: 'Catatan', id: 'notes', placeholder: 'Catatan internal', required: false },
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Supplier</h1>
        <p className="page-subtitle">Database supplier + Purchase Orders</p>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem' }}>
        {(['suppliers', 'po'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? '#cc7030' : 'transparent'}`, cursor: 'pointer', fontWeight: tab === t ? '700' : '500', color: tab === t ? '#cc7030' : '#6b7280', fontSize: '0.9rem', marginBottom: '-2px' }}>
            {t === 'suppliers' ? '🏭 Suppliers' : '📋 Purchase Orders'}
          </button>
        ))}
      </div>

      {tab === 'suppliers' && (
        <>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input type="text" placeholder="Cari supplier..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '0.625rem 1rem 0.625rem 2.25rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
            </div>
            <button onClick={openAdd}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}>
              <Plus size={16} /> Tambah Supplier
            </button>
          </div>

          <div className="data-table">
            {loading ? <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
            : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
                <Users size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
                <p>Belum ada supplier</p>
              </div>
            ) : (
              <table>
                <thead><tr><th>Nama Supplier</th><th>Contact Person</th><th>No. HP / WA</th><th>Email</th><th>Alamat</th><th>Aksi</th></tr></thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: '600' }}>{s.name}</td>
                      <td>{s.contact_person ?? '—'}</td>
                      <td>{s.phone ? <a href={`https://wa.me/${s.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#16a34a', textDecoration: 'none', fontWeight: '500' }}>{s.phone}</a> : '—'}</td>
                      <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>{s.email ?? '—'}</td>
                      <td style={{ color: '#6b7280', fontSize: '0.85rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.address ?? '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => openEdit(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '0.25rem' }}><Pencil size={15} /></button>
                          <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0.25rem' }}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'po' && (
        <>
          <div className="data-table">
            {poLoading ? <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
            : poList.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
                <FileText size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
                <p>Belum ada Purchase Order</p>
              </div>
            ) : (
              <table>
                <thead><tr><th>Supplier</th><th>Material</th><th>Cost</th><th>Status</th><th>Aksi</th></tr></thead>
                <tbody>
                  {poList.map(po => {
                    const statusColors: Record<string, { bg: string; text: string }> = {
                      pending: { bg: '#fef3c7', text: '#92400e' },
                      delivered: { bg: '#dbeafe', text: '#1e40af' },
                      received: { bg: '#d1fae5', text: '#065f46' },
                      paid: { bg: '#22c55e', text: '#fff' },
                    }
                    const sc = statusColors[po.status] ?? statusColors.pending
                    return (
                      <tr key={po.id}>
                        <td style={{ fontWeight: '600' }}>{po.supplier?.name ?? '—'}</td>
                        <td style={{ color: '#6b7280' }}>{po.pr?.material?.name ?? '—'}</td>
                        <td style={{ fontWeight: '600', color: '#cc7030' }}>{formatRp(po.actual_cost)}</td>
                        <td>
                          <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600', background: sc.bg, color: sc.text }}>
                            {po.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {po.status === 'pending' && (
                              <>
                                <button onClick={() => updatePOStatus(po.id, 'received')} style={{ padding: '0.25rem 0.625rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer' }}>Terima</button>
                                <button onClick={() => updatePOStatus(po.id, 'paid')} style={{ padding: '0.25rem 0.625rem', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer' }}>Bayar</button>
                              </>
                            )}
                            {po.status === 'received' && (
                              <button onClick={() => updatePOStatus(po.id, 'paid')} style={{ padding: '0.25rem 0.625rem', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer' }}>Bayar</button>
                            )}
                            {po.status === 'paid' && (
                              <span style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: '600' }}>✓ Lunas</span>
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
        </>
      )}

      {/* Supplier Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ background: '#fff', borderRadius: '0.875rem', padding: '2rem', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>{editItem ? 'Edit Supplier' : 'Tambah Supplier'}</h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {FIELDS.map(f => (
                <div key={f.id}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>{f.label}</label>
                  <input type="text" required={f.required} placeholder={f.placeholder}
                    value={(form as Record<string, string>)[f.id]} onChange={e => setForm(prev => ({ ...prev, [f.id]: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
                </div>
              ))}
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

      {/* Create PO Modal */}
      {showPOForm && selectedPR && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setShowPOForm(false) }}>
          <div style={{ background: '#fff', borderRadius: '0.875rem', padding: '2rem', width: '100%', maxWidth: 480, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Buat Purchase Order</h2>
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.25rem' }}>Material</div>
              <div style={{ fontWeight: '600' }}>{selectedPR.material?.name ?? '—'}</div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>Qty: {selectedPR.qty} | Estimasi: {formatRp(selectedPR.estimated_cost)}</div>
            </div>
            <form onSubmit={createPO} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Supplier *</label>
                <select required value={poForm.supplier_id} onChange={e => setPoForm(f => ({ ...f, supplier_id: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }}>
                  <option value="">-- Pilih Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Actual Cost (Rp) *</label>
                <input type="number" required placeholder="0" value={poForm.actual_cost} onChange={e => setPoForm(f => ({ ...f, actual_cost: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Invoice #</label>
                <input type="text" placeholder="Invoice number..." value={poForm.invoice_document} onChange={e => setPoForm(f => ({ ...f, invoice_document: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowPOForm(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: '#fff', cursor: 'pointer', fontWeight: '600' }}>Batal</button>
                <button type="submit" disabled={poSaving} style={{ flex: 1, padding: '0.75rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: poSaving ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                  {poSaving ? 'Membuat...' : 'Buat PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}