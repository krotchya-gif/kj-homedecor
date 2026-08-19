import { createClient } from '@/utils/supabase/server'
import { Phone, MessageCircle, MapPin, Sparkles, Shield, Truck, Star, Calendar, ShoppingBag } from 'lucide-react'
import type { Category, PortfolioPost } from '@/types'
import ProductCatalog from '@/components/landing/ProductCatalog'
import ScrollNav from '@/components/landing/ScrollNav'
import ScrollHero from '@/components/ScrollHero'
import TrustStrip, { type TrustStat } from '@/components/landing/TrustStrip'
import CategoryBento from '@/components/landing/CategoryBento'
import WhyUsEditorial, { type WhyUsItem } from '@/components/landing/WhyUsEditorial'
import PortfolioGallery from '@/components/landing/PortfolioGallery'
import SectionHeader from '@/components/landing/SectionHeader'
import BrandFontLoader from '@/components/brand/BrandFontLoader'

export default async function LandingPage() {
  const supabase = await createClient()

  const [categoriesRes, portfolioRes, settingsRes] = await Promise.all([
    supabase.from('categories').select('*').is('parent_id', null).limit(6),
    supabase.from('portfolio_posts').select('*').order('created_at', { ascending: false }).limit(3),
    supabase.from('landing_settings').select('*').eq('key', 'hero').single()
  ])

  const categories = (categoriesRes.data ?? []) as Category[]
  const portfolio = (portfolioRes.data ?? []) as PortfolioPost[]
  // landing_settings: row `{ key:'hero', value:{...}, hero_title, theme_primary_color, ... }`.
  // BUG-078 fix: kolom terpisah (ditulis /admin/landing-settings) adalah sumber UTAMA,
  // `value` JSON (legacy) jadi fallback. Merge: kolom terisi menang; NULL/'' → fallback value JSON.
  const valueObj = (settingsRes.data?.value ?? {}) as Record<string, unknown>
  const rowObj = (settingsRes.data ?? {}) as Record<string, unknown>
  const heroSettings: Record<string, unknown> = { ...valueObj }
  for (const [k, v] of Object.entries(rowObj)) {
    const isMeta = ['id', 'key', 'value', 'updated_at'].includes(k)
    if (!isMeta && v !== null && v !== undefined && v !== '') heroSettings[k] = v
  }
  const settingsMap: Record<string, string | number | null> = Object.fromEntries(
    Object.entries(heroSettings).map(([k, v]) => [k, typeof v === 'number' ? v : String(v ?? '')])
  )

  const heroTitle = String(settingsMap.hero_title ?? 'Percantik Ruanganmu dengan Gorden Premium')
  const heroSubtitle =
    settingsMap.hero_subtitle ??
    'Spesialis gorden, curtain, dan roman blind custom berkualitas tinggi.\nPemasangan profesional ke seluruh Jabodetabek.'
  const heroCtaText = String(settingsMap.hero_cta_text ?? 'Lihat Katalog')
  const heroCtaLink = String(settingsMap.hero_cta_link ?? '#products')
  const heroImageUrl = String(settingsMap.hero_image_url ?? '')
  const heroVideoUrl = String(settingsMap.hero_video_url ?? '')
  const whatsappNumber = String(settingsMap.whatsapp_number ?? '6281234567890')
  const whatsappMessage = String(settingsMap.whatsapp_message ?? 'Halo KJ Homedecor, saya ingin konsultasi gorden')
  const brandName = String(settingsMap.brand_name ?? 'KJ Homedecor')

  // Brand accent — di-inject ke CSS var runtime (zero hex di JSX: fallback ada di :root)
  const themePrimary = String(settingsMap.theme_primary_color ?? '')
  const themeSecondary = String(settingsMap.theme_secondary_color ?? '')
  const themeAccent = String(settingsMap.theme_accent_color ?? '')
  const themeBackground = String(settingsMap.theme_background_color ?? '')
  const themeText = String(settingsMap.theme_text_color ?? '')
  const brandColor = String(settingsMap.brand_color ?? '')

  // Social media & contact
  const instagram = String(settingsMap.instagram ?? '')
  const facebook = String(settingsMap.facebook ?? '')
  const tiktok = String(settingsMap.tiktok ?? '')
  const shopee = String(settingsMap.shopee ?? '')
  const tokopedia = String(settingsMap.tokopedia ?? '')
  const address = String(settingsMap.address ?? 'Jakarta, Indonesia')
  const phone = String(settingsMap.phone ?? '+62 812-3456-7890')

  // Trust badges (dari DB) — fallback ke angka hardcoded statis (bukan warna)
  const rawTrust = settingsRes.data?.trust_badges as unknown
  const trustBadges = Array.isArray(rawTrust)
    ? (rawTrust as { icon: string; label: string }[]).filter((b) => b && typeof b.label === 'string')
    : []
  const trustStats: TrustStat[] =
    trustBadges.length > 0
      ? trustBadges.map((b) => ({ icon: b.icon, label: b.label }))
      : [
          { n: '500+', label: 'Pelanggan Puas' },
          { n: '8+', label: 'Tahun Pengalaman' },
          { n: '100%', label: 'Garansi Kualitas' }
        ]

  const marketplaces = [shopee && 'Shopee', tokopedia && 'Tokopedia', tiktok && 'TikTok Shop'].filter(
    Boolean
  ) as string[]

  // Inject brand accent hanya saat settings terisi — kalau kosong, fallback :root dipakai.
  const brandVars = [
    themePrimary && `--landing-primary: ${themePrimary};`,
    themeSecondary && `--landing-secondary: ${themeSecondary};`,
    themeAccent && `--landing-accent: ${themeAccent};`,
    themeBackground && `--landing-background: ${themeBackground};`,
    themeText && `--landing-heading: ${themeText};`,
    brandColor && `--brand-color: ${brandColor};`
  ]
    .filter(Boolean)
    .join('\n')

  const whyusItems: WhyUsItem[] = [
    {
      title: String(settingsMap.whyus_card1_title ?? 'Kualitas Premium'),
      desc: String(
        settingsMap.whyus_card1_desc ?? 'Bahan pilihan import dengan jahitan rapi oleh tenaga ahli berpengalaman'
      ),
      icon: <Sparkles size={26} />
    },
    {
      title: String(settingsMap.whyus_card2_title ?? 'Ratusan Pelanggan'),
      desc: String(settingsMap.whyus_card2_desc ?? 'Telah melayani ratusan pelanggan puas di seluruh Jabodetabek'),
      icon: <Star size={26} />
    },
    {
      title: String(settingsMap.whyus_card3_title ?? 'Pasang Profesional'),
      desc: String(settingsMap.whyus_card3_desc ?? 'Tim installer bersertifikat siap membantu langsung ke rumah Anda'),
      icon: <Truck size={26} />
    },
    {
      title: String(settingsMap.whyus_card4_title ?? 'Garansi Resmi'),
      desc: String(settingsMap.whyus_card4_desc ?? 'Garansi kualitas penuh untuk setiap produk yang kami hasilkan'),
      icon: <Shield size={26} />
    }
  ]

  return (
    <>
      {brandVars && (
        <style>{`:root {\n${brandVars}\n}`}</style>
      )}
      <BrandFontLoader />

      <div className="landing-root" style={{ fontFamily: 'Inter, sans-serif' }}>
        {/* ===== NAVBAR ===== */}
        <ScrollNav whatsappNumber={whatsappNumber} whatsappMessage={whatsappMessage} />

        {/* ===== HERO (split editorial, theme-adaptive) ===== */}
        <ScrollHero
          title={heroTitle}
          subtitle={String(heroSubtitle)}
          ctaText={heroCtaText}
          ctaLink={heroCtaLink}
          whatsappNumber={whatsappNumber}
          whatsappMessage={whatsappMessage}
          heroImageUrl={heroImageUrl}
          heroVideoUrl={heroVideoUrl}
        />

        {/* ===== TRUST STRIP ===== */}
        <TrustStrip stats={trustStats} marketplaces={marketplaces} />

        {/* ===== CATEGORIES (bento asimetris) ===== */}
        <section id="categories" style={{ padding: '6rem 0' }}>
          <div className="landing-section">
            <SectionHeader
              title={String(settingsMap.categories_title ?? 'Temukan Gaya Favoritmu')}
              subtitle={String(
                settingsMap.categories_subtitle ?? 'Pilihan gorden dan aksesoris premium untuk setiap ruangan'
              )}
            />
            <CategoryBento
              categories={categories}
              fallbackNames={['Gorden', 'Vitras', 'Roman Blind', 'Kupu-Kupu', 'Kait & Aksesoris', 'Custom']}
            />
          </div>
        </section>

        {/* ===== PRODUCT CATALOG ===== */}
        <section id="products" style={{ padding: '6rem 0', background: 'var(--landing-surface-muted)' }}>
          <div className="landing-section">
            <SectionHeader
              label={String(settingsMap.categories_label ?? 'Koleksi Kami')}
              title="Produk Pilihan"
              subtitle="Pilihan gorden, vitras, roman blind, dan aksesoris berkualitas tinggi"
            />
            <ProductCatalog maxProducts={8} showViewAll />
          </div>
        </section>

        {/* ===== WHY US (numbered editorial rows) ===== */}
        <section id="keunggulan" style={{ padding: '6rem 0' }}>
          <div className="landing-section">
            <div className="whyus-split">
              <SectionHeader
                title={String(settingsMap.whyus_title ?? 'Dipercaya 500+ Pelanggan')}
                subtitle={String(
                  settingsMap.whyus_subtitle ??
                    'Dengan pengalaman bertahun-tahun, kami berkomitmen memberikan kualitas terbaik untuk setiap pesanan'
                )}
              />
              <WhyUsEditorial items={whyusItems} />
            </div>
          </div>
        </section>

        {/* ===== PORTFOLIO (gallery asimetris) ===== */}
        <section id="portfolio" style={{ padding: '6rem 0', background: 'var(--landing-surface-muted)' }}>
          <div className="landing-section">
            <SectionHeader
              title={String(settingsMap.portfolio_title ?? 'Portofolio Kami')}
              subtitle={String(
                settingsMap.portfolio_subtitle ?? 'Hasil karya dan instalasi dari tim profesional KJ Homedecor'
              )}
            />
            <PortfolioGallery posts={portfolio} />
          </div>
        </section>

        {/* ===== CTA (theme-adaptive) ===== */}
        <section className="landing-cta" style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div
              style={{
                display: 'inline-block',
                padding: '0.5rem 1.25rem',
                borderRadius: '999px',
                marginBottom: '1.75rem',
                background: 'var(--landing-surface-muted)',
                border: '1px solid var(--landing-border)',
                color: 'var(--landing-accent)',
                fontSize: '0.8rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}
            >
              {String(settingsMap.cta_badge ?? 'Konsultasi Gratis')}
            </div>
            <h2 className="cta-title" style={{ marginBottom: '1.25rem' }}>
              {String(settingsMap.cta_title ?? 'Siap Mempercantik Ruanganmu?')}
            </h2>
            <p className="cta-subtitle" style={{ maxWidth: 520, margin: '0 auto 2.5rem' }}>
              {String(
                settingsMap.cta_subtitle ??
                  'Hubungi kami sekarang untuk konsultasi gratis. Tim kami siap membantu pilihkan gorden, vitras, atau roman blind terbaik sesuai kebutuhan dan budget Anda.'
              )}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-cta-solid"
              >
                <MessageCircle size={18} /> Chat WhatsApp
              </a>
              <a href="/booking" className="btn-cta-ghost">
                <Calendar size={18} /> Buat Janji
              </a>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer id="contact" style={{ background: 'var(--landing-inverse-bg)', padding: '4rem 1.5rem 2rem' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="footer-grid">
              {/* Brand column */}
              <div>
                <div style={{ marginBottom: '1.5rem' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={String(settingsMap.brand_logo_url ?? '/kjlogo.png')}
                    alt={brandName}
                    style={{ height: '42px', width: 'auto' }}
                    suppressHydrationWarning
                  />
                </div>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--landing-on-dark-faint)', maxWidth: 280, marginBottom: '1.5rem' }}>
                  Spesialis gorden, curtain, roman blind, dan vitras premium. Pemasangan profesional ke seluruh
                  Jabodetabek.
                </p>
                <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                  {whatsappNumber && (
                    <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="footer-social" title="WhatsApp">
                      <MessageCircle size={18} />
                    </a>
                  )}
                  {instagram && (
                    <a
                      href={`https://instagram.com/${instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-social"
                      title="Instagram"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </a>
                  )}
                  {facebook && (
                    <a
                      href={facebook.startsWith('http') ? facebook : `https://facebook.com/${facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-social"
                      title="Facebook"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </a>
                  )}
                  {tiktok && (
                    <a
                      href={`https://tiktok.com/${tiktok.startsWith('@') ? tiktok : '@' + tiktok}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-social"
                      title="TikTok"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                      </svg>
                    </a>
                  )}
                  {shopee && (
                    <a
                      href={shopee.startsWith('http') ? shopee : `https://shopee.co.id/${shopee}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-social"
                      title="Shopee"
                    >
                      <ShoppingBag size={18} />
                    </a>
                  )}
                  {tokopedia && (
                    <a
                      href={tokopedia.startsWith('http') ? tokopedia : `https://tokopedia.com/${tokopedia}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-social"
                      title="Tokopedia"
                    >
                      {/* Warna logo Tokopedia = identitas brand pihak ketiga (pengecualian zero-hex) */}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" fill="#03ac0e" />
                        <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="#fff" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>

              {/* Products column */}
              <div>
                <div style={{ fontWeight: 600, color: 'var(--landing-on-dark)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  Produk
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {['Gorden', 'Vitras', 'Roman Blind', 'Kupu-Kupu', 'Custom & Aksesoris'].map((item) => (
                    <a key={item} href="#categories" className="footer-link">
                      {item}
                    </a>
                  ))}
                </div>
              </div>

              {/* Marketplace column */}
              {(shopee || tokopedia || tiktok) && (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--landing-on-dark)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    Marketplace
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {shopee && (
                      <a
                        href={shopee.startsWith('http') ? shopee : `https://shopee.co.id/${shopee}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link"
                      >
                        Shopee
                      </a>
                    )}
                    {tokopedia && (
                      <a
                        href={tokopedia.startsWith('http') ? tokopedia : `https://tokopedia.com/${tokopedia}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link"
                      >
                        Tokopedia
                      </a>
                    )}
                    {tiktok && (
                      <a
                        href={`https://tiktok.com/${tiktok.startsWith('@') ? tiktok : '@' + tiktok}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link"
                      >
                        TikTok Shop
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Contact column */}
              <div>
                <div style={{ fontWeight: 600, color: 'var(--landing-on-dark)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  Kontak
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <MapPin size={15} style={{ color: 'var(--landing-accent)', marginTop: 2, flexShrink: 0 }} />
                    <span style={{ color: 'var(--landing-on-dark-faint)', fontSize: '0.8rem' }}>{address}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Phone size={15} style={{ color: 'var(--landing-accent)', flexShrink: 0 }} />
                    <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="footer-link">
                      {phone}
                    </a>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <MessageCircle size={15} style={{ color: 'var(--landing-accent)', flexShrink: 0 }} />
                    <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="footer-link">
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--landing-on-dark-border)', paddingTop: '1.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--landing-accent)' }}>
                © {new Date().getFullYear()} {brandName}. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
