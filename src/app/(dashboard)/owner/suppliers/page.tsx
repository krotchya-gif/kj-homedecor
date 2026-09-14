'use client'
import type { Supplier } from '@/types'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, Pencil, Trash2, Users, FileText, Loader2, Download, Upload } from 'lucide-react'
import ImportModal from '@/components/ui/ImportModal'
import { exportToCSV, generateCSVTemplate } from '@/lib/csv'
import { useToast } from '@/components/ui/Toast'
import ActionMenu from '@/components/ui/ActionMenu'
import Pagination from '@/components/ui/Pagination'
import PriceHistoryTab from '@/components/suppliers/PriceHistoryTab'
import { formatRp } from '@/lib/utils'

interface POListRow {
  id: string
  supplier?: { name?: string } | null
  supplier_name?: string
  material?: { name?: string } | null
  material_name?: string
  cost?: number
  amount?: number
  status?: string
  actual_cost?: number
  pr?: { material?: { name?: string; supplier_id?: string } | null } | null
}

interface PRRow {
  id: string
  qty?: number
  estimated_cost?: number
  material_id?: string
  status?: string
  material?: { name?: string; supplier_id?: string } | null
}

interface MaterialRow {
  id: string
  name: string
  unit?: string | null
  cost_per_unit?: number | null
  supplier_id?: string | null
  supplier?: { name?: string } | null
}

