'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Customer } from '@/types'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

const PAGE_SIZE = 20

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const supabase = createClient()

  async function fetchCustomers() {
    setLoading(true)
    const from = (currentPage - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const [dataResult, countResult] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact' }).order('name').range(from, to),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
    ])

    setCustomers((dataResult.data as Customer[]) ?? [])
    setTotalCount(countResult.count ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetchCustomers() }, [currentPage])

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  )

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('customers').insert({
      name: form.name,
      phone: form.phone,
      address: form.address || null,
      notes: form.notes || null,
    })
    setSaving(false)
    setShowForm(false)
    setForm({ name: '', phone: '', address: '', notes: '' })
    fetchCustomers()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Pelanggan</h1>
        <p className="page-subtitle">Database pelanggan KJ Homedecor</p>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="Cari nama atau nomor HP..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '0.625rem 1rem 0.625rem 2.25rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}>
          <Plus size={16} /> Tambah Pelanggan
        </button>
      </div>

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '1.5rem' }}><TableSkeleton rows={8} cols={5} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="👥" title="Belum ada pelanggan" description="Tambah pelanggan baru dengan tombol di atas." />
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
                    <a href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#16a34a', textDecoration: 'none', fontWeight: '500' }}>
                      {c.phone}
                    </a>
                  </td>
                  <td style={{ color: '#6b7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address ?? '—'}</td>
                  <td style={{ color: '#6b7280' }}>{c.notes ?? '—'}</td>
                  <td style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                    {new Date(c.created_at).toLocaleDateString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', padding: '0.75rem 0', borderTop: '1px solid #e5e7eb' }}>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            Halaman {currentPage} dari {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))} — {totalCount} pelanggan
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

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ background: '#fff', borderRadius: '0.875rem', padding: '2rem', width: '100%', maxWidth: 460, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Tambah Pelanggan</h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'Nama *', id: 'name', placeholder: 'Nama lengkap', required: true },
                { label: 'No. HP *', id: 'phone', placeholder: '08xxx', required: true },
                { label: 'Alamat', id: 'address', placeholder: 'Jl. ...', required: false },
                { label: 'Catatan', id: 'notes', placeholder: 'Catatan tambahan', required: false },
              ].map((f) => (
                <div key={f.id}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>{f.label}</label>
                  <input type="text" required={f.required} placeholder={f.placeholder} value={(form as Record<string, string>)[f.id]} onChange={(e) => setForm((prev) => ({ ...prev, [f.id]: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: '#fff', cursor: 'pointer', fontWeight: '600' }}>Batal</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.75rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '600' }}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
