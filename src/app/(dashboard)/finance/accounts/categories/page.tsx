'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, Pencil, Trash2, FolderOpen } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import ActionMenu from '@/components/ui/ActionMenu'

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const
const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  asset: { bg: '#dbeafe', text: '#1e40af' },
  liability: { bg: '#fef3c7', text: '#92400e' },
  equity: { bg: '#d1fae5', text: '#065f46' },
  revenue: { bg: '#e0e7ff', text: '#3730a3' },
  expense: { bg: '#fef2f2', text: '#991b1b' }
}

interface Category {
  id: string
  name: string
  type: (typeof ACCOUNT_TYPES)[number]
  description?: string
}

export default function CategoriesPage() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'asset' as (typeof ACCOUNT_TYPES)[number], description: '' })

  const supabase = createClient()

  async function fetchCategories() {
    setLoading(true)
    const { data } = await supabase.from('account_categories').select('*').order('name')
    setCategories((data as Category[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const filtered = categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

  function openAdd() {
    setEditItem(null)
    setForm({ name: '', type: 'asset', description: '' })
    setShowForm(true)
  }

  function openEdit(c: Category) {
    setEditItem(c)
    setForm({ name: c.name, type: c.type, description: c.description ?? '' })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { name: form.name, type: form.type, description: form.description || null }
    if (editItem) {
        // UPDATE optimistic
        const prev = categories
        setCategories((curr) => curr.map((x) => (x.id === editItem.id ? { ...x, ...payload } : x) as any))
        const { error } = await supabase.from('account_categories').update(payload).eq('id', editItem.id)
        if (error) { setCategories(prev); setSaving(false); toast('error', 'Gagal simpan: ' + error.message); return }
      } else {
        // CREATE optimistic: id sementara dulu, diganti id asli dari server
        const tempId = crypto.randomUUID()
        const tempItem = { id: tempId, ...payload }
        setCategories((curr) => [tempItem, ...curr] as any)
        const { data, error } = await supabase.from('account_categories').insert(payload).select('id').single()
        if (error) {
          setCategories((curr) => curr.filter((x) => x.id !== tempId))
          setSaving(false)
          toast('error', 'Gagal simpan: ' + error.message)
          return
        }
        if (data?.id) {
          setCategories((curr) => curr.map((x) => (x.id === tempId ? { ...x, id: data.id } : x)))
        }
      }
      setSaving(false)
      setShowForm(false)
      toast('success', editItem ? 'Berhasil diperbarui' : 'Berhasil ditambahkan')
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin hapus?')) return
      // Optimistic delete
      const prev = categories
      setCategories((curr) => curr.filter((x) => x.id !== id))
      const { error } = await supabase.from('account_categories').delete().eq('id', id)
      if (error) { setCategories(prev); toast('error', 'Gagal hapus: ' + error.message); return }
      toast('success', 'Berhasil dihapus')
  }

  return (
    <div>
      <PageHeader title="Kategori Akun" subtitle="Kategori untuk chart of accounts" />

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
            placeholder="Cari kategori..."
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
          <Plus size={16} /> Tambah Kategori
        </button>
      </div>

            {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={filtered} keyOf={(c) => c.id} renderCard={(c) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Nama</span>
                  <span className="mobile-card-value">{c.name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Tipe</span>
                  <span className="mobile-card-value">{c.type}</span>
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
            <FolderOpen size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada kategori</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nama Kategori</th>
                <th>Tipe Akun</th>
                <th>Deskripsi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const tc = TYPE_COLORS[c.type] ?? TYPE_COLORS.asset
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: '500' }}>{c.name}</td>
                    <td>
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: tc.bg,
                          color: tc.text,
                          textTransform: 'capitalize'
                        }}
                      >
                        {c.type}
                      </span>
                    </td>
                    <td style={{ color: 'var(--neutral-600)' }}>{c.description ?? '—'}</td>
                    <td>
                    <ActionMenu
                      items={[
                        { label: 'Edit', icon: <Pencil size={14} />, onClick: () => openEdit(c) },
                        { label: 'Hapus', icon: <Trash2 size={14} />, onClick: () => handleDelete(c.id), danger: true }
                      ]}
                    />
                  </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} maxWidth={480} padding="2rem" zIndex={200}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>
          {editItem ? 'Edit Kategori' : 'Tambah Kategori'}
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
              Nama Kategori *
            </label>
            <input
              required
              type="text"
              placeholder="Nama kategori"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
              Tipe Akun *
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as (typeof ACCOUNT_TYPES)[number] }))}
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
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t} style={{ textTransform: 'capitalize' }}>
                  {t}
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
              Deskripsi
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
    </div>
  )
}
