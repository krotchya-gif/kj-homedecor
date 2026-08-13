import { createClient } from '@/utils/supabase/server'
import {
  Phone,
  MessageCircle,
  MapPin,
  Sparkles,
  Shield,
  Truck,
  Star,
  CheckCircle,
  Clock,
  Calendar,
  ShoppingBag
} from 'lucide-react'
import type { Category, PortfolioPost } from '@/types'
import ProductCatalog from '@/components/landing/ProductCatalog'
import ScrollNav from '@/components/landing/ScrollNav'
import ScrollHero from '@/components/ScrollHero'
import AnimatedCounter from '@/components/landing/AnimatedCounter'

const CATEGORY_COLORS = ['#DDC0B4', '#2563eb', '#16a34a', '#9333ea', '#0d9488', '#dc2626']

const TRUST_ICON_MAP: Record<string, React.ReactNode> = {
  Star: <Star size={16} />,
  Shield: <Shield size={16} />,
  Truck: <Truck size={16} />,
  Clock: <Clock size={16} />,
  CheckCircle: <CheckCircle size={16} />
}

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
  // `value` JSON (legacy) jadi fallback. Sebelumnya hanya baca `data?.value` → semua
  // setting admin (tema preset, hero title, konten) terabaikan & landing selalu default.
  // Merge hati-hati: kolom terpisah yang TERISI menang; kolom NULL/'' → fallback value JSON
  // (mis. hero_image_url di value JSON terisi tapi kolom kosong → jangan hilang).
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
  const whatsappNumber = String(settingsMap.whatsapp_number ?? '6281234567890')
  const whatsappMessage = String(settingsMap.whatsapp_message ?? 'Halo KJ Homedecor, saya ingin konsultasi gorden')

  // Social media & contact
  const instagram = String(settingsMap.instagram ?? '')
  const facebook = String(settingsMap.facebook ?? '')
  const tiktok = String(settingsMap.tiktok ?? '')
  const shopee = String(settingsMap.shopee ?? '')
  const tokopedia = String(settingsMap.tokopedia ?? '')
  const address = String(settingsMap.address ?? 'Jakarta, Indonesia')
  const phone = String(settingsMap.phone ?? '+62 812-3456-7890')

  // Theme customization
  const themePrimary = String(settingsMap.theme_primary_color ?? '#DDC0B4')
  const themeSecondary = String(settingsMap.theme_secondary_color ?? '#C9A98C')
  const themeAccent = String(settingsMap.theme_accent_color ?? '#f4a857')
  const themeBackground = String(settingsMap.theme_background_color ?? '#FAF5EE')
  const themeText = String(settingsMap.theme_text_color ?? '#2B2321')

  return (
    <>
      {/* Inject theme CSS variables */}
      <style>{`
        :root {
          --landing-primary: ${themePrimary};
          --landing-secondary: ${themeSecondary};
          --landing-accent: ${themeAccent};
          --landing-background: ${themeBackground};
          --landing-text: ${themeText};
        }
      `}</style>

      <div className="landing-root" style={{ fontFamily: 'Inter, sans-serif' }}>
        {/* ===== NAVBAR ===== */}
        <ScrollNav whatsappNumber={whatsappNumber} whatsappMessage={whatsappMessage} />

        {/* ===== HERO ===== */}
        <ScrollHero
          videoUrl={String(settingsMap.hero_video_url ?? '')}
          overlayOpacity={Number(settingsMap.hero_background_overlay_opacity ?? 0.4)}
          title={heroTitle}
          subtitle={String(heroSubtitle)}
          ctaText={heroCtaText}
          ctaLink={heroCtaLink}
          whatsappNumber={whatsappNumber}
          whatsappMessage={whatsappMessage}
        />

        {/* ===== CATEGORIES ===== */}
        <section id="categories" style={{ padding: '5rem 0' }}>
          <div className="landing-section" style={{ padding: '0 1.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <div className="landing-section-label" style={{ color: themePrimary }}>
                {settingsMap.categories_label ?? 'Koleksi Kami'}
              </div>
              <h2
                className="landing-section-title"
                style={{ textAlign: 'center', margin: '0 auto 0.75rem' }}
              >
                {settingsMap.categories_title ?? 'Temukan Gaya Favoritmu'}
              </h2>
              <p className="landing-muted" style={{ fontSize: '0.95rem', maxWidth: 480, margin: '0 auto' }}>
                {settingsMap.categories_subtitle ?? 'Pilihan gorden dan aksesoris premium untuk setiap ruangan'}
              </p>
            </div>

            {(() => {
              const names =
                categories.length > 0
                  ? categories.map((c) => c.name)
                  : ['Gorden', 'Vitras', 'Roman Blind', 'Kupu-Kupu', 'Kait & Aksesoris', 'Custom']
              const styles = [
                {
                  bg: `linear-gradient(135deg, ${themePrimary} 0%, ${themeSecondary} 100%)`,
                  icon: '🪟',
                  sub: 'Pilihan terlengkap'
                },
                {
                  bg: `linear-gradient(135deg, ${themeSecondary} 0%, ${themeAccent} 100%)`,
                  icon: '🌿',
                  sub: 'Elegan & ringan'
                },
                {
                  bg: `linear-gradient(135deg, ${themeAccent} 0%, ${themePrimary} 100%)`,
                  icon: '✨',
                  sub: 'Modern minimalis'
                },
                {
                  bg: `linear-gradient(135deg, ${themePrimary}dd 0%, ${themeSecondary}dd 100%)`,
                  icon: '🎨',
                  sub: 'Unik & eksklusif'
                },
                {
                  bg: `linear-gradient(135deg, ${themeSecondary}dd 0%, ${themeAccent}dd 100%)`,
                  icon: '⚡',
                  sub: 'Fungsional & stylish'
                },
                {
                  bg: `linear-gradient(135deg, ${themeAccent}dd 0%, ${themePrimary}dd 100%)`,
                  icon: '🏠',
                  sub: 'Sesuai permintaan'
                }
              ]
              return (
                <div className="category-grid">
                  {names.map((name, i) => (
                    <a
                      key={name}
                      href="#products"
                      className="category-card"
                      style={{ background: styles[i % styles.length].bg }}
                    >
                      <div className="category-card-inner">
                        <div className="category-card-icon">{styles[i % styles.length].icon}</div>
                        <div className="category-card-name">{name}</div>
                        <div className="category-card-sub">{styles[i % styles.length].sub}</div>
                      </div>
                    </a>
                  ))}
                </div>
              )
            })()}
          </div>
        </section>

        {/* ===== PRODUCT CATALOG (Featured Only) ===== */}
        <section id="products" style={{ padding: '6rem 0' }}>
          <div className="landing-section" style={{ padding: '0 1.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div className="landing-section-label" style={{ color: themePrimary }}>
                Rekomendasi
              </div>
              <h2 className="landing-section-title" style={{ margin: '0 auto 0.75rem' }}>
                Produk Pilihan
              </h2>
              <p className="landing-muted" style={{ fontSize: '0.95rem', maxWidth: 480, margin: '0 auto' }}>
                Pilihan gorden, vitras, roman blind, dan aksesoris berkualitas tinggi
              </p>
            </div>
            <ProductCatalog maxProducts={8} showViewAll />
          </div>
        </section>

        {/* ===== WHY US ===== */}
        <section
          style={{
            padding: '6rem 0',
            background: `linear-gradient(160deg, ${themeText} 0%, color-mix(in srgb, ${themeText} 80%, ${themePrimary} 20%) 40%, color-mix(in srgb, ${themeText} 70%, ${themeSecondary} 30%) 100%)`
          }}
        >
          <div className="landing-section" style={{ padding: '0 1.5rem', textAlign: 'center' }}>
            <div className="landing-section-label" style={{ color: themeAccent }}>
              {settingsMap.whyus_label ?? 'Keunggulan Kami'}
            </div>
            <h2
              className="landing-section-title"
              style={{
                color: '#fff',
                textAlign: 'center',
                margin: '0 auto 1rem'
              }}
            >
              {settingsMap.whyus_title ?? 'Dipercaya'} <AnimatedCounter target={500} suffix="+" /> Pelanggan
            </h2>
            <p className="why-us-subtitle">
              {settingsMap.whyus_subtitle ??
                'Dengan pengalaman bertahun-tahun, kami berkomitmen memberikan kualitas terbaik untuk setiap pesanan'}
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                gap: '1.25rem'
              }}
            >
              {[
                {
                  icon: <Sparkles size={34} />,
                  title: settingsMap.whyus_card1_title ?? 'Kualitas Premium',
                  desc:
                    settingsMap.whyus_card1_desc ??
                    'Bahan pilihan import dengan jahitan rapi oleh tenaga ahli berpengalaman',
                  color: themeAccent
                },
                {
                  icon: <Star size={34} />,
                  title: settingsMap.whyus_card2_title ?? 'Ratusan Pelanggan',
                  desc: settingsMap.whyus_card2_desc ?? 'Telah melayani ratusan pelanggan puas di seluruh Jabodetabek',
                  color: themePrimary
                },
                {
                  icon: <Truck size={34} />,
                  title: settingsMap.whyus_card3_title ?? 'Pasang Profesional',
                  desc:
                    settingsMap.whyus_card3_desc ?? 'Tim installer bersertifikat siap membantu langsung ke rumah Anda',
                  color: themeSecondary
                },
                {
                  icon: <Shield size={34} />,
                  title: settingsMap.whyus_card4_title ?? 'Garansi Resmi',
                  desc: settingsMap.whyus_card4_desc ?? 'Garansi kualitas penuh untuk setiap produk yang kami hasilkan',
                  color: themeAccent
                }
              ].map((f, i) => (
                <div key={i} className="why-us-card">
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      background: `${f.color}22`,
                      border: `2px solid ${f.color}44`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1.25rem',
                      color: f.color,
                      animation: 'pulseGlow 3s ease-in-out infinite'
                    }}
                  >
                    {f.icon}
                  </div>
                  <div className="why-us-card-title">{f.title}</div>
                  <div className="why-us-card-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PORTFOLIO ===== */}
        <section id="portfolio" style={{ padding: '6rem 0' }}>
          <div className="landing-section" style={{ padding: '0 1.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div className="landing-section-label" style={{ color: themePrimary }}>
                {settingsMap.portfolio_label ?? 'Inspirasi'}
              </div>
              <h2
                className="landing-section-title"
                style={{ textAlign: 'center', margin: '0 auto 0.75rem' }}
              >
                {settingsMap.portfolio_title ?? 'Portofolio Kami'}
              </h2>
              <p className="landing-muted" style={{ fontSize: '0.95rem', maxWidth: 480, margin: '0 auto' }}>
                {settingsMap.portfolio_subtitle ?? 'Hasil karya dan instalasi dari tim profesional KJ Homedecor'}
              </p>
            </div>
            {portfolio.length === 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '1.5rem'
                }}
              >
                {['Instalasi Gorden Mewah', 'Roman Blind Modern', 'Vitras Elegan'].map((title, i) => {
                  const colors = [themePrimary, themeSecondary, themeAccent]
                  return (
                    <div key={title} className="portfolio-card">
                      <div className="portfolio-card-img-wrap">
                        <div
                          className="portfolio-placeholder"
                          style={{
                            height: 240,
                            background: `linear-gradient(135deg, ${colors[i]}33, ${colors[i]}77)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Sparkles size={44} style={{ color: colors[i], opacity: 0.7 }} />
                        </div>
                        <div className="portfolio-card-overlay">
                          <span
                            style={{
                              color: '#fff',
                              fontWeight: '700',
                              fontSize: '0.95rem'
                            }}
                          >
                            {title}
                          </span>
                        </div>
                      </div>
                      <div style={{ padding: '1.25rem' }}>
                        <h3 className="landing-card-title" style={{ fontWeight: '700', marginBottom: '0.4rem', fontSize: '1.05rem' }}>
                          {title}
                        </h3>
                        <p className="landing-card-desc" style={{ fontSize: '0.85rem' }}>
                          Hasil pemasangan terbaru oleh tim KJ Homedecor
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '1.5rem'
                }}
              >
                {portfolio.map((post) => (
                  <div key={post.id} className="portfolio-card">
                    <div className="portfolio-card-img-wrap">
                      <div
                        style={{
                          height: 240,
                          background: `linear-gradient(135deg, ${themePrimary}33, ${themeSecondary}77)`,
                          overflow: 'hidden'
                        }}
                      >
                        {(post.images as string[])?.[0] ? (
                          <img
                            src={(post.images as string[])[0]}
                            alt={post.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Sparkles size={44} style={{ color: themePrimary, opacity: 0.5 }} />
                          </div>
                        )}
                      </div>
                      <div className="portfolio-card-overlay">
                        <span
                          style={{
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '0.95rem'
                          }}
                        >
                          {post.title}
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: '1.25rem' }}>
                      <h3 className="landing-card-title" style={{ fontWeight: '700', marginBottom: '0.4rem', fontSize: '1.05rem' }}>
                        {post.title}
                      </h3>
                      <p className="landing-card-desc" style={{ fontSize: '0.85rem' }}>
                        {new Date(post.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ===== CTA Banner ===== */}
        <section
          className="landing-cta"
          style={{
            padding: '6rem 1.5rem',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Animated blobs */}
          <div
            style={{
              position: 'absolute',
              top: '-30%',
              right: '-15%',
              width: 500,
              height: 500,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              animation: 'blobMove 10s ease-in-out infinite',
              pointerEvents: 'none'
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-40%',
              left: '-10%',
              width: 450,
              height: 450,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)',
              animation: 'blobMove 14s ease-in-out infinite reverse',
              pointerEvents: 'none'
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '20%',
              left: '50%',
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
              animation: 'blobMove 8s ease-in-out infinite 2s',
              pointerEvents: 'none'
            }}
          />
          {/* Decorative ring */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              width: 600,
              height: 600,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.08)',
              pointerEvents: 'none'
            }}
          />

          <div
            style={{
              maxWidth: 640,
              margin: '0 auto',
              position: 'relative',
              zIndex: 1
            }}
          >
            <div
              style={{
                display: 'inline-block',
                background: 'rgba(255,255,255,0.18)',
                borderRadius: '999px',
                padding: '0.5rem 1.25rem',
                marginBottom: '1.75rem',
                backdropFilter: 'blur(8px)'
              }}
            >
              <span
                style={{
                  color: '#fff',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase'
                }}
              >
                {settingsMap.cta_badge ?? '✨ Konsultasi Gratis'}
              </span>
            </div>
            <h2
              style={{
                fontFamily: 'Playfair Display, Georgia, serif',
                fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
                color: '#fff',
                fontWeight: '700',
                marginBottom: '1.25rem',
                lineHeight: 1.15,
                textShadow: '0 2px 20px rgba(0,0,0,0.15)'
              }}
            >
              {settingsMap.cta_title ?? 'Siap Mempercantik Ruanganmu?'}
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.88)',
                marginBottom: '2.5rem',
                fontSize: '1.05rem',
                lineHeight: 1.8,
                maxWidth: 500,
                margin: '0 auto 2.5rem'
              }}
            >
              {settingsMap.cta_subtitle ??
                'Hubungi kami sekarang untuk konsultasi gratis. Tim kami siap membantu pilihkan gorden, vitras, atau roman blind terbaik sesuai kebutuhan dan budget Anda.'}
            </p>
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}
            >
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cta-btn-primary"
              >
                <MessageCircle size={18} /> Chat WhatsApp
              </a>
              <a href="/booking" className="cta-btn-outline">
                <Calendar size={18} /> Buat Janji
              </a>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer
          id="contact"
          style={{
            background: `color-mix(in srgb, ${themeText} 95%, #000 5%)`,
            padding: '4rem 1.5rem 2rem'
          }}
        >
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10 mb-12 footer-grid">
              {/* Brand column */}
              <div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <img
                    src="/kjlogo.png"
                    alt="KJ Homedecor"
                    style={{ height: '42px', width: 'auto' }}
                    suppressHydrationWarning
                  />
                </div>
                <p
                  style={{
                    fontSize: '0.875rem',
                    lineHeight: 1.7,
                    color: 'rgba(255,255,255,0.5)',
                    maxWidth: 280,
                    marginBottom: '1.5rem'
                  }}
                >
                  Spesialis gorden, curtain, roman blind, dan vitras premium. Pemasangan profesional ke seluruh
                  Jabodetabek.
                </p>
                {/* Social media icons */}
                <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                  {whatsappNumber && (
                    <a
                      href={`https://wa.me/${whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-social"
                      title="WhatsApp"
                    >
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
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" fill="#03ac0e" />
                        <path
                          d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
                          fill="#fff"
                        />
                      </svg>
                    </a>
                  )}
                </div>
              </div>

              {/* Products column */}
              <div>
                <div
                  style={{
                    fontWeight: '600',
                    color: '#fff',
                    marginBottom: '1rem',
                    fontSize: '0.875rem'
                  }}
                >
                  Produk
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
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
                  <div
                    style={{
                      fontWeight: '600',
                      color: '#fff',
                      marginBottom: '1rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    Marketplace
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
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
                <div
                  style={{
                    fontWeight: '600',
                    color: '#fff',
                    marginBottom: '1rem',
                    fontSize: '0.875rem'
                  }}
                >
                  Kontak
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'flex-start'
                    }}
                  >
                    <MapPin
                      size={15}
                      style={{
                        color: themeAccent,
                        marginTop: 2,
                        flexShrink: 0
                      }}
                    />
                    <span
                      style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '0.8rem'
                      }}
                    >
                      {address}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'center'
                    }}
                  >
                    <Phone size={15} style={{ color: themeAccent, flexShrink: 0 }} />
                    <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="footer-link">
                      {phone}
                    </a>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'center'
                    }}
                  >
                    <MessageCircle size={15} style={{ color: themeAccent, flexShrink: 0 }} />
                    <a
                      href={`https://wa.me/${whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-link"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.08)',
                paddingTop: '1.5rem',
                textAlign: 'center'
              }}
            >
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>
                © {new Date().getFullYear()} KJ Homedecor. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
