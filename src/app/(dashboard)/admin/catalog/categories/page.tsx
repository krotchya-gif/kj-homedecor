'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Edit, Trash2, X, Loader2, Tag } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  image_url: string | null
  parent_id: string | null
  created_at: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [form, setForm] = useState({ name: '', slug: '' })
  const supabase = createClient()

  useEffect(() => { loadCategories() }, [])

  async function loadCategories() {
    setLoading(true)
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data ?? [])
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    if (editing) {
      await supabase.from('categories').update({ name: form.name, slug: form.slug }).eq('id', editing.id)
    } else {
      await supabase.from('categories').insert({ name: form.name, slug: form.slug })
    }

    setSaving(false)
    setShowForm(false)
    setEditing(null)
    setForm({ name: '', slug: '' })
    loadCategories()
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin hapus kategori ini?')) return
    setDeleting(id)
    await supabase.from('categories').delete().eq('id', id)
    setDeleting(null)
    loadCategories()
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setForm({ name: cat.name, slug: cat.slug })
    setShowForm(true)
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Kategori</h1>
          <p className="page-subtitle">Kelola kategori produk</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm({ name: '', slug: '' }); setShowForm(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}
        >
          <Plus size={16} /> Tambah Kategori
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#cc7030' }} />
        </div>
      ) : categories.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
          <Tag size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
          <p>Belum ada kategori</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
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
                {categories.map(cat => (
                  <tr key={cat.id}>
                    <td style={{ fontWeight: '600' }}>{cat.name}</td>
                    <td style={{ color: '#6b7280', fontFamily: 'monospace' }}>{cat.slug}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => openEdit(cat)} style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.375rem', cursor: 'pointer', color: '#6b7280' }}>
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDelete(cat.id)} disabled={deleting === cat.id} style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: '0.375rem', padding: '0.375rem', cursor: 'pointer', color: '#ef4444' }}>
                          {deleting === cat.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
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

      {showForm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditing(null) } }}
        >
          <div style={{ background: '#fff', borderRadius: '0.875rem', padding: '2rem', width: '100%', maxWidth: 480, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>{editing ? 'Edit Kategori' : 'Kategori Baru'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Nama Kategori *</label>
                <input
                  required
                  type="text"
                  placeholder="cth: Gorden"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Slug *</label>
                <input
                  required
                  type="text"
                  placeholder="cth: gorden"
                  value={form.slug}
                  onChange={(e) => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null) }} style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: '#fff', cursor: 'pointer', fontWeight: '600' }}>Batal</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.75rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                  {saving ? 'Menyimpan...' : editing ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
