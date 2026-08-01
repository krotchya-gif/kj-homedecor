'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Save,
  Plus,
  Trash2,
  Eye,
  MessageCircle,
  Loader2,
  Star,
  Shield,
  Truck,
  Clock,
  CheckCircle,
  Phone,
  MapPin,
  ShoppingBag,
  Upload,
  ImageIcon,
  LayoutGrid,
  Award,
  Megaphone,
  RotateCcw
} from 'lucide-react'
import { uploadToLocal } from '@/lib/upload'
import ColorPicker from '@/components/ui/ColorPicker'
import ThemePresetCard, { THEME_PRESETS, type ThemePreset } from '@/components/ui/ThemePresetCard'

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
  hero_image_url: string
  hero_video_url?: string
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
  // Categories section
  categories_label?: string
  categories_title?: string
  categories_subtitle?: string
  // Why Us section
  whyus_label?: string
  whyus_title?: string
  whyus_subtitle?: string
  whyus_card1_title?: string
  whyus_card1_desc?: string
  whyus_card2_title?: string
  whyus_card2_desc?: string
  whyus_card3_title?: string
  whyus_card3_desc?: string
  whyus_card4_title?: string
  whyus_card4_desc?: string
  // Portfolio section
  portfolio_label?: string
  portfolio_title?: string
  portfolio_subtitle?: string
  // CTA Banner
  cta_badge?: string
  cta_title?: string
  cta_subtitle?: string
  // Theme customization
  theme_primary_color?: string
  theme_secondary_color?: string
  theme_accent_color?: string
  theme_background_color?: string
  theme_text_color?: string
  theme_preset?: string
  hero_background_image?: string
  hero_background_overlay_opacity?: number
  theme_border_radius?: string
  theme_font_heading?: string
  theme_font_body?: string
}

