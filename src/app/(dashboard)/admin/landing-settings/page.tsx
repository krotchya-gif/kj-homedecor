'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Save, Plus, Trash2, Eye, MessageCircle, Loader2, Star, Shield, Truck, Clock, CheckCircle, Phone, MapPin, ShoppingBag } from 'lucide-react'

interface TrustBadge {
  icon: string
  label: string
}

interface LandingSettings {
  id: string
  hero_title: string
  hero_subtitle: string
  hero_cta_text: string
  hero_cta_link: string
  whatsapp_number: string
  whatsapp_message: string
  trust_badges: TrustBadge[]
  instagram?: string
  facebook?: string
  tiktok?: string
  shopee?: string
  tokopedia?: string
  address?: string
  phone?: string
}

const ICON_OPTIONS = [
  { value: 'Star', label: 'Star', icon: <Star size={14} /> },
  { value: 'Shield', label: 'Shield', icon: <Shield size={14} /> },
  { value: 'Truck', label: 'Truck', icon: <Truck size={14} /> },
  { value: 'Clock', label: 'Clock', icon: <Clock size={14} /> },
  { value: 'CheckCircle', label: 'Check', icon: <CheckCircle size={14} /> },
]

export default function AdminLandingSettingsPage() {
  const [settings, setSettings] = useState<LandingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    hero_title: '',
    hero_subtitle: '',
    hero_cta_text: '',
    hero_cta_link: '',
    whatsapp_number: '',
    whatsapp_message: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    shopee: '',
    tokopedia: '',
    address: '',
    phone: '',
  })
  const [trustBadges, setTrustBadges] = useState<TrustBadge[]>([])

  const supabase = createClient()

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    setLoading(true)
    const { data } = await supabase
      .from('landing_settings')
      .select('*')
      .eq('id', 'hero')
      .single()

    if (data) {
      setSettings(data as LandingSettings)
      setForm({
        hero_title: data.hero_title ?? '',
        hero_subtitle: data.hero_subtitle ?? '',
        hero_cta_text: data.hero_cta_text ?? '',
        hero_cta_link: data.hero_cta_link ?? '',
        whatsapp_number: data.whatsapp_number ?? '',
        whatsapp_message: data.whatsapp_message ?? '',
        instagram: (data as any).instagram ?? '',
        facebook: (data as any).facebook ?? '',
        tiktok: (data as any).tiktok ?? '',
        shopee: (data as any).shopee ?? '',
        tokopedia: (data as any).tokopedia ?? '',
        address: (data as any).address ?? '',
        phone: (data as any).phone ?? '',
      })
      setTrustBadges(data.trust_badges ?? [])
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('landing_settings')
      .update({
        hero_title: form.hero_title,
        hero_subtitle: form.hero_subtitle,
        hero_cta_text: form.hero_cta_text,
        hero_cta_link: form.hero_cta_link,
        whatsapp_number: form.whatsapp_number,
        whatsapp_message: form.whatsapp_message,
        trust_badges: trustBadges,
        instagram: form.instagram,
        facebook: form.facebook,
        tiktok: form.tiktok,
        shopee: form.shopee,
        tokopedia: form.tokopedia,
        address: form.address,
        phone: form.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'hero')

    setSaving(false)
    if (!error) {
      alert('Settings saved successfully!')
    } else {
      alert('Failed to save: ' + error.message)
    }
  }

  function addTrustBadge() {
    setTrustBadges(prev => [...prev, { icon: 'Star', label: 'Badge Baru' }])
  }

  function removeTrustBadge(idx: number) {
    setTrustBadges(prev => prev.filter((_, i) => i !== idx))
  }

  function updateTrustBadge(idx: number, field: 'icon' | 'label', value: string) {
    setTrustBadges(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b))
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
          <h1 className="page-title">Landing Page Settings</h1>
          <p className="page-subtitle">Edit hero section, WhatsApp, trust badges, social media, dan kontak</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT — Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Hero Content */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>Hero Section</h2>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Hero Title</label>
                <textarea
                  value={form.hero_title}
                  onChange={e => setForm(f => ({ ...f, hero_title: e.target.value }))}
                  rows={3}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', resize: 'vertical' }}
                  placeholder="Percantik Ruanganmu&#10;dengan Gorden Premium"
                />
                <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.25rem' }}>Gunakan newline untuk breakline</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Hero Subtitle</label>
                <textarea
                  value={form.hero_subtitle}
                  onChange={e => setForm(f => ({ ...f, hero_subtitle: e.target.value }))}
                  rows={3}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', resize: 'vertical' }}
                  placeholder="Spesialis gorden..."
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>CTA Button Text</label>
                  <input
                    type="text"
                    value={form.hero_cta_text}
                    onChange={e => setForm(f => ({ ...f, hero_cta_text: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                    placeholder="Lihat Katalog"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>CTA Link</label>
                  <input
                    type="text"
                    value={form.hero_cta_link}
                    onChange={e => setForm(f => ({ ...f, hero_cta_link: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                    placeholder="#products"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>
                <MessageCircle size={14} style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                WhatsApp
              </h2>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Nomor WhatsApp</label>
                <input
                  type="text"
                  value={form.whatsapp_number}
                  onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                  placeholder="6281234567890"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Auto Message</label>
                <input
                  type="text"
                  value={form.whatsapp_message}
                  onChange={e => setForm(f => ({ ...f, whatsapp_message: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                  placeholder="Halo KJ Homedecor, saya ingin konsultasi"
                />
                <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.25rem' }}>Pesan pre-fill saat klik WhatsApp CTA</p>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>Trust Badges</h2>
              <button
                onClick={addTrustBadge}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.75rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
              >
                <Plus size={12} /> Add
              </button>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {trustBadges.map((badge, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    value={badge.icon}
                    onChange={e => updateTrustBadge(idx, 'icon', e.target.value)}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.8rem', outline: 'none', background: '#fff' }}
                  >
                    {ICON_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={badge.label}
                    onChange={e => updateTrustBadge(idx, 'label', e.target.value)}
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.8rem', outline: 'none' }}
                    placeholder="cth: 500+ Pelanggan Puas"
                  />
                  <button
                    onClick={() => removeTrustBadge(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.375rem' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {trustBadges.length === 0 && (
                <p style={{ color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                  Belum ada trust badge. Klik "Add" untuk tambah.
                </p>
              )}
            </div>
          </div>

          {/* Social Media */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>
                Social Media & Marketplace
              </h2>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  Instagram
                </label>
                <input
                  type="text"
                  value={form.instagram}
                  onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                  placeholder="cth: kjhomedecor"
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook
                </label>
                <input
                  type="text"
                  value={form.facebook}
                  onChange={e => setForm(f => ({ ...f, facebook: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                  placeholder="cth: KJ Homedecor"
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                  TikTok
                </label>
                <input
                  type="text"
                  value={form.tiktok}
                  onChange={e => setForm(f => ({ ...f, tiktok: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                  placeholder="cth: @kjhomedecor"
                />
              </div>
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', marginTop: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  <ShoppingBag size={13} />
                  Marketplace
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.2rem' }}>Shopee</label>
                    <input
                      type="text"
                      value={form.shopee}
                      onChange={e => setForm(f => ({ ...f, shopee: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.8rem', outline: 'none' }}
                      placeholder="Link Shopee"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.2rem' }}>Tokopedia</label>
                    <input
                      type="text"
                      value={form.tokopedia}
                      onChange={e => setForm(f => ({ ...f, tokopedia: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.8rem', outline: 'none' }}
                      placeholder="Link Tokopedia"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>
                <MapPin size={14} style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                Contact & Address
              </h2>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
                  <MapPin size={13} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }} />
                  Alamat
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                  placeholder="cth: Jakarta, Indonesia"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
                  <Phone size={13} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }} />
                  Telepon
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                  placeholder="cth: +62 812-3456-7890"
                />
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT — Live Preview */}
        <div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden', position: 'sticky', top: '1rem' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>
                <Eye size={14} style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                Live Preview — Hero Section
              </h2>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #1a0a00 0%, #3d1a08 40%, #6b2d0f 100%)', padding: '2rem', minHeight: 300 }}>
              <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffd6a5', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.3rem 0.75rem', borderRadius: '999px', marginBottom: '1rem' }}>
                ✨ Home Decor Premium Indonesia
              </div>

              <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: '700', lineHeight: 1.3, marginBottom: '0.75rem', fontFamily: 'Playfair Display, serif' }}>
                {form.hero_title || 'Hero Title'}
              </h2>

              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {form.hero_subtitle || 'Subtitle text...'}
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ padding: '0.625rem 1.25rem', background: '#cc7030', color: '#fff', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: '600' }}>
                  {form.hero_cta_text || 'CTA Text'} →
                </div>
                <div style={{ padding: '0.625rem 1.25rem', border: '2px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <MessageCircle size={14} /> Konsultasi Gratis
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                {trustBadges.map((badge, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem' }}>
                    <span style={{ color: '#f4a857' }}>
                      {badge.icon === 'Star' && <Star size={14} />}
                      {badge.icon === 'Shield' && <Shield size={14} />}
                      {badge.icon === 'Truck' && <Truck size={14} />}
                      {badge.icon === 'Clock' && <Clock size={14} />}
                      {badge.icon === 'CheckCircle' && <CheckCircle size={14} />}
                    </span>
                    {badge.label}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.06)', borderRadius: '0.5rem' }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>WhatsApp:</div>
                <div style={{ color: '#fff', fontSize: '0.875rem', fontWeight: '600' }}>
                  {form.whatsapp_number ? `wa.me/${form.whatsapp_number}` : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
