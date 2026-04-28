import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ArrowLeft, MessageCircle, Star, Shield, Truck, Phone, MapPin } from 'lucide-react'
import type { Product, Category } from '@/types'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch product by slug (using id since slug field may not exist)
  // Try to find by name slugified or by id directly
  const { data: product } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .or(`id.eq.${slug},name.ilike.%${slug.replace(/-/g, '%')}%`)
    .limit(1)
    .single()

  if (!product) return notFound()

  const p = product as Product
  const images = (p.images as string[]) ?? []

  const whatsAppMsg = `Halo KJ Homedecor, saya tertarik dengan produk "${p.name}" (${formatRp(p.price)}). Mohon info lebih lanjut.`
  const whatsAppUrl = `https://wa.me/6281234567890?text=${encodeURIComponent(whatsAppMsg)}`

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Navbar */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#374151', textDecoration: 'none', fontSize: '0.875rem' }}>
          <ArrowLeft size={16} /> Kembali
        </Link>
        <span style={{ color: '#d1d5db' }}>|</span>
        <Link href="/#products" style={{ fontSize: '0.8rem', color: '#9ca3af', textDecoration: 'none' }}>Produk</Link>
        <span style={{ color: '#d1d5db' }}>|</span>
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{p.category?.name ?? 'Produk'}</span>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2.5rem', alignItems: 'start' }}>

          {/* Image Gallery */}
          <div>
            <div style={{ background: '#fff', borderRadius: '0.875rem', overflow: 'hidden', marginBottom: '1rem', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb' }}>
              {images.length > 0 ? (
                <img src={images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ color: '#d1d5db', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🪟</div>
                  <span style={{ fontSize: '0.85rem' }}>Tidak ada foto</span>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {images.map((img, i) => (
                  <div key={i} style={{ width: 80, height: 80, borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e5e7eb', cursor: 'pointer' }}>
                    <img src={img} alt={`${p.name} ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600' }}>
                {p.category?.name ?? 'Produk'}
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: '700', color: '#1f2937', marginBottom: '0.75rem', lineHeight: 1.3 }}>
              {p.name}
            </h1>

            {p.sku && (
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '1rem' }}>
                SKU: {p.sku}
              </div>
            )}

            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#cc7030', marginBottom: '1.5rem' }}>
              {formatRp(p.price)}
            </div>

            {/* Stock info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              {p.stock_toko > 0 ? (
                <>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                  <span style={{ color: '#16a34a', fontWeight: '600' }}>Tersedia</span>
                  <span style={{ color: '#9ca3af' }}>({p.stock_toko} unit di toko)</span>
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
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem 1.5rem', background: '#22c55e', color: '#fff', borderRadius: '0.5rem', fontWeight: '700', textDecoration: 'none', fontSize: '0.95rem', minWidth: 200 }}
              >
                <MessageCircle size={18} /> Pesan via WhatsApp
              </a>
              <a
                href="https://wa.me/6281234567890?text=Halo%20KJ%20Homedecor,%20saya%20ingin%20booking%20survey%20ukur"
                target="_blank"
                rel="noopener noreferrer"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem 1.5rem', background: '#fff', color: '#cc7030', border: '2px solid #cc7030', borderRadius: '0.5rem', fontWeight: '700', textDecoration: 'none', fontSize: '0.95rem', minWidth: 200 }}
              >
                📅 Booking Survey Gratis
              </a>
            </div>

            {/* Trust badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#f9fafb', borderRadius: '0.75rem', padding: '1rem 1.25rem', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
              {[
                { icon: <Shield size={15} />, text: 'Garansi quality 1 tahun' },
                { icon: <Truck size={15} />, text: 'Pasang profesional se-Jabodetabek' },
                { icon: <Star size={15} />, text: '500+ pelanggan puas' },
                { icon: <Phone size={15} />, text: 'Konsultasi gratis via WhatsApp' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.85rem', color: '#374151' }}>
                  <span style={{ color: '#cc7030' }}>{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>

            {/* Product details */}
            {p.kode_kain && (
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                <strong>Kode Kain:</strong> {p.kode_kain}
              </div>
            )}
            {p.harga_jual && p.hpp_calculated && (
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                <strong>HPP:</strong> {formatRp(p.hpp_calculated)} | <strong>Margin:</strong> {Math.round(((p.harga_jual - p.hpp_calculated) / p.hpp_calculated) * 100)}%
              </div>
            )}
          </div>
        </div>

        {/* Related products placeholder */}
        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#374151', marginBottom: '1.25rem' }}>Produk Lainnya</h2>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: '#fff', border: '1px solid #d1d5db', borderRadius: '0.5rem', color: '#374151', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '600' }}>
            <ArrowLeft size={14} /> Kembali ke Katalog
          </Link>
        </div>
      </div>
    </div>
  )
}