export default function SuppliersPage() {
  const { toast } = useToast()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Supplier | null>(null)
  const [saving, setSaving] = useState(false)
const [tab, setTab] = useState<'suppliers' | 'po' | 'price-history'>('suppliers')
const [poList, setPoList] = useState<POListRow[]>([])
const [poLoading, setPoLoading] = useState(false)
const [supPage, setSupPage] = useState(0)
const [supPageSize, setSupPageSize] = useState(10)
const [poPage, setPoPage] = useState(0)
const [poPageSize, setPoPageSize] = useState(10)
  const [showPOForm, setShowPOForm] = useState(false)
  const [selectedPR, setSelectedPR] = useState<PRRow | null>(null)
  // BUG-147: poMode membedakan 2 jalur SATU modal/satu fungsi simpan (tanpa duplikasi):
  // 'from-pr' = PO dari PR approved (jalur A), 'manual' = PO manual + auto-PR approved (jalur B).
  const [poMode, setPoMode] = useState<'from-pr' | 'manual'>('from-pr')
  const [approvedPRs, setApprovedPRs] = useState<PRRow[]>([])
  const [prLoading, setPrLoading] = useState(false)
  const [materials, setMaterials] = useState<MaterialRow[]>([])
  const [poSaving, setPoSaving] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)

  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' })
  const [poForm, setPoForm] = useState({ supplier_id: '', actual_cost: '', invoice_document: '', notes: '', material_id: '', qty: '' })

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
    setSuppliers((data ?? []) as Supplier[])
    setLoading(false)
  }

  async function loadPOs() {
    setPoLoading(true)
    const { data } = await supabase
      .from('purchase_orders')
      .select('*, supplier:suppliers(name), pr:purchase_requests(material:materials(name))')
      .order('created_at', { ascending: false })
    setPoList((data ?? []) as POListRow[])
    setPoLoading(false)
  }

  useEffect(() => {
    load()
  }, [])
  useEffect(() => {
    if (tab === 'po') {
      loadPOs()
      loadApprovedPRs()
      loadMaterials()
    }
  }, [tab])

  // BUG-147 jalur A: daftar PR approved yang BELUM punya PO (1 PR = max 1 PO;
  // tidak ada unique constraint di DB jadi difilter di sini agar tombol "Buat PO" tidak dobel).
  async function loadApprovedPRs() {
    setPrLoading(true)
    const [{ data: prs }, { data: pos }] = await Promise.all([
      supabase
        .from('purchase_requests')
        .select('id, qty, estimated_cost, material_id, status, material:materials(name, supplier_id)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false }),
      supabase.from('purchase_orders').select('pr_id')
    ])
    const usedPrIds = new Set(((pos ?? []) as { pr_id: string | null }[]).map((p) => p.pr_id).filter(Boolean))
    setApprovedPRs((((prs ?? []) as PRRow[])).filter((pr) => !usedPrIds.has(pr.id)))
    setPrLoading(false)
  }

  async function loadMaterials() {
    const { data } = await supabase
      .from('materials')
      .select('id, name, unit, cost_per_unit, supplier_id, supplier:suppliers(name)')
      .order('name')
    setMaterials((data ?? []) as MaterialRow[])
  }

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

  function openEdit(s: Supplier) {
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
    exportToCSV(suppliers, EXPORT_COLUMNS as { key: keyof Supplier; label: string }[])
  }

  function handleDownloadTemplate() {
    generateCSVTemplate(IMPORT_COLUMNS)
  }

  async function handleImport(rows: Record<string, string | number | boolean | null>[]) {
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

  // BUG-147: SATU fungsi simpan PO untuk kedua jalur (single source of truth, tanpa duplikasi).
  // - Jalur A (from-pr): insert purchase_orders langsung (single-row, tanpa pergerakan uang/stok →
  //   TIDAK perlu RPC atomic; jurnal baru muncul saat bayar via createSimpleJournal idempoten di updatePOStatus).
  // - Jalur B (manual): insert PR approved dulu lalu PO — WAJIB karena receive_purchase_order_atomic
  //   menolak PO tanpa material/qty valid ('PO tidak memiliki material/qty valid').
  //   Rollback best-effort: kalau insert PO gagal setelah PR terbentuk, PR dihapus lagi.
  async function createPO(e: React.FormEvent) {
    e.preventDefault()
    setPoSaving(true)
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      const cost = Number(poForm.actual_cost)
      if (!poForm.supplier_id) { toast('error', 'Pilih supplier dulu.'); return }
      if (!Number.isFinite(cost) || cost < 0) { toast('error', 'Actual cost tidak valid.'); return }

      let prId: string | null = null

      if (poMode === 'from-pr') {
        if (!selectedPR) return
        // Guard anti-dobel: 1 PR = max 1 PO
        const { data: existing } = await supabase
          .from('purchase_orders')
          .select('id')
          .eq('pr_id', selectedPR.id)
          .limit(1)
        if (existing && existing.length > 0) {
          toast('error', 'PR ini sudah punya PO — muat ulang daftar.')
          loadApprovedPRs()
          return
        }
        prId = selectedPR.id
      } else {
        // Jalur B: PO manual → auto-PR approved di belakang layar (tanpa ubah schema)
        const qty = Number(poForm.qty)
        if (!poForm.material_id) { toast('error', 'Pilih material dulu.'); return }
        if (!Number.isFinite(qty) || qty <= 0) { toast('error', 'Qty harus lebih dari 0.'); return }
        const { data: pr, error: prError } = await supabase
          .from('purchase_requests')
          .insert({
            material_id: poForm.material_id,
            qty,
            estimated_cost: cost,
            status: 'approved',
            created_by: user?.id ?? null,
            approved_by: user?.id ?? null
          })
          .select('id')
          .single()
        if (prError || !pr) { toast('error', 'Gagal buat PR otomatis: ' + (prError?.message ?? 'unknown')); return }
        prId = pr.id
      }

      const { error } = await supabase.from('purchase_orders').insert({
        pr_id: prId,
        supplier_id: poForm.supplier_id,
        actual_cost: cost,
        status: 'pending',
        invoice_document: poForm.invoice_document || null
      })
      if (error) {
        // Rollback best-effort jalur manual: PO gagal → hapus PR otomatis yang baru dibuat
        if (poMode === 'manual' && prId) {
          await supabase.from('purchase_requests').delete().eq('id', prId)
        }
        toast('error', 'Gagal buat PO: ' + error.message)
        return
      }
      toast('success', 'Purchase Order berhasil dibuat')
      setShowPOForm(false)
      setSelectedPR(null)
      setPoForm({ supplier_id: '', actual_cost: '', invoice_document: '', notes: '', material_id: '', qty: '' })
      loadPOs()
      loadApprovedPRs()
    } catch (err) {
      toast('error', 'Gagal buat PO: ' + (err instanceof Error ? err.message : 'unknown'))
    } finally {
      setPoSaving(false)
    }
  }

  async function updatePOStatus(poId: string, status: string) {
    // BUG-147: terima-barang WAJIB lewat RPC receive_purchase_order_atomic (metode final) —
    // update langsung status='received' dari owner MELEWATKAN penambahan stock_gudang +
    // inventory_movements (jalur gudang /api/gudang/po-delivery sudah pakai RPC).
    if (status === 'received') {
      try {
        const res = await fetch('/api/gudang/po-delivery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ po_id: poId })
        })
        const json = await res.json()
        if (!res.ok) { toast('error', 'Gagal terima barang: ' + (json?.error?.message ?? res.statusText)); return }
      } catch (err) {
        toast('error', 'Gagal terima barang: ' + (err instanceof Error ? err.message : 'unknown'))
        return
      }
      toast('success', 'Barang diterima — stok gudang bertambah')
      loadPOs()
      return
    }
    // Phase 3 (BUG-096): bayar PO wajib jurnal hutang_paid (Dr Hutang / Cr Kas) —
    // judul tombol mengklaim "jurnal dibuat otomatis" tapi sebelumnya TIDAK dibuat →
    // PO paid tanpa jurnal → liabilitas & ledger bocor. Idempotent per PO.
    if (status === 'paid') {
      const { data: po } = await supabase
        .from('purchase_orders')
        .select('actual_cost, status, supplier:suppliers(name), invoice_document')
        .eq('id', poId)
        .single()
      if (!po) { toast('error', 'PO tidak ditemukan.'); return }
      const cost = Number(po.actual_cost ?? 0)
      if (cost > 0) {
        try {
          const { createSimpleJournal } = await import('@/utils/journal/create')
          await createSimpleJournal({
            transaction_type: 'hutang_paid',
            reference_type: 'purchase_order',
            reference_id: poId,
            description: `PO payment — pelunasan tagihan supplier ${(po.supplier as { name?: string } | null)?.name ?? ''}`,
            amount: cost,
            idempotency_key: `po_paid:${poId}`
          })
        } catch (jErr) {
          // Rollback: jurnal gagal → jangan tandai paid (PO tetap di status semula)
          console.error('Gagal buat jurnal PO paid:', jErr)
          toast('error', 'PO tidak ditandai lunas — jurnal hutang gagal. Periksa mapping akun di /finance/accounts/mapping.')
          return
        }
      }
    }

    const updates: Record<string, unknown> = { status }
    // 'received' ditangani RPC di atas (early return) — tidak pernah sampai sini.
    if (status === 'paid') {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      updates.paid_at = new Date().toISOString()
      updates.paid_by = user?.id
    }
    const { error } = await supabase.from('purchase_orders').update(updates).eq('id', poId)
    if (error) { toast('error', 'Gagal update PO: ' + error.message); return }
    toast('success', `PO → ${status === 'paid' ? 'Lunas' : status}`)
    loadPOs()
  }

  async function openCreatePO(pr: PRRow) {
    setPoMode('from-pr')
    setSelectedPR(pr)
    setPoForm({
      supplier_id: pr.material?.supplier_id ?? '',
      actual_cost: String(pr.estimated_cost ?? 0),
      invoice_document: '',
      notes: '',
      material_id: '',
      qty: ''
    })
    setShowPOForm(true)
  }

  // BUG-147 jalur B: PO manual — user pilih material+supplier+harga langsung;
  // PR approved dibuat otomatis di createPO (tanpa ubah schema).
  function openManualPO() {
    setPoMode('manual')
    setSelectedPR(null)
    setPoForm({ supplier_id: '', actual_cost: '', invoice_document: '', notes: '', material_id: '', qty: '' })
    setShowPOForm(true)
  }

  
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
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(['suppliers', 'po', 'price-history'] as const).map((t) => (
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
            {t === 'suppliers' ? '🏭 Suppliers' : t === 'po' ? '📋 Purchase Orders' : '📈 Riwayat Harga'}
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
                  <span className="mobile-card-value">{s.name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Kontak</span>
                  <span className="mobile-card-value">{s.contact_person}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">HP</span>
                  <span className="mobile-card-value">{s.phone}</span>
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
              <>
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
                    {filtered.slice(supPage * supPageSize, (supPage + 1) * supPageSize).map((s) => (
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
                      <ActionMenu
                        items={[
                          { label: 'Edit', icon: <Pencil size={14} />, onClick: () => openEdit(s) },
                          { label: 'Hapus', icon: <Trash2 size={14} />, onClick: () => handleDelete(s.id), danger: true }
                        ]}
                      />
                    </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: '0 1.25rem 1rem' }}>
                  <Pagination
                    currentPage={supPage + 1}
                    totalPages={Math.max(1, Math.ceil(filtered.length / supPageSize))}
                    onPageChange={(p) => setSupPage(p - 1)}
                    pageSize={supPageSize}
                    onPageSizeChange={(s) => {
                      setSupPageSize(s)
                      setSupPage(0)
                    }}
                    totalItems={filtered.length}
                    startIndex={filtered.length === 0 ? 0 : supPage * supPageSize + 1}
                    endIndex={Math.min((supPage + 1) * supPageSize, filtered.length)}
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}

      {tab === 'po' && (
        <>
          {/* BUG-147 toolbar: jalur B (PO manual) + refresh */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <button
              onClick={openManualPO}
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
              <Plus size={16} /> Buat PO Manual
            </button>
            <button
              onClick={() => { loadPOs(); loadApprovedPRs(); loadMaterials() }}
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
              ⟳ Refresh
            </button>
          </div>

          {/* BUG-147 jalur A: PR approved yang belum punya PO + tombol "Buat PO" per baris.
              Sebelumnya openCreatePO tidak pernah dipanggil tombol mana pun (dead code). */}
          <div style={{ marginBottom: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', background: 'var(--neutral-100)', fontWeight: '700', fontSize: '0.875rem' }}>
              ✅ PR Disetujui — Siap Dibuatkan PO ({approvedPRs.length})
            </div>
            {prLoading ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat PR…</div>
            ) : approvedPRs.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)', fontSize: '0.85rem' }}>
                Tidak ada PR menunggu — semua PR approved sudah punya PO atau belum ada yang di-approve admin.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--neutral-600)' }}>
                    <th style={{ padding: '0.625rem 1rem' }}>Material</th>
                    <th style={{ padding: '0.625rem 1rem' }}>Qty</th>
                    <th style={{ padding: '0.625rem 1rem' }}>Estimasi</th>
                    <th style={{ padding: '0.625rem 1rem' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedPRs.map((pr) => (
                    <tr key={pr.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.625rem 1rem', fontWeight: '600' }}>{pr.material?.name ?? '—'}</td>
                      <td style={{ padding: '0.625rem 1rem' }}>{pr.qty ?? 0}</td>
                      <td style={{ padding: '0.625rem 1rem', color: '#cc7030', fontWeight: '600' }}>{formatRp(pr.estimated_cost ?? 0)}</td>
                      <td style={{ padding: '0.625rem 1rem' }}>
                        <button
                          onClick={() => openCreatePO(pr)}
                          style={{
                            padding: '0.375rem 0.875rem',
                            background: '#cc7030',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Buat PO
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
      {/* Mobile: card list */}
      <div className="mobile-only">
        {poList.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={poList} keyOf={(po) => po.id} renderCard={(po) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Supplier</span>
                  <span className="mobile-card-value">{po.supplier?.name ?? po.supplier_name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Material</span>
                  <span className="mobile-card-value">{po.material?.name ?? po.material_name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Cost</span>
                  <span className="mobile-card-value">{po.cost ?? po.amount}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Status</span>
                  <span className="mobile-card-value">{po.status}</span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
            {poLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
            ) : poList.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
                <FileText size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
                <p>Belum ada Purchase Order</p>
              </div>
            ) : (
              <>
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
                    {poList.slice(poPage * poPageSize, (poPage + 1) * poPageSize).map((po) => {
                      const statusColors: Record<string, { bg: string; text: string }> = {
                        pending: { bg: '#fef3c7', text: '#92400e' },
                        delivered: { bg: '#dbeafe', text: '#1e40af' },
                        received: { bg: '#d1fae5', text: '#065f46' },
                        paid: { bg: '#22c55e', text: '#fff' }
                      }
                      const sc = statusColors[po.status ?? 'pending'] ?? statusColors.pending
                      return (
                        <tr key={po.id}>
                          <td style={{ fontWeight: '600' }}>{po.supplier?.name ?? '—'}</td>
                          <td style={{ color: 'var(--neutral-600)' }}>{po.pr?.material?.name ?? '—'}</td>
                          <td style={{ fontWeight: '600', color: '#cc7030' }}>{formatRp(po.actual_cost ?? 0)}</td>
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
                                  title="Tandai barang sudah dikirim oleh supplier"
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
                                title="Terima barang dari supplier (stok gudang bertambah)"
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
                                title="Tandai tagihan supplier sudah dibayar (jurnal hutang dibuat otomatis)"
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
              <div style={{ padding: '0 1.25rem 1rem' }}>
                <Pagination
                  currentPage={poPage + 1}
                  totalPages={Math.max(1, Math.ceil(poList.length / poPageSize))}
                  onPageChange={(p) => setPoPage(p - 1)}
                  pageSize={poPageSize}
                  onPageSizeChange={(s) => {
                    setPoPageSize(s)
                    setPoPage(0)
                  }}
                  totalItems={poList.length}
                  startIndex={poList.length === 0 ? 0 : poPage * poPageSize + 1}
                  endIndex={Math.min((poPage + 1) * poPageSize, poList.length)}
                />
              </div>
              </>
            )}
          </div>
        </>
      )}

      {tab === 'price-history' && (
        <PriceHistoryTab />
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

      {/* Create PO Modal — BUG-147: SATU modal untuk jalur A (dari PR) & B (manual + auto-PR) */}
      <Modal
        open={showPOForm && (poMode === 'manual' || !!selectedPR)}
        onClose={() => setShowPOForm(false)}
        maxWidth={480}
        padding="2rem"
        zIndex={200}
      >
        {(poMode === 'manual' || selectedPR) && (
          <>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>
              {poMode === 'manual' ? 'Buat Purchase Order Manual' : 'Buat Purchase Order'}
            </h2>
            {poMode === 'from-pr' && selectedPR ? (
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
                Qty: {selectedPR.qty ?? 0} | Estimasi: {formatRp(selectedPR.estimated_cost ?? 0)}
              </div>
            </div>
            ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', background: 'var(--neutral-100)', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>
              PO manual otomatis membuatkan PR berstatus approved di belakang layar (qty & material di bawah).
            </div>
            )}
            <form onSubmit={createPO} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {poMode === 'manual' && (
                <>
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
                      Material *
                    </label>
                    <select
                      required
                      value={poForm.material_id}
                      onChange={(e) => {
                        const m = materials.find((x) => x.id === e.target.value)
                        setPoForm((f) => ({
                          ...f,
                          material_id: e.target.value,
                          supplier_id: m?.supplier_id ?? f.supplier_id,
                          actual_cost: m?.cost_per_unit != null ? String(m.cost_per_unit) : f.actual_cost
                        }))
                      }}
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
                      <option value="">-- Pilih Material --</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}{m.unit ? ` (${m.unit})` : ''}
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
                      Qty *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="0"
                      value={poForm.qty}
                      onChange={(e) => setPoForm((f) => ({ ...f, qty: e.target.value }))}
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
                </>
              )}
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
