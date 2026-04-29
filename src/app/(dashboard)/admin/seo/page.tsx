'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Save, Eye, FileText, Upload, Loader2, Tag, Search, Image, BarChart3, Globe } from 'lucide-react'

interface SeoSettings {
  id: string
  seo_pixel_id: string | null
  seo_ga4_id: string | null
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string | null
  seo_og_image: string | null
}

export default function AdminSeoPage() {
  const [settings, setSettings] = useState<SeoSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingSitemap, setUploadingSitemap] = useState(false)
  const [uploadingRobots, setUploadingRobots] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({
    seo_pixel_id: '',
    seo_ga4_id: '',
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    seo_og_image: '',
  })

  const sitemapRef = useRef<HTMLInputElement>(null)
  const robotsRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    setLoading(true)
    const { data } = await supabase
      .from('landing_settings')
      .select('id, seo_pixel_id, seo_ga4_id, seo_title, seo_description, seo_keywords, seo_og_image')
      .eq('id', 'hero')
      .single()

    if (data) {
      setSettings(data as SeoSettings)
      setForm({
        seo_pixel_id: (data as any).seo_pixel_id ?? '',
        seo_ga4_id: (data as any).seo_ga4_id ?? '',
        seo_title: (data as any).seo_title ?? '',
        seo_description: (data as any).seo_description ?? '',
        seo_keywords: (data as any).seo_keywords ?? '',
        seo_og_image: (data as any).seo_og_image ?? '',
      })
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('landing_settings')
      .update({
        seo_pixel_id: form.seo_pixel_id || null,
        seo_ga4_id: form.seo_ga4_id || null,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
        seo_keywords: form.seo_keywords || null,
        seo_og_image: form.seo_og_image || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'hero')

    setSaving(false)
    if (!error) {
      setUploadMsg({ type: 'success', text: 'SEO settings saved successfully!' })
    } else {
      setUploadMsg({ type: 'error', text: 'Failed to save: ' + error.message })
    }
    setTimeout(() => setUploadMsg(null), 3000)
  }

  async function handleSitemapUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingSitemap(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/seo/upload-sitemap', { method: 'POST', body: fd })
    const data = await res.json()
    setUploadingSitemap(false)
    if (data.success) {
      setUploadMsg({ type: 'success', text: 'sitemap.xml uploaded successfully!' })
    } else {
      setUploadMsg({ type: 'error', text: data.error ?? 'Upload failed' })
    }
    setTimeout(() => setUploadMsg(null), 3000)
    if (sitemapRef.current) sitemapRef.current.value = ''
  }

  async function handleRobotsUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingRobots(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/seo/upload-robots', { method: 'POST', body: fd })
    const data = await res.json()
    setUploadingRobots(false)
    if (data.success) {
      setUploadMsg({ type: 'success', text: 'robots.txt uploaded successfully!' })
    } else {
      setUploadMsg({ type: 'error', text: data.error ?? 'Upload failed' })
    }
    setTimeout(() => setUploadMsg(null), 3000)
    if (robotsRef.current) robotsRef.current.value = ''
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#cc7030' }} />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">SEO Settings</h1>
          <p className="page-subtitle">Meta Pixel, GA4, meta tags, sitemap, dan robots.txt</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => window.open('/', '_blank')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}
          >
            <Eye size={16} /> Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.875rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {uploadMsg && (
        <div style={{
          padding: '0.875rem 1.25rem',
          borderRadius: '0.5rem',
          marginBottom: '1.25rem',
          background: uploadMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: uploadMsg.type === 'success' ? '#166534' : '#991b1b',
          fontSize: '0.875rem',
          fontWeight: '600',
          border: `1px solid ${uploadMsg.type === 'success' ? '#86efac' : '#fca5a5'}`,
        }}>
          {uploadMsg.text}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Analytics */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={16} style={{ color: '#cc7030' }} /> Analytics & Tracking
            </h2>
          </div>
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
                  Meta Pixel ID
                </label>
                <input
                  type="text"
                  placeholder="cth: 1234567890123456"
                  value={form.seo_pixel_id}
                  onChange={e => setForm(f => ({ ...f, seo_pixel_id: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                />
                <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.25rem' }}>Facebook Pixel ID untuk tracking konversi</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
                  <Globe size={13} style={{ display: 'inline', marginRight: '0.3rem' }} />
                  Google Analytics 4 ID
                </label>
                <input
                  type="text"
                  placeholder="cth: G-XXXXXXXXXX"
                  value={form.seo_ga4_id}
                  onChange={e => setForm(f => ({ ...f, seo_ga4_id: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                />
                <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.25rem' }}>GA4 Measurement ID untuk analytics</p>
              </div>
            </div>
          </div>
        </div>

        {/* Meta Tags */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Tag size={16} style={{ color: '#cc7030' }} /> Meta Tags
            </h2>
          </div>
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
                SEO Title
              </label>
              <input
                type="text"
                placeholder="Judul untuk SEO (maks 60 karakter)"
                maxLength={60}
                value={form.seo_title}
                onChange={e => setForm(f => ({ ...f, seo_title: e.target.value }))}
                style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
              />
              <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.25rem' }}>{form.seo_title.length}/60 karakter</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
                SEO Description
              </label>
              <textarea
                placeholder="Deskripsi untuk SEO (maks 160 karakter)"
                maxLength={160}
                rows={3}
                value={form.seo_description}
                onChange={e => setForm(f => ({ ...f, seo_description: e.target.value }))}
                style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', resize: 'vertical' }}
              />
              <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.25rem' }}>{form.seo_description.length}/160 karakter</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
                Keywords
              </label>
              <input
                type="text"
                placeholder="gorden, curtain, roman blind, vitras, jakarta"
                value={form.seo_keywords}
                onChange={e => setForm(f => ({ ...f, seo_keywords: e.target.value }))}
                style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
              />
              <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.25rem' }}>Pisahkan dengan koma</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
                <Image size={13} style={{ display: 'inline', marginRight: '0.3rem' }} />
                OG Image URL
              </label>
              <input
                type="text"
                placeholder="https://example.com/og-image.jpg"
                value={form.seo_og_image}
                onChange={e => setForm(f => ({ ...f, seo_og_image: e.target.value }))}
                style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
              />
              <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.25rem' }}>Gambar untuk Open Graph (Facebook/WhatsApp share). Disarankan 1200x630px</p>
            </div>
          </div>
        </div>

        {/* File Uploads */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} style={{ color: '#cc7030' }} /> File SEO
            </h2>
          </div>
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                sitemap.xml
              </label>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input
                  ref={sitemapRef}
                  type="file"
                  accept=".xml"
                  onChange={handleSitemapUpload}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => sitemapRef.current?.click()}
                  disabled={uploadingSitemap}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1rem', background: uploadingSitemap ? '#f3f4f6' : '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.875rem', cursor: uploadingSitemap ? 'not-allowed' : 'pointer' }}
                >
                  {uploadingSitemap ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={15} />}
                  {uploadingSitemap ? 'Uploading...' : 'Upload File'}
                </button>
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1rem', background: '#fff', color: '#cc7030', border: '1px solid #cc7030', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.875rem', textDecoration: 'none' }}
                >
                  <Search size={15} /> Lihat Current
                </a>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.4rem' }}>Upload file sitemap.xml yang sudah di-generate (misal dari sitemapgenerator.org)</p>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                robots.txt
              </label>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input
                  ref={robotsRef}
                  type="file"
                  accept=".txt"
                  onChange={handleRobotsUpload}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => robotsRef.current?.click()}
                  disabled={uploadingRobots}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1rem', background: uploadingRobots ? '#f3f4f6' : '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.875rem', cursor: uploadingRobots ? 'not-allowed' : 'pointer' }}
                >
                  {uploadingRobots ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={15} />}
                  {uploadingRobots ? 'Uploading...' : 'Upload File'}
                </button>
                <a
                  href="/robots.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1rem', background: '#fff', color: '#cc7030', border: '1px solid #cc7030', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.875rem', textDecoration: 'none' }}
                >
                  <Search size={15} /> Lihat Current
                </a>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.4rem' }}>Upload file robots.txt untuk mengatur crawler access</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}