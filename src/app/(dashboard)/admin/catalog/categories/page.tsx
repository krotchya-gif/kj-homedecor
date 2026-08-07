'use client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Edit, Trash2, X, Loader2, Tag } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface Category {
  id: string
  name: string
  slug: string
  image_url: string | null
  parent_id: string | null
  created_at: string
}

export default function CategoriesPage() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [form, setForm] = useState({ name: '', slug: '' })
  const supabase = createClient()

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    setLoading(true)
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data ?? [])
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    let err: { message: string } | null = null
    if (editing) {
      const res = await supabase.from('categories').update({ name: form.name, slug: form.slug }).eq('id', editing.id)
      err = res.error
    } else {
      const res = await supabase.from('categories').insert({ name: form.name, slug: form.slug })
      err = res.error
    }
    setSaving(false)
    if (err) { toast('error', 'Gagal simpan kategori: ' + err.message); return }
    setShowForm(false)
    setEditing(null)
    setForm({ name: '', slug: '' })
    loadCategories()
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin hapus kategori ini?')) return
    setDeleting(id)
    const { error } = await supabase.from('categories').delete().eq('id', id)

    if (error) { setDeleting(null); toast('error', 'Gagal hapus: ' + error.message); return }
    loadCategories()
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setForm({ name: cat.name, slug: cat.slug })
    setShowForm(true)
  }

  return (
    <div>
      <PageHeader
        title="Kategori"
        subtitle="Kelola kategori produk"
        action={
          <button
            onClick={() => {
              setEditing(null)
              setForm({ name: '', slug: '' })
              setShowForm(true)
            }}
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
        }
      />

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#cc7030' }} />
        </div>
      ) : categories.length === 0 ? (
        <div className="section-card">
          <Tag size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
          <p>Belum ada kategori</p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Slug</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td style={{ fontWeight: '600' }}>{cat.name}</td>
                    <td style={{ color: 'var(--neutral-600)', fontFamily: 'monospace' }}>{cat.slug}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => openEdit(cat)}
                          style={{
                            background: 'none',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            padding: '0.375rem',
                            cursor: 'pointer',
                            color: 'var(--neutral-600)'
                          }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          disabled={deleting === cat.id}
                          style={{
                            background: 'none',
                            border: '1px solid #fca5a5',
                            borderRadius: '0.375rem',
                            padding: '0.375rem',
                            cursor: 'pointer',
                            color: '#ef4444'
                          }}
                        >
                          {deleting === cat.id ? (
                            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false)
          setEditing(null)
        }}
        maxWidth={480}
        padding="2rem"
        zIndex={200}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>
            {editing ? 'Edit Kategori' : 'Kategori Baru'}
          </h2>
          <button
            onClick={() => {
              setShowForm(false)
              setEditing(null)
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>
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
              placeholder="cth: Gorden"
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
              Slug *
            </label>
            <input
              required
              type="text"
              placeholder="cth: gorden"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
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
              onClick={() => {
                setShowForm(false)
                setEditing(null)
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
              {saving ? 'Menyimpan...' : editing ? 'Update' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
