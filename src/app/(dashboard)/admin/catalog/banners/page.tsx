'use client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Edit, Trash2, X, Loader2, ImageIcon } from 'lucide-react'
import { uploadToLocal } from '@/lib/upload'

interface Banner {
  id: string
  image_url: string
  sequence: number
  is_active: boolean
  created_at: string
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadBanners()
  }, [])

  async function loadBanners() {
    setLoading(true)
    const { data } = await supabase.from('banners').select('*').order('sequence')
    setBanners(data ?? [])
    setLoading(false)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const result = await uploadToLocal(file, 'banners', { compress: true, maxSizeMB: 2 })
      setUploadedUrl(result.url)
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Gagal upload gambar')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadedUrl) {
      alert('Upload gambar terlebih dahulu')
      return
    }

    setSaving(true)
    const maxSeq = Math.max(...banners.map((b) => b.sequence), 0)
    const { error } = await supabase.from('banners').insert({
      image_url: uploadedUrl,
      sequence: maxSeq + 1,
      is_active: true
    })
    if (error) { setSaving(false); alert('Gagal simpan banner: ' + error.message); return }

    setSaving(false)
    setShowForm(false)
    setUploadedUrl('')
    loadBanners()
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin hapus banner ini?')) return
    setDeleting(id)
    const { error } = await supabase.from('banners').delete().eq('id', id)

    if (error) { setDeleting(null); alert('Gagal hapus: ' + error.message); return }
    loadBanners()
  }

  async function toggleActive(banner: Banner) {
    const { error } = await supabase.from('banners').update({ is_active: !banner.is_active }).eq('id', banner.id)
    if (error) { alert('Gagal toggle banner: ' + error.message); return }
    loadBanners()
  }

  return (
    <div>
      <PageHeader
        title="Banner & Hero"
        subtitle="Kelola banner dan hero image di landing page"
        action={
          <button
            onClick={() => {
              setUploadedUrl('')
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
            <Plus size={16} /> Tambah Banner
          </button>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#cc7030' }} />
        </div>
      ) : banners.length === 0 ? (
        <div className="section-card">
          <ImageIcon size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
          <p>Belum ada banner</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {banners.map((banner) => (
            <div
              key={banner.id}
              style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}
            >
              <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--neutral-100)' }}>
                <img
                  src={banner.image_url}
                  alt="Banner"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {!banner.is_active && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}
                  >
                    Nonaktif
                  </div>
                )}
              </div>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
                  Sequence: <strong>{banner.sequence}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => toggleActive(banner)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      background: 'var(--surface)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: banner.is_active ? '#16a34a' : 'var(--neutral-400)'
                    }}
                  >
                    {banner.is_active ? 'Aktif' : 'Nonaktifkan'}
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    disabled={deleting === banner.id}
                    style={{
                      background: 'none',
                      border: '1px solid #fca5a5',
                      borderRadius: '0.375rem',
                      padding: '0.375rem',
                      cursor: 'pointer',
                      color: '#ef4444'
                    }}
                  >
                    {deleting === banner.id ? (
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} maxWidth={480} padding="2rem" zIndex={200}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Tambah Banner</h2>
          <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
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
                marginBottom: '0.5rem'
              }}
            >
              Gambar Banner
            </label>
            {uploadedUrl ? (
              <div style={{ position: 'relative' }}>
                <img
                  src={uploadedUrl}
                  alt="Preview"
                  style={{ width: '100%', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}
                />
                <button
                  type="button"
                  onClick={() => setUploadedUrl('')}
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 24,
                    height: 24,
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: 150,
                  background: 'var(--neutral-100)',
                  border: '2px dashed #d1d5db',
                  borderRadius: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                {uploading ? (
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--neutral-400)' }} />
                ) : (
                  <>
                    <ImageIcon size={24} style={{ color: 'var(--neutral-400)', marginBottom: '0.5rem' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--neutral-400)' }}>Klik untuk upload</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </label>
            )}
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
              disabled={saving || !uploadedUrl}
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
