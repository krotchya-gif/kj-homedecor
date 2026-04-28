'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Edit, Trash2, X, ImageIcon, Loader2, ExternalLink } from 'lucide-react'
import { uploadToLocal } from '@/lib/upload'

interface PortfolioPost {
  id: string
  title: string
  content: string
  images: string[]
  created_at: string
  updated_at: string
}

export default function AdminPortfolioPage() {
  const [posts, setPosts] = useState<PortfolioPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPost, setEditingPost] = useState<PortfolioPost | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({ title: '', content: '', images: [] as string[] })
  const supabase = createClient()

  useEffect(() => { loadPosts() }, [])

  async function loadPosts() {
    setLoading(true)
    const { data } = await supabase
      .from('portfolio_posts')
      .select('*')
      .order('created_at', { ascending: false })
    setPosts(data ?? [])
    setLoading(false)
  }

  function openCreate() {
    setEditingPost(null)
    setForm({ title: '', content: '', images: [] })
    setShowForm(true)
  }

  function openEdit(post: PortfolioPost) {
    setEditingPost(post)
    setForm({ title: post.title, content: post.content, images: post.images ?? [] })
    setShowForm(true)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        const result = await uploadToLocal(file, 'portfolio', { compress: true, maxSizeMB: 1 })
        uploaded.push(result.url)
      }
      setForm(f => ({ ...f, images: [...f.images, ...uploaded] }))
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Gagal upload gambar')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    if (editingPost) {
      await supabase.from('portfolio_posts').update({
        title: form.title,
        content: form.content,
        images: form.images,
      }).eq('id', editingPost.id)
    } else {
      await supabase.from('portfolio_posts').insert({
        title: form.title,
        content: form.content,
        images: form.images,
      })
    }

    setSaving(false)
    setShowForm(false)
    loadPosts()
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin hapus post ini?')) return
    setDeleting(id)
    await supabase.from('portfolio_posts').delete().eq('id', id)
    setDeleting(null)
    loadPosts()
  }

  function removeImage(idx: number) {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Portofolio</h1>
          <p className="page-subtitle">Blog dan galeri inspirasi produk</p>
        </div>
        <button
          onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}
        >
          <Plus size={16} /> Buat Post Baru
        </button>
      </div>

      {/* Posts Grid */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
      ) : posts.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
          <ImageIcon size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
          <p>Belum ada post portofolio</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {posts.map(post => (
            <div key={post.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
              {post.images && post.images.length > 0 ? (
                <div style={{ display: 'flex', gap: '0.25rem', padding: '0.5rem', background: '#f9fafb', overflowX: 'auto' }}>
                  {post.images.slice(0, 3).map((img, i) => (
                    <img key={i} src={img} alt={`Post ${i}`} style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: '0.375rem', border: '1px solid #e5e7eb', flexShrink: 0 }} />
                  ))}
                  {post.images.length > 3 && (
                    <div style={{ width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#6b7280', flexShrink: 0 }}>
                      +{post.images.length - 3}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ height: 100, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon size={24} style={{ color: '#d1d5db' }} />
                </div>
              )}
              <div style={{ padding: '1rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem', lineHeight: 1.3 }}>{post.title}</h3>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.75rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {post.content}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                    {new Date(post.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => openEdit(post)} style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.375rem', cursor: 'pointer', color: '#6b7280' }}>
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(post.id)} disabled={deleting === post.id} style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: '0.375rem', padding: '0.375rem', cursor: 'pointer', color: '#ef4444' }}>
                      {deleting === post.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}
        >
          <div style={{ background: '#fff', borderRadius: '0.875rem', padding: '2rem', width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>{editingPost ? 'Edit Post' : 'Post Baru'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Judul *</label>
                <input
                  required
                  type="text"
                  placeholder="Judul post..."
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Konten *</label>
                <textarea
                  required
                  placeholder="Tulis konten post di sini..."
                  value={form.content}
                  onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={6}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Gambar ({form.images.length})</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {form.images.map((url, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={url} alt={`Img ${i}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }} />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        style={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', fontSize: '0.7rem', cursor: 'pointer' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {uploading ? (
                    <div style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: '0.5rem' }}>
                      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#9ca3af' }} />
                    </div>
                  ) : (
                    <label style={{ width: 80, height: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', border: '2px dashed #d1d5db', borderRadius: '0.5rem', cursor: 'pointer' }}>
                      <ImageIcon size={18} style={{ color: '#9ca3af' }} />
                      <span style={{ fontSize: '0.6rem', color: '#9ca3af', marginTop: '0.25rem' }}>Upload</span>
                      <input type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: '#fff', cursor: 'pointer', fontWeight: '600' }}>Batal</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.75rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                  {saving ? 'Menyimpan...' : editingPost ? 'Update Post' : 'Publikasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}