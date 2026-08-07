'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, Users, ChevronLeft, ChevronRight, Download, Upload, Pencil } from 'lucide-react'
import type { Customer } from '@/types'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import ImportModal from '@/components/ui/ImportModal'
import { Modal } from '@/components/ui/Modal'
import { exportToCSV, generateCSVTemplate } from '@/lib/csv'
import { useToast } from '@/components/ui/Toast'

const PAGE_SIZE = 20

const IMPORT_COLUMNS = [
  { key: 'name', label: 'Nama', required: true },
  { key: 'phone', label: 'No. HP / WhatsApp', aliases: ['whatsapp', 'telepon', 'no_hp', 'no_telp'] },
  { key: 'address', label: 'Alamat', aliases: ['alamat'] },
  { key: 'notes', label: 'Catatan', aliases: ['keterangan', 'note'] }
]

const EXPORT_COLUMNS = [
  { key: 'name', label: 'Nama' },
  { key: 'phone', label: 'No. HP' },
  { key: 'address', label: 'Alamat' },
  { key: 'notes', label: 'Catatan' }
]

export default function CustomersPage() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [importModalOpen, setImportModalOpen] = useState(false)

  const supabase = createClient()

  async function fetchCustomers() {
    setLoading(true)
    const from = (currentPage - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const [dataResult, countResult] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact' }).order('name').range(from, to),
      supabase.from('customers').select('id', { count: 'exact', head: true })
    ])

    setCustomers((dataResult.data as Customer[]) ?? [])
    setTotalCount(countResult.count ?? 0)
    setLoading(false)
  }

  useEffect(() => {
    fetchCustomers()
  }, [currentPage])

  function handleExport() {
    exportToCSV(customers as any, EXPORT_COLUMNS)
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
        const { error } = await supabase.from('customers').insert({
          name: String(row.name ?? ''),
          phone: String(row.phone ?? ''),
          address: row.address ? String(row.address) : null,
          notes: row.notes ? String(row.notes) : null
        })
        if (error) errors.push(`Row ${i + 1}: ${error.message}`)
        else inserted++
      }
    }
    fetchCustomers()
    toast(errors.length > 0 ? 'warning' : 'success', `Import selesai: ${inserted} data baru${errors.length > 0 ? `, ${errors.length} error` : ''}`)
    return { inserted, updated: 0, errors }
  }

  const filtered = customers.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  )

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    if (editCustomer) {
      // UPDATE optimistic
      const prev = customers
      setCustomers((curr) =>
        curr.map((c) => (c.id === editCustomer.id ? { ...c, name: form.name, phone: form.phone, address: form.address || undefined, notes: form.notes || undefined } : c))
      )
      const res = await supabase
        .from('customers')
        .update({
          name: form.name,
          phone: form.phone,
          address: form.address || null,
          notes: form.notes || null
        })
        .eq('id', editCustomer.id)
      if (res.error) {
        setCustomers(prev)
        setSaving(false)
        toast('error', 'Gagal simpan customer: ' + res.error.message)
        return
      }
    } else {
      // CREATE optimistic: id sementara dulu, diganti id asli dari server
      const tempId = crypto.randomUUID()
      const tempItem = {
        id: tempId,
        name: form.name,
        phone: form.phone,
        address: form.address || undefined,
        notes: form.notes || undefined
      } as Customer
      setCustomers((curr) => [tempItem, ...curr])
      const res = await supabase
        .from('customers')
        .insert({
          name: form.name,
          phone: form.phone,
          address: form.address || null,
          notes: form.notes || null
        })
        .select('id')
        .single()
      if (res.error) {
        setCustomers((curr) => curr.filter((c) => c.id !== tempId))
        setSaving(false)
        toast('error', 'Gagal simpan customer: ' + res.error.message)
        return
      }
      if (res.data?.id) {
        setCustomers((curr) => curr.map((c) => (c.id === tempId ? { ...c, id: res.data.id } : c)))
      }
    }
    setSaving(false)
    setShowForm(false)
    setEditCustomer(null)
    setForm({ name: '', phone: '', address: '', notes: '' })
    toast('success', editCustomer ? 'Customer berhasil diperbarui' : 'Customer berhasil ditambahkan')
  }

  function openEdit(c: Customer) {
    setEditCustomer(c)
    setForm({ name: c.name, phone: c.phone || '', address: c.address || '', notes: c.notes || '' })
    setShowForm(true)
  }

  function openAdd() {
    setEditCustomer(null)
    setForm({ name: '', phone: '', address: '', notes: '' })
    setShowForm(true)
  }

  return (
    <div>
      <PageHeader title="Pelanggan" subtitle="Database pelanggan KJ Homedecor" />

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
            placeholder="Cari nama atau nomor HP..."
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

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '1.5rem' }}>
            <TableSkeleton rows={8} cols={5} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="👥"
            title="Belum ada pelanggan"
            description="Tambah pelanggan baru dengan tombol di atas."
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>No. HP</th>
                <th>Alamat</th>
                <th>Catatan</th>
                <th>Terdaftar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: '500' }}>{c.name}</td>
                  <td>
                    <a
                      href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#16a34a', textDecoration: 'none', fontWeight: '500' }}
                    >
                      {c.phone}
                    </a>
                  </td>
                  <td
                    style={{
                      color: 'var(--neutral-600)',
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {c.address ?? '—'}
                  </td>
                  <td style={{ color: 'var(--neutral-600)' }}>{c.notes ?? '—'}</td>
                  <td style={{ color: 'var(--neutral-400)', fontSize: '0.8rem' }}>
                    {new Date(c.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td>
                    <button
                      onClick={() => openEdit(c)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        color: 'var(--neutral-600)'
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '1rem',
            padding: '0.75rem 0',
            borderTop: '1px solid #e5e7eb'
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
            Halaman {currentPage} dari {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))} — {totalCount} pelanggan
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                background: 'var(--surface)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                color: currentPage === 1 ? 'var(--neutral-400)' : 'var(--neutral-700)'
              }}
            >
              <ChevronLeft size={14} /> Sebelumnya
            </button>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                background: 'var(--surface)',
                cursor: currentPage >= Math.ceil(totalCount / PAGE_SIZE) ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                color: currentPage >= Math.ceil(totalCount / PAGE_SIZE) ? 'var(--neutral-400)' : 'var(--neutral-700)'
              }}
            >
              Selanjutnya <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} maxWidth={460} padding="2rem">
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>
          {editCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
        </h2>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { label: 'Nama *', id: 'name', placeholder: 'Nama lengkap', required: true },
            { label: 'No. HP *', id: 'phone', placeholder: '08xxx', required: true },
            { label: 'Alamat', id: 'address', placeholder: 'Jl. ...', required: false },
            { label: 'Catatan', id: 'notes', placeholder: 'Catatan tambahan', required: false }
          ].map((f) => (
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
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        columns={IMPORT_COLUMNS}
        onImport={handleImport}
        entityName="Pelanggan"
      />
    </div>
  )
}
