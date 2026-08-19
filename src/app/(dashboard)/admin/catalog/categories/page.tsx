'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Edit, Trash2, X, Loader2, Tag, Upload, Trash } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { uploadToLocal } from '@/lib/upload'

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
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [form, setForm] = useState({ name: '', slug: '', image_url: '' })
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

    if (editing) {
      // UPDATE optimistic
      const prev = categories
      setCategories((curr) => curr.map((c) => (c.id === editing.id ? { ...c, name: form.name, slug: form.slug, image_url: form.image_url || null } : c)))
      const res = await supabase
        .from('categories')
        .update({ name: form.name, slug: form.slug, image_url: form.image_url || null })
        .eq('id', editing.id)
      if (res.error) {
        setCategories(prev)
        setSaving(false)
        toast('error', 'Gagal simpan kategori: ' + res.error.message)
        return
      }
    } else {
      // CREATE optimistic: id sementara dulu, diganti id asli dari server
      const tempId = crypto.randomUUID()
      const tempItem = { id: tempId, name: form.name, slug: form.slug, image_url: form.image_url || null } as Category
      setCategories((curr) => [tempItem, ...curr])
      const res = await supabase
        .from('categories')
        .insert({ name: form.name, slug: form.slug, image_url: form.image_url || null })
        .select('id')
        .single()
      if (res.error) {
        setCategories((curr) => curr.filter((c) => c.id !== tempId))
        setSaving(false)
        toast('error', 'Gagal simpan kategori: ' + res.error.message)
        return
      }
      if (res.data?.id) {
        setCategories((curr) => curr.map((c) => (c.id === tempId ? { ...c, id: res.data.id } : c)))
      }
    }
    setSaving(false)
    setShowForm(false)
    setEditing(null)
    setForm({ name: '', slug: '', image_url: '' })
    toast('success', editing ? 'Kategori berhasil diperbarui' : 'Kategori berhasil ditambahkan')
    }

    async function handleDelete(id: string) {
    if (!confirm('Yakin hapus kategori ini?')) return
    setDeleting(id)
    // Optimistic delete: hapus dari UI dulu, rollback kalau server error
    const prev = categories
    setCategories((curr) => curr.filter((c) => c.id !== id))
    const { error } = await supabase.from('categories').delete().eq('id', id)

    if (error) { setCategories(prev); setDeleting(null); toast('error', 'Gagal hapus: ' + error.message); return }
    setDeleting(null)
    toast('success', 'Kategori berhasil dihapus')
    }

  function openEdit(cat: Category) {
    setEditing(cat)
    setForm({ name: cat.name, slug: cat.slug, image_url: cat.image_url ?? '' })
    setShowForm(true)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadToLocal(file, 'banners', { compress: true, maxSizeMB: 2 })
      setForm((f) => ({ ...f, image_url: result.url }))
      toast('success', 'Gambar ter-upload. Simpan untuk menerapkan.')
    } catch (err) {
      toast('error', 'Gagal upload gambar: ' + (err instanceof Error ? err.message : 'unknown'))
    } finally {
      setUploading(false)
    }
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
              setForm({ name: '', slug: '', image_url: '' })
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
                {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : categories.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={categories} keyOf={(cat) => cat.id} renderCard={(cat) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Nama</span>
                  <span className="mobile-card-value">{cat.name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Slug</span>
                  <span className="mobile-card-value">{cat.slug}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Gambar</span>
                  {cat.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cat.image_url} alt={cat.name} style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: '0.375rem' }} />
                  ) : (
                    <span className="mobile-card-value">—</span>
                  )}
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Slug</th>
                  <th>Gambar</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td style={{ fontWeight: '600' }}>{cat.name}</td>
                    <td style={{ color: 'var(--neutral-600)', fontFamily: 'monospace' }}>{cat.slug}</td>
                    <td>
                      {cat.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cat.image_url} alt={cat.name} style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: '0.375rem' }} />
                      ) : (
                        <span style={{ color: 'var(--neutral-400)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
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
              Gambar Kategori
            </label>
            {form.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.image_url}
                alt="Preview kategori"
                style={{
                  width: '100%',
                  maxHeight: 140,
                  objectFit: 'cover',
                  borderRadius: '0.5rem',
                  marginBottom: '0.5rem'
                }}
              />
            )}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  background: 'var(--surface)',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '0.85rem',
                  color: 'var(--neutral-700)'
                }}
              >
                <Upload size={14} /> {uploading ? 'Mengunggah...' : 'Upload Gambar'}
                <input type="file" accept="image/*" hidden disabled={uploading} onChange={handleImageUpload} />
              </label>
              {form.image_url && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, image_url: '' }))}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.5rem 0.875rem',
                    border: '1px solid #fca5a5',
                    borderRadius: '0.5rem',
                    background: 'var(--surface)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: '#ef4444'
                  }}
                >
                  <Trash size={14} /> Hapus
                </button>
              )}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.35rem' }}>
              Gambar tampil di kartu kategori landing page. (JPEG/PNG/WebP, maks 2MB)
            </p>
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
