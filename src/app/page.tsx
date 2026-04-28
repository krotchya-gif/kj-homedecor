import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import {
  Phone,
  MessageCircle,
  ExternalLink,
  MapPin,
  ChevronRight,
  Sparkles,
  Shield,
  Truck,
  Star,
  CheckCircle,
  Clock,
  Package,
  Calendar,
  ShoppingBag,
} from 'lucide-react'
import type { Product, Category, Banner, PortfolioPost } from '@/types'
import ProductCatalog from '@/components/landing/ProductCatalog'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)

const CATEGORY_COLORS = [
  '#cc7030', '#2563eb', '#16a34a', '#9333ea', '#0d9488', '#dc2626',
]

const TRUST_ICON_MAP: Record<string, React.ReactNode> = {
  Star: <Star size={16} />,
  Shield: <Shield size={16} />,
  Truck: <Truck size={16} />,
  Clock: <Clock size={16} />,
  CheckCircle: <CheckCircle size={16} />,
}

export default async function LandingPage() {
  const supabase = await createClient()

  const [categoriesRes, portfolioRes, bannersRes, settingsRes] = await Promise.all([
    supabase.from('categories').select('*').is('parent_id', null).limit(6),
    supabase.from('portfolio_posts').select('*').order('created_at', { ascending: false }).limit(3),
    supabase.from('banners').select('*').eq('is_active', true).order('sequence'),
    supabase.from('landing_settings').select('*').eq('id', 'hero').single(),
  ])

  const categories = (categoriesRes.data ?? []) as Category[]
  const portfolio = (portfolioRes.data ?? []) as PortfolioPost[]
  const banners = (bannersRes.data ?? []) as Banner[]
  const settings = settingsRes.data as any

  const heroTitle = settings?.hero_title ?? 'Percantik Ruanganmu\ndengan Gorden Premium'
  const heroSubtitle = settings?.hero_subtitle ?? 'Spesialis gorden, curtain, dan roman blind custom berkualitas tinggi.\nPemasangan profesional ke seluruh Jabodetabek.'
  const heroCtaText = settings?.hero_cta_text ?? 'Lihat Katalog'
  const heroCtaLink = settings?.hero_cta_link ?? '#products'
  const whatsappNumber = settings?.whatsapp_number ?? '6281234567890'
  const whatsappMessage = settings?.whatsapp_message ?? 'Halo KJ Homedecor, saya ingin konsultasi gorden'
  const trustBadges = settings?.trust_badges ?? [
    { icon: 'Star', label: '500+ Pelanggan Puas' },
    { icon: 'Shield', label: 'Garansi Kualitas' },
    { icon: 'Truck', label: 'Pasang Se-Jabodetabek' },
  ]

  // Social media & contact
  const instagram = settings?.instagram ?? ''
  const facebook = settings?.facebook ?? ''
  const tiktok = settings?.tiktok ?? ''
  const shopee = settings?.shopee ?? ''
  const tokopedia = settings?.tokopedia ?? ''
  const address = settings?.address ?? 'Jakarta, Indonesia'
  const phone = settings?.phone ?? '+62 812-3456-7890'

  return (
    <div style={{ background: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* ===== NAVBAR ===== */}
      <nav className="landing-nav">
        <Link href="/" className="landing-nav-brand">
          KJ Homedecor
        </Link>
        <div className="landing-nav-links">
          <a href="#products" className="landing-nav-link">Produk</a>
          <a href="#categories" className="landing-nav-link">Kategori</a>
          <a href="#portfolio" className="landing-nav-link">Portofolio</a>
          <a href="#contact" className="landing-nav-link">Kontak</a>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="landing-nav-link landing-nav-cta"
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <MessageCircle size={15} /> WhatsApp
          </a>
          <Link href="/login" style={{ fontSize: '0.8rem', color: '#9ca3af', textDecoration: 'none', padding: '0.375rem 0.5rem' }}>
            Staff Portal
          </Link>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="landing-hero">
        {/* Banner images or decorative circles */}
        {banners.length > 0 ? (
          /* Banner image background */
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <img
              src={banners[0].image_url}
              alt="Hero"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(26,10,0,0.7) 0%, rgba(61,26,8,0.6) 50%, rgba(107,45,15,0.65) 100%)' }} />
          </div>
        ) : (
          <>
            <div style={{
              position: 'absolute', top: '-10%', right: '-5%',
              width: 600, height: 600, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(204,112,48,0.15) 0%, transparent 70%)',
              zIndex: 1,
            }} />
            <div style={{
              position: 'absolute', bottom: '-15%', left: '-8%',
              width: 500, height: 500, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(244,168,87,0.1) 0%, transparent 70%)',
              zIndex: 1,
            }} />
          </>
        )}

        <div className="landing-hero-content animate-fade-up" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: '999px', padding: '0.5rem 1.25rem', marginBottom: '2rem' }}>
            <span style={{ color: '#ffd6a5', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>✨ Home Decor Premium Indonesia</span>
          </div>

          <h1 className="landing-hero-title" style={{ whiteSpace: 'pre-line', marginBottom: '1.5rem' }}>
            {heroTitle.split('\n').map((line: string, i: number, arr: string[]) => (
              <span key={i}>
                {i === arr.length - 1 ? <>{line} <span>Gorden Premium</span></> : line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </h1>

          <p className="landing-hero-subtitle" style={{ whiteSpace: 'pre-line', maxWidth: '540px', margin: '0 auto 2.5rem' }}>
            {heroSubtitle}
          </p>

          <div className="landing-hero-cta" style={{ gap: '1rem' }}>
            <a href={heroCtaLink} className="btn-hero-primary" style={{ padding: '1rem 2.25rem', fontSize: '1rem' }}>
              {heroCtaText} <ChevronRight size={18} />
            </a>
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-hero-outline"
              style={{ padding: '1rem 2.25rem', fontSize: '1rem' }}
            >
              <MessageCircle size={18} /> Konsultasi Gratis
            </a>
          </div>

          {/* Trust badges */}
          {trustBadges.length > 0 && (
            <div style={{
              display: 'flex', gap: '2rem', justifyContent: 'center',
              marginTop: '3.5rem', flexWrap: 'wrap',
            }}>
              {trustBadges.map((b: any, i: number) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem',
                  background: 'rgba(255,255,255,0.06)',
                  padding: '0.5rem 1rem',
                  borderRadius: '999px',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <span style={{ color: '#f4a857' }}>{TRUST_ICON_MAP[b.icon] ?? <Star size={16} />}</span>
                  {b.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== CATEGORIES ===== */}
      <section id="categories" style={{ padding: '5rem 0', background: '#fafafa' }}>
        <div className="landing-section" style={{ padding: '0 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div className="landing-section-label">Koleksi Kami</div>
            <h2 className="landing-section-title" style={{ textAlign: 'center', margin: '0 auto 0.75rem' }}>
              Temukan Gaya Favoritmu
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '0.95rem', maxWidth: 480, margin: '0 auto' }}>
              Pilihan gorden dan aksesoris premium untuk setiap ruangan
            </p>
          </div>

          {categories.length === 0 ? (
            <div className="category-grid">
              {['Gorden', 'Vitras', 'Roman Blind', 'Kupu-Kupu', 'Kait & Aksesoris', 'Custom'].map(
                (name, i) => (
                  <div
                    key={name}
                    style={{
                      aspectRatio: '1', borderRadius: '1rem', overflow: 'hidden',
                      background: `linear-gradient(135deg, ${CATEGORY_COLORS[i]}22 0%, ${CATEGORY_COLORS[i]}55 100%)`,
                      display: 'flex', alignItems: 'flex-end',
                      padding: '1.25rem',
                      border: `2px solid ${CATEGORY_COLORS[i]}33`,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ color: CATEGORY_COLORS[i], fontWeight: '700', fontSize: '1rem' }}>
                      {name}
                    </span>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="category-grid">
              {categories.map((cat, i) => (
                <div
                  key={cat.id}
                  style={{
                    aspectRatio: '1', borderRadius: '1rem', overflow: 'hidden',
                    background: `linear-gradient(135deg, ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}22 0%, ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}55 100%)`,
                    display: 'flex', alignItems: 'flex-end',
                    padding: '1.25rem',
                    border: `2px solid ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}33`,
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  <span style={{ color: CATEGORY_COLORS[i % CATEGORY_COLORS.length], fontWeight: '700', fontSize: '1rem' }}>
                    {cat.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== PRODUCT CATALOG (Client Component with Search/Filter) ===== */}
      <section id="products" style={{ padding: '6rem 0' }}>
        <div className="landing-section" style={{ padding: '0 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="landing-section-label">Katalog</div>
            <h2 className="landing-section-title" style={{ margin: '0 auto 0.75rem' }}>Semua Produk</h2>
            <p style={{ color: '#9ca3af', fontSize: '0.95rem', maxWidth: 480, margin: '0 auto' }}>
              Pilihan gorden, vitras, roman blind, dan aksesoris berkualitas tinggi
            </p>
          </div>
          <ProductCatalog />
        </div>
      </section>

      {/* ===== WHY US ===== */}
      <section style={{ padding: '6rem 0', background: 'linear-gradient(135deg, #1a0a00 0%, #2d1508 50%, #3d1a08 100%)' }}>
        <div className="landing-section" style={{ padding: '0 1.5rem', textAlign: 'center' }}>
          <div className="landing-section-label" style={{ color: '#f4a857' }}>Keunggulan Kami</div>
          <h2 className="landing-section-title" style={{ color: '#fff', textAlign: 'center', margin: '0 auto 1rem' }}>
            Dipercaya Lebih dari 500 Pelanggan
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', maxWidth: 480, margin: '0 auto 3rem' }}>
            Dengan pengalaman bertahun-tahun, kami berkomitmen memberikan kualitas terbaik untuk setiap pesanan
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem', marginTop: '0' }}>
            {[
              { icon: <Sparkles size={32} />, title: 'Kualitas Premium', desc: 'Bahan pilihan import dengan jahitan rapi oleh tenaga ahli berpengalaman', color: '#f4a857' },
              { icon: <Star size={32} />, title: '500+ Pelanggan Puas', desc: 'Telah melayani ratusan pelanggan di seluruh Jabodetabek', color: '#fbbf24' },
              { icon: <Truck size={32} />, title: 'Pasang Profesional', desc: 'Tim installer bersertifikat siap membantu di rumah Anda', color: '#34d399' },
              { icon: <Shield size={32} />, title: 'Garansi Resmi', desc: 'Garansi kualitas untuk setiap produk yang kami hasilkan', color: '#60a5fa' },
            ].map((f) => (
              <div key={f.title} className="why-us-card">
                <div style={{ color: f.color, marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>{f.icon}</div>
                <div style={{ color: '#fff', fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.5rem' }}>{f.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PORTFOLIO ===== */}
      <section id="portfolio" style={{ padding: '6rem 0', background: '#fafafa' }}>
        <div className="landing-section" style={{ padding: '0 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="landing-section-label">Inspirasi</div>
            <h2 className="landing-section-title" style={{ textAlign: 'center', margin: '0 auto 0.75rem' }}>Portofolio Kami</h2>
            <p style={{ color: '#9ca3af', fontSize: '0.95rem', maxWidth: 480, margin: '0 auto' }}>
              Hasil karya dan instalasi dari tim profesional KJ Homedecor
            </p>
          </div>
          {portfolio.length === 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {['Instalasi Gorden Mewah', 'Roman Blind Modern', 'Vitras Elegan'].map((title, i) => (
                <div key={title} className="portfolio-card">
                  <div style={{ height: 220, background: `linear-gradient(135deg, ${CATEGORY_COLORS[i]}22, ${CATEGORY_COLORS[i]}55)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={40} style={{ color: CATEGORY_COLORS[i], opacity: 0.6 }} />
                  </div>
                  <div style={{ padding: '1.25rem' }}>
                    <h3 style={{ fontWeight: '700', color: '#1f2937', marginBottom: '0.4rem', fontSize: '1.05rem' }}>{title}</h3>
                    <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Hasil pemasangan terbaru oleh tim KJ Homedecor</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {portfolio.map((post) => (
                <div key={post.id} className="portfolio-card">
                  <div style={{ height: 220, background: 'linear-gradient(135deg, #f5e6d3, #e8c898)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {(post.images as string[])?.[0] ? (
                      <img src={(post.images as string[])[0]} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Sparkles size={40} style={{ color: '#cc7030', opacity: 0.6 }} />
                    )}
                  </div>
                  <div style={{ padding: '1.25rem' }}>
                    <h3 style={{ fontWeight: '700', color: '#1f2937', marginBottom: '0.4rem', fontSize: '1.05rem' }}>{post.title}</h3>
                    <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                      {new Date(post.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== CTA Banner ===== */}
      <section style={{
        background: 'linear-gradient(135deg, #cc7030 0%, #b85a22 50%, #96431a 100%)',
        padding: '5rem 1.5rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative elements */}
        <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-30%', left: '-5%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', borderRadius: '999px', padding: '0.4rem 1rem', marginBottom: '1.5rem' }}>
            <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: '600' }}>✨ Konsultasi Gratis</span>
          </div>
          <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', fontWeight: '700', marginBottom: '1rem', lineHeight: 1.2 }}>
            Siap Mempercantik Ruanganmu?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '2rem', fontSize: '1.05rem', lineHeight: 1.7 }}>
            Hubungi kami sekarang untuk konsultasi gratis. Tim kami siap membantu pilihkan gorden, vitras, atau roman blind terbaik sesuai kebutuhan dan budget Anda.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-btn-primary"
            >
              <MessageCircle size={18} /> Chat WhatsApp
            </a>
            <a
              href="#contact"
              className="cta-btn-outline"
            >
              <Calendar size={18} /> Buat Janji
            </a>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer id="contact" style={{ background: '#0f0703', padding: '4rem 1.5rem 2rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '2.5rem', marginBottom: '3rem' }}>
            {/* Brand column */}
            <div>
              <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '1.75rem', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>KJ Homedecor</div>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.5)', maxWidth: 280, marginBottom: '1.5rem' }}>
                Spesialis gorden, curtain, roman blind, dan vitras premium. Pemasangan profesional ke seluruh Jabodetabek.
              </p>
              {/* Social media icons */}
              <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                {whatsappNumber && (
                  <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="footer-social" title="WhatsApp">
                    <MessageCircle size={18} />
                  </a>
                )}
                {instagram && (
                  <a href={`https://instagram.com/${instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="footer-social" title="Instagram">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>
                )}
                {facebook && (
                  <a href={facebook.startsWith('http') ? facebook : `https://facebook.com/${facebook}`} target="_blank" rel="noopener noreferrer" className="footer-social" title="Facebook">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                )}
                {tiktok && (
                  <a href={`https://tiktok.com/${tiktok.startsWith('@') ? tiktok : '@' + tiktok}`} target="_blank" rel="noopener noreferrer" className="footer-social" title="TikTok">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                  </a>
                )}
                {shopee && (
                  <a href={shopee.startsWith('http') ? shopee : `https://shopee.co.id/${shopee}`} target="_blank" rel="noopener noreferrer" className="footer-social" title="Shopee">
                    <ShoppingBag size={18} />
                  </a>
                )}
                {tokopedia && (
                  <a href={tokopedia.startsWith('http') ? tokopedia : `https://tokopedia.com/${tokopedia}`} target="_blank" rel="noopener noreferrer" className="footer-social" title="Tokopedia">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#03ac0e"/><path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="#fff"/></svg>
                  </a>
                )}
              </div>
            </div>

            {/* Products column */}
            <div>
              <div style={{ fontWeight: '600', color: '#fff', marginBottom: '1rem', fontSize: '0.875rem' }}>Produk</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {['Gorden', 'Vitras', 'Roman Blind', 'Kupu-Kupu', 'Custom & Aksesoris'].map((item) => (
                  <a key={item} href="#categories" className="footer-link">{item}</a>
                ))}
              </div>
            </div>

            {/* Marketplace column */}
            {(shopee || tokopedia || tiktok) && (
              <div>
                <div style={{ fontWeight: '600', color: '#fff', marginBottom: '1rem', fontSize: '0.875rem' }}>Marketplace</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {shopee && (
                    <a href={shopee.startsWith('http') ? shopee : `https://shopee.co.id/${shopee}`} target="_blank" rel="noopener noreferrer" className="footer-link">Shopee</a>
                  )}
                  {tokopedia && (
                    <a href={tokopedia.startsWith('http') ? tokopedia : `https://tokopedia.com/${tokopedia}`} target="_blank" rel="noopener noreferrer" className="footer-link">Tokopedia</a>
                  )}
                  {tiktok && (
                    <a href={`https://tiktok.com/${tiktok.startsWith('@') ? tiktok : '@' + tiktok}`} target="_blank" rel="noopener noreferrer" className="footer-link">TikTok Shop</a>
                  )}
                </div>
              </div>
            )}

            {/* Contact column */}
            <div>
              <div style={{ fontWeight: '600', color: '#fff', marginBottom: '1rem', fontSize: '0.875rem' }}>Kontak</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <MapPin size={15} style={{ color: '#f4a857', marginTop: 2, flexShrink: 0 }} />
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{address}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Phone size={15} style={{ color: '#f4a857', flexShrink: 0 }} />
                  <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="footer-link">{phone}</a>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <MessageCircle size={15} style={{ color: '#f4a857', flexShrink: 0 }} />
                  <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="footer-link">WhatsApp</a>
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>
              © {new Date().getFullYear()} KJ Homedecor. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
