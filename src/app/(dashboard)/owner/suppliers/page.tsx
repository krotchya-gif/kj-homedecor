'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, Pencil, Trash2, Users, FileText, Loader2, Download, Upload } from 'lucide-react'
import ImportModal from '@/components/ui/ImportModal'
import { exportToCSV, generateCSVTemplate } from '@/lib/csv'
import { useToast } from '@/components/ui/Toast'

export default function SuppliersPage() {
  const { toast } = useToast()
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
  const [importModalOpen, setImportModalOpen] = useState(false)

  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' })
  const [poForm, setPoForm] = useState({ supplier_id: '', actual_cost: '', invoice_document: '', notes: '' })

  const supabase = createClient()

  const IMPORT_COLUMNS = [
    { key: 'name', label: 'Nama Supplier', required: true },
    { key: 'contact_person', label: 'Contact Person', aliases: ['cp', 'penanggung_jawab'] },
    { key: 'phone', label: 'No. HP', aliases: ['telepon', 'no_hp', 'whatsapp'] },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Alamat' },
    { key: 'notes', label: 'Catatan' }
  ]

  const EXPORT_COLUMNS = [
    { key: 'name', label: 'Nama' },
    { key: 'contact_person', label: 'Contact Person' },
    { key: 'phone', label: 'HP' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Alamat' },
    { key: 'notes', label: 'Catatan' }
  ]

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

  useEffect(() => {
    load()
  }, [])
  useEffect(() => {
    if (tab === 'po') loadPOs()
  }, [tab])

  const filtered = suppliers.filter(
    (s) =>
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
    setForm({
      name: s.name,
      contact_person: s.contact_person ?? '',
      phone: s.phone ?? '',
      email: s.email ?? '',
      address: s.address ?? '',
      notes: s.notes ?? ''
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name,
      contact_person: form.contact_person || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      notes: form.notes || null
    }
    if (editItem) {
      // UPDATE optimistic
      const prev = suppliers
      setSuppliers((curr) => curr.map((s) => (s.id === editItem.id ? { ...s, ...payload } : s)))
      const { error } = await supabase.from('suppliers').update(payload).eq('id', editItem.id)

      if (error) { setSuppliers(prev); setSaving(false); toast('error', 'Gagal simpan: ' + error.message); return }
    } else {
      // CREATE optimistic: id sementara dulu, diganti id asli dari server
      const tempId = crypto.randomUUID()
      const tempItem = { id: tempId, ...payload }
      setSuppliers((curr) => [tempItem, ...curr])
      const { data, error } = await supabase.from('suppliers').insert(payload).select('id').single()

      if (error) {
        setSuppliers((curr) => curr.filter((s) => s.id !== tempId))
        setSaving(false)
        toast('error', 'Gagal simpan: ' + error.message)
        return
      }
      if (data?.id) {
        setSuppliers((curr) => curr.map((s) => (s.id === tempId ? { ...s, id: data.id } : s)))
      }
    }
    setSaving(false)
    setShowForm(false)
    toast('success', editItem ? 'Supplier berhasil diperbarui' : 'Supplier berhasil ditambahkan')
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus supplier ini?')) return
    // Optimistic update: hapus dari UI dulu, rollback kalau server error
    const prev = suppliers
    setSuppliers((curr) => curr.filter((s) => s.id !== id))
    const { error } = await supabase.from('suppliers').delete().eq('id', id)

    if (error) { setSuppliers(prev); toast('error', 'Gagal hapus: ' + error.message); return }
    toast('success', 'Supplier berhasil dihapus')
  }

  function handleExport() {
    exportToCSV(suppliers as any, EXPORT_COLUMNS)
  }

  function handleDownloadTemplate() {
    generateCSVTemplate(IMPORT_COLUMNS)
  }

  async function handleImport(rows: Record<string, string | number | null>[]) {
    const errors: string[] = []
    let inserted = 0
    const BATCH = 50
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      for (const row of batch) {
        const { error } = await supabase.from('suppliers').insert({
          name: String(row.name ?? ''),
          contact_person: row.contact_person ? String(row.contact_person) : null,
          phone: row.phone ? String(row.phone) : null,
          email: row.email ? String(row.email) : null,
          address: row.address ? String(row.address) : null,
          notes: row.notes ? String(row.notes) : null
        })
        if (error) errors.push(`Row ${i + 1}: ${error.message}`)
        else inserted++
      }
    }
    load()
    toast(errors.length > 0 ? 'warning' : 'success', `Import selesai: ${inserted} data baru${errors.length > 0 ? `, ${errors.length} error` : ''}`)
    return { inserted, updated: 0, errors }
  }

  async function createPO(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPR) return
    setPoSaving(true)
    const { error } = await supabase.from('purchase_orders').insert({
      pr_id: selectedPR.id,
      supplier_id: poForm.supplier_id,
      actual_cost: Number(poForm.actual_cost),
      status: 'pending',
      invoice_document: poForm.invoice_document || null
    })
    if (error) { setPoSaving(false); toast('error', 'Gagal buat PO: ' + error.message); return }
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
      const {
        data: { user }
      } = await supabase.auth.getUser()
      updates.paid_at = new Date().toISOString()
      updates.paid_by = user?.id
    }
    const { error } = await supabase.from('purchase_orders').update(updates).eq('id', poId)
    if (error) { toast('error', 'Gagal update PO: ' + error.message); return }
    loadPOs()
  }

  async function openCreatePO(pr: any) {
    setSelectedPR(pr)
    setPoForm({
      supplier_id: pr.material?.supplier_id ?? '',
      actual_cost: String(pr.estimated_cost),
      invoice_document: '',
      notes: ''
    })
    setShowPOForm(true)
  }

  const formatRp = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

  const FIELDS = [
    { label: 'Nama Supplier *', id: 'name', placeholder: 'PT. Kain Nusantara', required: true },
    { label: 'Contact Person', id: 'contact_person', placeholder: 'Bapak/Ibu ...', required: false },
    { label: 'No. HP / WA', id: 'phone', placeholder: '08xxx', required: false },
    { label: 'Email', id: 'email', placeholder: 'supplier@email.com', required: false },
    { label: 'Alamat', id: 'address', placeholder: 'Jl. ...', required: false },
    { label: 'Catatan', id: 'notes', placeholder: 'Catatan internal', required: false }
  ]

  return (
    <div>
      <PageHeader title="Supplier" subtitle="Database supplier + Purchase Orders" />

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem' }}>
        {(['suppliers', 'po'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === t ? '#cc7030' : 'transparent'}`,
              cursor: 'pointer',
              fontWeight: tab === t ? '700' : '500',
              color: tab === t ? '#cc7030' : 'var(--neutral-600)',
              fontSize: '0.9rem',
              marginBottom: '-2px'
            }}
          >
            {t === 'suppliers' ? '🏭 Suppliers' : '📋 Purchase Orders'}
          </button>
        ))}
      </div>

      {tab === 'suppliers' && (
        <>
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
                placeholder="Cari supplier..."
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
              onClick={handleDownloadTemplate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.625rem 1rem',
                background: 'var(--surface)',
                color: 'var(--neutral-700)',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              <Download size={14} /> Template
            </button>
            <button
              onClick={handleExport}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.625rem 1rem',
                background: 'var(--surface)',
                color: 'var(--neutral-700)',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              <Download size={14} /> Export
            </button>
            <button
              onClick={() => setImportModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.625rem 1rem',
                background: 'var(--surface)',
                color: 'var(--neutral-700)',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              <Upload size={14} /> Import
            </button>
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
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <Plus size={16} /> Tambah
            </button>
          </div>

                {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={filtered} keyOf={(s) => s.id} renderCard={(s) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Nama</span>
                  <span className="mobile-card-value">s.name</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Kontak</span>
                  <span className="mobile-card-value">s.contact_person</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">HP</span>
                  <span className="mobile-card-value">s.phone</span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
                <Users size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
                <p>Belum ada supplier</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nama Supplier</th>
                    <th>Contact Person</th>
                    <th>No. HP / WA</th>
                    <th>Email</th>
                    <th>Alamat</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: '600' }}>{s.name}</td>
                      <td>{s.contact_person ?? '—'}</td>
                      <td>
                        {s.phone ? (
                          <a
                            href={`https://wa.me/${s.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#16a34a', textDecoration: 'none', fontWeight: '500' }}
                          >
                            {s.phone}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ color: 'var(--neutral-600)', fontSize: '0.85rem' }}>{s.email ?? '—'}</td>
                      <td
                        style={{
                          color: 'var(--neutral-600)',
                          fontSize: '0.85rem',
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {s.address ?? '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => openEdit(s)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--neutral-600)',
                              padding: '0.25rem'
                            }}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#dc2626',
                              padding: '0.25rem'
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
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
            {poLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
            ) : poList.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
                <FileText size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
                <p>Belum ada Purchase Order</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Material</th>
                    <th>Cost</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {poList.map((po) => {
                    const statusColors: Record<string, { bg: string; text: string }> = {
                      pending: { bg: '#fef3c7', text: '#92400e' },
                      delivered: { bg: '#dbeafe', text: '#1e40af' },
                      received: { bg: '#d1fae5', text: '#065f46' },
                      paid: { bg: '#22c55e', text: '#fff' }
                    }
                    const sc = statusColors[po.status] ?? statusColors.pending
                    return (
                      <tr key={po.id}>
                        <td style={{ fontWeight: '600' }}>{po.supplier?.name ?? '—'}</td>
                        <td style={{ color: 'var(--neutral-600)' }}>{po.pr?.material?.name ?? '—'}</td>
                        <td style={{ fontWeight: '600', color: '#cc7030' }}>{formatRp(po.actual_cost)}</td>
                        <td>
                          <span
                            style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              background: sc.bg,
                              color: sc.text
                            }}
                          >
                            {po.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.375rem' }}>
                            {po.status === 'pending' && (
                              <button
                                onClick={() => updatePOStatus(po.id, 'delivered')}
                                style={{
                                  padding: '0.25rem 0.625rem',
                                  background: '#7c3aed',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                Dikirim
                              </button>
                            )}
                            {(po.status === 'pending' || po.status === 'delivered') && (
                              <button
                                onClick={() => updatePOStatus(po.id, 'received')}
                                style={{
                                  padding: '0.25rem 0.625rem',
                                  background: '#3b82f6',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                Terima
                              </button>
                            )}
                            {po.status === 'received' && (
                              <button
                                onClick={() => updatePOStatus(po.id, 'paid')}
                                style={{
                                  padding: '0.25rem 0.625rem',
                                  background: '#22c55e',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                Bayar
                              </button>
                            )}
                            {po.status === 'paid' && (
                              <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: '600' }}>✓ Lunas</span>
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
      <Modal open={showForm} onClose={() => setShowForm(false)} maxWidth={500} padding="2rem" zIndex={200}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>
          {editItem ? 'Edit Supplier' : 'Tambah Supplier'}
        </h2>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {FIELDS.map((f) => (
            <div key={f.id}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: 'var(--neutral-700)',
                  marginBottom: '0.3rem'
                }}
              >
                {f.label}
              </label>
              <input
                type="text"
                required={f.required}
                placeholder={f.placeholder}
                value={(form as Record<string, string>)[f.id]}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.id]: e.target.value }))}
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
          ))}
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

      {/* Create PO Modal */}
      <Modal
        open={showPOForm && !!selectedPR}
        onClose={() => setShowPOForm(false)}
        maxWidth={480}
        padding="2rem"
        zIndex={200}
      >
        {selectedPR && (
          <>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Buat Purchase Order</h2>
            <div
              style={{
                background: 'var(--neutral-100)',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', marginBottom: '0.25rem' }}>Material</div>
              <div style={{ fontWeight: '600' }}>{selectedPR.material?.name ?? '—'}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', marginTop: '0.5rem' }}>
                Qty: {selectedPR.qty} | Estimasi: {formatRp(selectedPR.estimated_cost)}
              </div>
            </div>
            <form onSubmit={createPO} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  value={poForm.supplier_id}
                  onChange={(e) => setPoForm((f) => ({ ...f, supplier_id: e.target.value }))}
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
                  <option value="">-- Pilih Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
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
                  Actual Cost (Rp) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={poForm.actual_cost}
                  onChange={(e) => setPoForm((f) => ({ ...f, actual_cost: e.target.value }))}
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
                  Invoice #
                </label>
                <input
                  type="text"
                  placeholder="Invoice number..."
                  value={poForm.invoice_document}
                  onChange={(e) => setPoForm((f) => ({ ...f, invoice_document: e.target.value }))}
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
                  onClick={() => setShowPOForm(false)}
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
                  disabled={poSaving}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#cc7030',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: poSaving ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {poSaving ? 'Membuat...' : 'Buat PO'}
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        columns={IMPORT_COLUMNS}
        onImport={handleImport}
        entityName="Supplier"
      />
    </div>
  )
}