const ICON_OPTIONS = [
  { value: 'Star', label: 'Star', icon: <Star size={14} /> },
  { value: 'Shield', label: 'Shield', icon: <Shield size={14} /> },
  { value: 'Truck', label: 'Truck', icon: <Truck size={14} /> },
  { value: 'Clock', label: 'Clock', icon: <Clock size={14} /> },
  { value: 'CheckCircle', label: 'Check', icon: <CheckCircle size={14} /> }
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
    hero_image_url: '',
    hero_video_url: '',
    whatsapp_number: '',
    whatsapp_message: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    shopee: '',
    tokopedia: '',
    address: '',
    phone: '',
    // Categories
    categories_label: '',
    categories_title: '',
    categories_subtitle: '',
    // Why Us
    whyus_label: '',
    whyus_title: '',
    whyus_subtitle: '',
    whyus_card1_title: '',
    whyus_card1_desc: '',
    whyus_card2_title: '',
    whyus_card2_desc: '',
    whyus_card3_title: '',
    whyus_card3_desc: '',
    whyus_card4_title: '',
    whyus_card4_desc: '',
    // Portfolio
    portfolio_label: '',
    portfolio_title: '',
    portfolio_subtitle: '',
    // CTA
    cta_badge: '',
    cta_title: '',
    cta_subtitle: '',
    // Theme customization
    theme_primary_color: '#DDC0B4',
    theme_secondary_color: '#C9A98C',
    theme_accent_color: '#f4a857',
    theme_background_color: '#FAF5EE',
    theme_text_color: '#2B2321',
    theme_preset: 'default',
    hero_background_image: '',
    hero_background_overlay_opacity: 0.75,
    theme_border_radius: '0.5rem',
    theme_font_heading: 'Playfair Display',
    theme_font_body: 'Inter'
  })
  const [trustBadges, setTrustBadges] = useState<TrustBadge[]>([])
  const [heroImageUploading, setHeroImageUploading] = useState(false)
  const [heroVideoUploading, setHeroVideoUploading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    const { data } = await supabase.from('landing_settings').select('*').eq('key', 'hero').single()

    if (data) {
      setSettings(data as LandingSettings)
      setForm({
        hero_title: data.hero_title ?? '',
        hero_subtitle: data.hero_subtitle ?? '',
        hero_cta_text: data.hero_cta_text ?? '',
        hero_cta_link: data.hero_cta_link ?? '',
        hero_image_url: (data as any).hero_image_url ?? '',
        hero_video_url: (data as any).hero_video_url ?? '',
        whatsapp_number: data.whatsapp_number ?? '',
        whatsapp_message: data.whatsapp_message ?? '',
        instagram: (data as any).instagram ?? '',
        facebook: (data as any).facebook ?? '',
        tiktok: (data as any).tiktok ?? '',
        shopee: (data as any).shopee ?? '',
        tokopedia: (data as any).tokopedia ?? '',
        address: (data as any).address ?? '',
        phone: (data as any).phone ?? '',
        categories_label: (data as any).categories_label ?? '',
        categories_title: (data as any).categories_title ?? '',
        categories_subtitle: (data as any).categories_subtitle ?? '',
        whyus_label: (data as any).whyus_label ?? '',
        whyus_title: (data as any).whyus_title ?? '',
        whyus_subtitle: (data as any).whyus_subtitle ?? '',
        whyus_card1_title: (data as any).whyus_card1_title ?? '',
        whyus_card1_desc: (data as any).whyus_card1_desc ?? '',
        whyus_card2_title: (data as any).whyus_card2_title ?? '',
        whyus_card2_desc: (data as any).whyus_card2_desc ?? '',
        whyus_card3_title: (data as any).whyus_card3_title ?? '',
        whyus_card3_desc: (data as any).whyus_card3_desc ?? '',
        whyus_card4_title: (data as any).whyus_card4_title ?? '',
        whyus_card4_desc: (data as any).whyus_card4_desc ?? '',
        portfolio_label: (data as any).portfolio_label ?? '',
        portfolio_title: (data as any).portfolio_title ?? '',
        portfolio_subtitle: (data as any).portfolio_subtitle ?? '',
        cta_badge: (data as any).cta_badge ?? '',
        cta_title: (data as any).cta_title ?? '',
        cta_subtitle: (data as any).cta_subtitle ?? '',
        // Theme customization
        theme_primary_color: (data as any).theme_primary_color ?? '#DDC0B4',
        theme_secondary_color: (data as any).theme_secondary_color ?? '#C9A98C',
        theme_accent_color: (data as any).theme_accent_color ?? '#f4a857',
        theme_background_color: (data as any).theme_background_color ?? '#FAF5EE',
        theme_text_color: (data as any).theme_text_color ?? '#2B2321',
        theme_preset: (data as any).theme_preset ?? 'default',
        hero_background_image: (data as any).hero_background_image ?? '',
        hero_background_overlay_opacity: (data as any).hero_background_overlay_opacity ?? 0.75,
        theme_border_radius: (data as any).theme_border_radius ?? '0.5rem',
        theme_font_heading: (data as any).theme_font_heading ?? 'Playfair Display',
        theme_font_body: (data as any).theme_font_body ?? 'Inter'
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
        hero_image_url: form.hero_image_url,
        hero_video_url: form.hero_video_url,
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
        categories_label: form.categories_label,
        categories_title: form.categories_title,
        categories_subtitle: form.categories_subtitle,
        whyus_label: form.whyus_label,
        whyus_title: form.whyus_title,
        whyus_subtitle: form.whyus_subtitle,
        whyus_card1_title: form.whyus_card1_title,
        whyus_card1_desc: form.whyus_card1_desc,
        whyus_card2_title: form.whyus_card2_title,
        whyus_card2_desc: form.whyus_card2_desc,
        whyus_card3_title: form.whyus_card3_title,
        whyus_card3_desc: form.whyus_card3_desc,
        whyus_card4_title: form.whyus_card4_title,
        whyus_card4_desc: form.whyus_card4_desc,
        portfolio_label: form.portfolio_label,
        portfolio_title: form.portfolio_title,
        portfolio_subtitle: form.portfolio_subtitle,
        cta_badge: form.cta_badge,
        cta_title: form.cta_title,
        cta_subtitle: form.cta_subtitle,
        // Theme customization
        theme_primary_color: form.theme_primary_color,
        theme_secondary_color: form.theme_secondary_color,
        theme_accent_color: form.theme_accent_color,
        theme_background_color: form.theme_background_color,
        theme_text_color: form.theme_text_color,
        theme_preset: form.theme_preset,
        hero_background_image: form.hero_background_image,
        hero_background_overlay_opacity: form.hero_background_overlay_opacity,
        theme_border_radius: form.theme_border_radius,
        theme_font_heading: form.theme_font_heading,
        theme_font_body: form.theme_font_body,
        updated_at: new Date().toISOString()
      })
      .eq('key', 'hero')

    setSaving(false)
    if (!error) {
      alert('Settings saved successfully!')
    } else {
      alert('Failed to save: ' + error.message)
    }
  }

  function addTrustBadge() {
    setTrustBadges((prev) => [...prev, { icon: 'Star', label: 'Badge Baru' }])
  }

  async function handleHeroImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setHeroImageUploading(true)
    try {
      const result = await uploadToLocal(file, 'banners', { compress: true, maxSizeMB: 2 })
      setForm((f) => ({ ...f, hero_image_url: result.url }))
    } catch (err) {
      alert('Gagal upload gambar hero')
    } finally {
      setHeroImageUploading(false)
    }
  }

  async function handleHeroVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setHeroVideoUploading(true)
    try {
      const result = await uploadToLocal(file, 'videos', { compress: false })
      setForm((f) => ({ ...f, hero_video_url: result.url }))
    } catch (err) {
      alert('Gagal upload video hero')
    } finally {
      setHeroVideoUploading(false)
    }
  }

  function removeTrustBadge(idx: number) {
    setTrustBadges((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateTrustBadge(idx: number, field: 'icon' | 'label', value: string) {
    setTrustBadges((prev) => prev.map((b, i) => (i === idx ? { ...b, [field]: value } : b)))
  }

  function handlePresetSelect(preset: ThemePreset) {
    setForm((f) => ({
      ...f,
      theme_primary_color: preset.colors.primary,
      theme_secondary_color: preset.colors.secondary,
      theme_accent_color: preset.colors.accent,
      theme_background_color: preset.colors.background,
      theme_text_color: preset.colors.text,
      theme_preset: preset.id
    }))
  }

  function handleResetTheme() {
    if (!confirm('Reset theme to default KJ Homedecor colors? This will overwrite your current theme settings.')) {
      return
    }
    const defaultPreset = THEME_PRESETS[0] // Default Brown
    setForm((f) => ({
      ...f,
      theme_primary_color: defaultPreset.colors.primary,
      theme_secondary_color: defaultPreset.colors.secondary,
      theme_accent_color: defaultPreset.colors.accent,
      theme_background_color: defaultPreset.colors.background,
      theme_text_color: defaultPreset.colors.text,
      theme_preset: 'default',
      hero_background_image: '',
      hero_background_overlay_opacity: 0.75,
      theme_border_radius: '0.5rem',
      theme_font_heading: 'Playfair Display',
      theme_font_body: 'Inter'
    }))
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--brand-500)' }} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Landing Page Settings"
        subtitle="Edit hero section, WhatsApp, trust badges, social media, dan kontak"
        action={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => window.open('/', '_blank')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.625rem 1.25rem',
                background: 'var(--surface)',
                color: 'var(--neutral-700)',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <Eye size={16} /> Preview
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
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
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1
              }}
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT — Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Hero Content */}
          <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: 'var(--neutral-100)' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>Hero Section</h2>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  Hero Title
                </label>
                <textarea
                  value={form.hero_title}
                  onChange={(e) => setForm((f) => ({ ...f, hero_title: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                  placeholder="Percantik Ruanganmu&#10;dengan Gorden Premium"
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.25rem' }}>
                  Gunakan newline untuk breakline
                </p>
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
                  Hero Subtitle
                </label>
                <textarea
                  value={form.hero_subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, hero_subtitle: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                  placeholder="Spesialis gorden..."
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                    CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={form.hero_cta_text}
                    onChange={(e) => setForm((f) => ({ ...f, hero_cta_text: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                    placeholder="Lihat Katalog"
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
                    CTA Link
                  </label>
                  <input
                    type="text"
                    value={form.hero_cta_link}
                    onChange={(e) => setForm((f) => ({ ...f, hero_cta_link: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                    placeholder="#products"
                  />
                </div>
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
                  Hero Image
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={form.hero_image_url}
                      onChange={(e) => setForm((f) => ({ ...f, hero_image_url: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                      placeholder="/uploads/banners/xxx.jpg"
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.25rem' }}>
                      URL gambar atau upload file baru
                    </p>
                  </div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.625rem 1rem',
                      background: heroImageUploading ? 'var(--neutral-200)' : 'var(--neutral-100)',
                      color: 'var(--neutral-700)',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: heroImageUploading ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleHeroImageUpload}
                      disabled={heroImageUploading}
                      style={{ display: 'none' }}
                    />
                    {heroImageUploading ? (
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Upload size={14} />
                    )}
                    {heroImageUploading ? 'Upload...' : 'Upload'}
                  </label>
                </div>
                {form.hero_image_url && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      borderRadius: '0.5rem',
                      overflow: 'hidden',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <img
                      src={form.hero_image_url}
                      alt="Hero preview"
                      style={{ width: '100%', height: 120, objectFit: 'cover' }}
                    />
                  </div>
                )}
              </div>
              {/* Hero Video URL */}
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
                  Hero Video
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={form.hero_video_url}
                      onChange={(e) => setForm((f) => ({ ...f, hero_video_url: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                      placeholder="/uploads/videos/xxx.mp4"
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.25rem' }}>
                      Video akan di-scrub saat scroll. Maks 100MB. Kosongkan untuk fallback /uploads/kj.mp4
                    </p>
                  </div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.625rem 1rem',
                      background: heroVideoUploading ? 'var(--neutral-200)' : 'var(--neutral-100)',
                      color: 'var(--neutral-700)',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: heroVideoUploading ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <input
                      type="file"
                      accept="video/mp4,video/webm"
                      onChange={handleHeroVideoUpload}
                      disabled={heroVideoUploading}
                      style={{ display: 'none' }}
                    />
                    {heroVideoUploading ? (
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Upload size={14} />
                    )}
                    {heroVideoUploading ? 'Upload...' : 'Upload'}
                  </label>
                </div>
                {form.hero_video_url && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      borderRadius: '0.5rem',
                      overflow: 'hidden',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <video
                      src={form.hero_video_url}
                      controls
                      style={{ width: '100%', height: 100, objectFit: 'cover' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* WhatsApp */}
          <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: 'var(--neutral-100)' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>
                <MessageCircle size={14} style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                WhatsApp
              </h2>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  value={form.whatsapp_number}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp_number: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="6281234567890"
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
                  Auto Message
                </label>
                <input
                  type="text"
                  value={form.whatsapp_message}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp_message: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="Halo KJ Homedecor, saya ingin konsultasi"
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.25rem' }}>
                  Pesan pre-fill saat klik WhatsApp CTA
                </p>
              </div>
            </div>
          </div>
          {/* Theme Preset */}
          <ThemePresetCard selectedPreset={form.theme_preset} onSelectPreset={handlePresetSelect} />

          {/* Theme Colors */}
          <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #e5e7eb',
                background: 'var(--neutral-100)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>🎨 Theme Colors</h2>
              <button
                type="button"
                onClick={handleResetTheme}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  background: 'var(--neutral-100)',
                  color: 'var(--neutral-600)',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={12} /> Reset to Default
              </button>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <ColorPicker
                label="Primary Color"
                value={form.theme_primary_color}
                defaultValue="#DDC0B4"
                onChange={(color) => setForm((f) => ({ ...f, theme_primary_color: color }))}
                description="Main brand color for buttons and accents"
              />
              <ColorPicker
                label="Secondary Color"
                value={form.theme_secondary_color}
                defaultValue="#C9A98C"
                onChange={(color) => setForm((f) => ({ ...f, theme_secondary_color: color }))}
                description="Secondary brand color for gradients"
              />
              <ColorPicker
                label="Accent Color"
                value={form.theme_accent_color}
                defaultValue="#f4a857"
                onChange={(color) => setForm((f) => ({ ...f, theme_accent_color: color }))}
                description="Highlight color for badges and icons"
              />
              <ColorPicker
                label="Background Color"
                value={form.theme_background_color}
                defaultValue="#FAF5EE"
                onChange={(color) => setForm((f) => ({ ...f, theme_background_color: color }))}
                description="Page background color"
              />
              <ColorPicker
                label="Text Color"
                value={form.theme_text_color}
                defaultValue="#2B2321"
                onChange={(color) => setForm((f) => ({ ...f, theme_text_color: color }))}
                description="Primary text color for headings"
              />
            </div>
          </div>

          {/* Trust Badges */}
          <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #e5e7eb',
                background: 'var(--neutral-100)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>Trust Badges</h2>
              <button
                onClick={addTrustBadge}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.375rem 0.75rem',
                  background: '#cc7030',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <Plus size={12} /> Add
              </button>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {trustBadges.map((badge, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    value={badge.icon}
                    onChange={(e) => updateTrustBadge(idx, 'icon', e.target.value)}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.8rem',
                      outline: 'none',
                      background: 'var(--surface)'
                    }}
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={badge.label}
                    onChange={(e) => updateTrustBadge(idx, 'label', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                    placeholder="cth: 500+ Pelanggan Puas"
                  />
                  <button
                    onClick={() => removeTrustBadge(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#ef4444',
                      padding: '0.375rem'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {trustBadges.length === 0 && (
                <p style={{ color: 'var(--neutral-400)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                  Belum ada trust badge. Klik "Add" untuk tambah.
                </p>
              )}
            </div>
          </div>

          {/* Social Media */}
          <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: 'var(--neutral-100)' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>
                Social Media & Marketplace
              </h2>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: 'var(--neutral-700)',
                    marginBottom: '0.3rem'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  Instagram
                </label>
                <input
                  type="text"
                  value={form.instagram}
                  onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="cth: kjhomedecor"
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: 'var(--neutral-700)',
                    marginBottom: '0.3rem'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </label>
                <input
                  type="text"
                  value={form.facebook}
                  onChange={(e) => setForm((f) => ({ ...f, facebook: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="cth: KJ Homedecor"
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: 'var(--neutral-700)',
                    marginBottom: '0.3rem'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                  TikTok
                </label>
                <input
                  type="text"
                  value={form.tiktok}
                  onChange={(e) => setForm((f) => ({ ...f, tiktok: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="cth: @kjhomedecor"
                />
              </div>
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', marginTop: '0.25rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: 'var(--neutral-700)',
                    marginBottom: '0.5rem'
                  }}
                >
                  <ShoppingBag size={13} />
                  Marketplace
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--neutral-600)', marginBottom: '0.2rem' }}>
                      Shopee
                    </label>
                    <input
                      type="text"
                      value={form.shopee}
                      onChange={(e) => setForm((f) => ({ ...f, shopee: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                      placeholder="Link Shopee"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--neutral-600)', marginBottom: '0.2rem' }}>
                      Tokopedia
                    </label>
                    <input
                      type="text"
                      value={form.tokopedia}
                      onChange={(e) => setForm((f) => ({ ...f, tokopedia: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                      placeholder="Link Tokopedia"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Categories Section */}
          <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: 'var(--neutral-100)' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>
                <LayoutGrid size={14} style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                Categories Section
              </h2>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  Label
                </label>
                <input
                  type="text"
                  value={form.categories_label ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, categories_label: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="cth: Koleksi Kami"
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
                  Title
                </label>
                <input
                  type="text"
                  value={form.categories_title ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, categories_title: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="cth: Temukan Gaya Favoritmu"
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
                  Subtitle
                </label>
                <input
                  type="text"
                  value={form.categories_subtitle ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, categories_subtitle: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="cth: Pilihan gorden..."
                />
              </div>
            </div>
          </div>

          {/* Why Us Section */}
          <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: 'var(--neutral-100)' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>
                <Award size={14} style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                Why Us Section
              </h2>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  Label
                </label>
                <input
                  type="text"
                  value={form.whyus_label ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, whyus_label: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="cth: Keunggulan Kami"
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
                  Title
                </label>
                <input
                  type="text"
                  value={form.whyus_title ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, whyus_title: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="cth: Dipercaya oleh Ratusan Pelanggan"
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
                  Subtitle
                </label>
                <input
                  type="text"
                  value={form.whyus_subtitle ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, whyus_subtitle: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="cth: Dengan pengalaman..."
                />
              </div>
              {[
                { num: 1, title: form.whyus_card1_title ?? '', desc: form.whyus_card1_desc ?? '' },
                { num: 2, title: form.whyus_card2_title ?? '', desc: form.whyus_card2_desc ?? '' },
                { num: 3, title: form.whyus_card3_title ?? '', desc: form.whyus_card3_desc ?? '' },
                { num: 4, title: form.whyus_card4_title ?? '', desc: form.whyus_card4_desc ?? '' }
              ].map((card) => (
                <div key={card.num} style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--neutral-600)', marginBottom: '0.5rem' }}>
                    Card {card.num}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={card.title}
                      onChange={(e) => setForm((f) => ({ ...f, [`whyus_card${card.num}_title`]: e.target.value }))}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                      placeholder={`Card ${card.num} Title`}
                    />
                    <input
                      type="text"
                      value={card.desc}
                      onChange={(e) => setForm((f) => ({ ...f, [`whyus_card${card.num}_desc`]: e.target.value }))}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                      placeholder={`Card ${card.num} Description`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Portfolio Section */}
          <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: 'var(--neutral-100)' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>
                <ImageIcon size={14} style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                Portfolio Section
              </h2>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  Label
                </label>
                <input
                  type="text"
                  value={form.portfolio_label ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, portfolio_label: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="cth: Inspirasi"
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
                  Title
                </label>
                <input
                  type="text"
                  value={form.portfolio_title ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, portfolio_title: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="cth: Portofolio Kami"
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
                  Subtitle
                </label>
                <input
                  type="text"
                  value={form.portfolio_subtitle ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, portfolio_subtitle: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="cth: Hasil karya..."
                />
              </div>
            </div>
          </div>

          {/* CTA Banner Section */}
          <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: 'var(--neutral-100)' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>
                <Megaphone size={14} style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                CTA Banner Section
              </h2>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  Badge
                </label>
                <input
                  type="text"
                  value={form.cta_badge ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, cta_badge: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="cth: ✨ Konsultasi Gratis"
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
                  Title
                </label>
                <input
                  type="text"
                  value={form.cta_title ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, cta_title: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="cth: Siap Mempercantik Ruanganmu?"
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
                  Subtitle
                </label>
                <input
                  type="text"
                  value={form.cta_subtitle ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, cta_subtitle: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="cth: Hubungi kami..."
                />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: 'var(--neutral-100)' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>
                <MapPin size={14} style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                Contact & Address
              </h2>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  <MapPin size={13} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }} />
                  Alamat
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="cth: Jakarta, Indonesia"
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
                  <Phone size={13} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }} />
                  Telepon
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="cth: +62 812-3456-7890"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Live Preview */}
        <div>
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
              overflow: 'hidden',
              position: 'sticky',
              top: '1rem'
            }}
            className="settings-preview-panel"
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: 'var(--neutral-100)' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>
                <Eye size={14} style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                Live Preview — Hero Section
              </h2>
            </div>
            <div
              style={{
                background: `linear-gradient(135deg, ${form.theme_text_color}22 0%, ${form.theme_text_color}44 40%, ${form.theme_text_color}66 100%)`,
                padding: '2rem',
                minHeight: 300
              }}
            >
              <div
                style={{
                  display: 'inline-block',
                  background: `${form.theme_accent_color}22`,
                  border: `1px solid ${form.theme_accent_color}44`,
                  color: form.theme_accent_color,
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '999px',
                  marginBottom: '1rem'
                }}
              >
                ✨ Home Decor Premium Indonesia
              </div>

              <h2
                style={{
                  color: '#fff',
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  lineHeight: 1.3,
                  marginBottom: '0.75rem',
                  fontFamily: form.theme_font_heading
                }}
              >
                {form.hero_title || 'Hero Title'}
              </h2>

              <p
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  marginBottom: '1.25rem',
                  fontFamily: form.theme_font_body
                }}
              >
                {form.hero_subtitle || 'Subtitle text...'}
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: `linear-gradient(135deg, ${form.theme_primary_color}, ${form.theme_secondary_color})`,
                    color: '#fff',
                    borderRadius: form.theme_border_radius,
                    fontSize: '0.8rem',
                    fontWeight: '600'
                  }}
                >
                  {form.hero_cta_text || 'CTA Text'} →
                </div>
                <div
                  style={{
                    padding: '0.625rem 1.25rem',
                    border: '2px solid rgba(255,255,255,0.4)',
                    color: '#fff',
                    borderRadius: form.theme_border_radius,
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem'
                  }}
                >
                  <MessageCircle size={14} /> Konsultasi Gratis
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                {trustBadges.map((badge, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      color: 'rgba(255,255,255,0.75)',
                      fontSize: '0.78rem'
                    }}
                  >
                    <span style={{ color: form.theme_accent_color }}>
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

              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: '0.5rem'
                }}
              >
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                  WhatsApp:
                </div>
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
