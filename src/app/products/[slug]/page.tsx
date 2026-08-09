import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ArrowLeft, MessageCircle, Star, Shield, Truck, Phone } from 'lucide-react'
import type { Product } from '@/types'
import ProductImageGallery from '@/components/ProductImageGallery'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .or(`id.eq.${slug},name.ilike.%${slug.replace(/-/g, '%')}%`)
    .limit(1)
    .single()

  const { data: settings } = await supabase
    .from('landing_settings')
    .select('whatsapp_number, whatsapp_message')
    .eq('key', 'hero')
    .single()

  if (!product) return notFound()

  const p = product as Product
  const images = (p.images as string[]) ?? []

  const whatsappNumber = settings?.whatsapp_number ?? '6281234567890'
  const whatsappMessage = settings?.whatsapp_message ?? 'Halo KJ Homedecor, saya ingin konsultasi gorden'
  const whatsAppMsg = `${whatsappMessage}, saya tertarik dengan produk "${p.name}" (${formatRp(p.price)}). Mohon info lebih lanjut.`
  const whatsAppUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsAppMsg)}`

  return (
    <div style={{ background: 'var(--neutral-50)', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Navbar */}
      <nav
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--neutral-200)',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            color: 'var(--neutral-700)',
            textDecoration: 'none',
            fontSize: '0.875rem'
          }}
        >
          <ArrowLeft size={16} />
          Kembali
        </Link>
        <span style={{ color: 'var(--neutral-300)' }}>|</span>
        <Link href="/#products" style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', textDecoration: 'none' }}>
          Produk
        </Link>
        <span style={{ color: 'var(--neutral-300)' }}>|</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>{p.category?.name ?? 'Produk'}</span>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '2.5rem',
            alignItems: 'start'
          }}
        >
          {/* Image Gallery */}
          <ProductImageGallery images={images} productName={p.name} />

          {/* Product Info */}
          <div>
            <div style={{ marginBottom: '0.5rem' }}>
              <span
                style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}
              >
                {p.category?.name ?? 'Produk'}
              </span>
            </div>
            <h1
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                fontWeight: '700',
                color: 'var(--neutral-800)',
                marginBottom: '0.75rem',
                lineHeight: 1.3
              }}
            >
              {p.name}
            </h1>

            {p.sku && <div style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', marginBottom: '1rem' }}>SKU: {p.sku}</div>}

            <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--brand-500)', marginBottom: '1.5rem' }}>
              {formatRp(p.price)}
            </div>

            {/* Stock info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                fontSize: '0.85rem'
              }}
            >
              {p.stock_toko > 0 ? (
                <>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                  <span style={{ color: '#16a34a', fontWeight: '600' }}>Tersedia</span>
                  <span style={{ color: 'var(--neutral-400)' }}>({p.stock_toko} unit di toko)</span>
                </>
              ) : (
                <>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                  <span style={{ color: '#ef4444', fontWeight: '600' }}>Stok Habis</span>
                </>
              )}
            </div>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.875rem 1.5rem',
                  background: '#22c55e',
                  color: '#fff',
                  borderRadius: '0.5rem',
                  fontWeight: '700',
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  minWidth: 200
                }}
              >
                <MessageCircle size={18} /> Pesan via WhatsApp
              </a>
              <a
                href="/booking"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.875rem 1.5rem',
                  background: 'var(--surface)',
                  color: 'var(--brand-500)',
                  border: '2px solid var(--brand-500)',
                  borderRadius: '0.5rem',
                  fontWeight: '700',
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  minWidth: 200
                }}
              >
                📅 Booking Survey Gratis
              </a>
            </div>

            {/* Trust badges */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                background: 'var(--neutral-100)',
                borderRadius: '0.75rem',
                padding: '1rem 1.25rem',
                border: '1px solid #e5e7eb',
                marginBottom: '1.5rem'
              }}
            >
              {[
                { icon: <Shield size={15} />, text: 'Garansi quality 1 tahun' },
                { icon: <Truck size={15} />, text: 'Pasang profesional se-Jabodetabek' },
                { icon: <Star size={15} />, text: '500+ pelanggan puas' },
                { icon: <Phone size={15} />, text: 'Konsultasi gratis via WhatsApp' }
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    fontSize: '0.85rem',
                    color: 'var(--neutral-700)'
                  }}
                >
                  <span style={{ color: 'var(--brand-500)' }}>{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>

            {/* Product details */}
            {p.kode_kain && (
              <div style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', marginBottom: '0.5rem' }}>
                <strong>Kode Kain:</strong> {p.kode_kain}
              </div>
            )}

            {/* Description */}
            {p.description && (
              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: 'var(--neutral-100)',
                  borderRadius: '0.75rem',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.5rem' }}>
                  Deskripsi
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--neutral-600)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {p.description}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related products placeholder */}
        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--neutral-200)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--neutral-700)', marginBottom: '1.25rem' }}>
            Produk Lainnya
          </h2>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.625rem 1.25rem',
              background: 'var(--surface)',
              border: '1px solid var(--input-border)',
              borderRadius: '0.5rem',
              color: 'var(--neutral-700)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}
          >
            <ArrowLeft size={14} /> Kembali ke Katalog
          </Link>
        </div>
      </div>
    </div>
  )
}
