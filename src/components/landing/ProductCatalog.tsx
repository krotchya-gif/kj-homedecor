'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { Search, MessageCircle, Package, X } from 'lucide-react'
import type { Product, Category } from '@/types'
import { formatRp } from '@/lib/utils'

interface ProductCatalogProps {
  maxProducts?: number
  showViewAll?: boolean
}

export default function ProductCatalog({ maxProducts, showViewAll }: ProductCatalogProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('6281234567890')
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    loadData()
    fetchSettings()
  }, [])

  async function fetchSettings() {
    const { data } = await supabase.from('landing_settings').select('whatsapp_number').eq('key', 'hero').single()
    if (data?.whatsapp_number) setWhatsappNumber(data.whatsapp_number)
  }

  async function loadData() {
    setLoading(true)
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from('products').select('*, category:categories(*)').eq('is_catalog_visible', true).gt('price', 0).order('name'),
      supabase.from('categories').select('*').order('name')
    ])
    setProducts((prods as Product[]) ?? [])
    setCategories((cats as Category[]) ?? [])
    setLoading(false)
  }

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !selectedCategory || p.category_id === selectedCategory
    return matchSearch && matchCat
  })

  const displayProducts = maxProducts ? filtered.slice(0, maxProducts) : filtered

  function getWhatsAppLink(product: Product) {
    const msg = `Halo KJ Homedecor, saya tertarik dengan produk "${product.name}" (${formatRp(product.price)}). Mohon info lebih lanjut.`
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div>
      {!maxProducts && (
        /* Search & Filter Bar */
        <div
          style={{
            background: 'var(--landing-surface)',
            borderRadius: '1rem',
            padding: '1.25rem',
            border: '1px solid var(--landing-border)',
            marginBottom: '2rem',
            boxShadow: '0 1px 4px var(--landing-shadow)'
          }}
        >
          <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1', minWidth: 240 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--neutral-400)'
                }}
              />
              <input
                type="text"
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  border: '1px solid var(--landing-border)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  background: 'var(--landing-surface)',
                  color: 'var(--landing-heading)',
                  outline: 'none',
                  transition: 'border-color 0.15s'
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--landing-accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--landing-border)')}
              />
            </div>

            {/* Category filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid var(--landing-border)',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                background: 'var(--landing-surface)',
                cursor: 'pointer',
                color: 'var(--landing-heading)',
                transition: 'border-color 0.15s'
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--landing-accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--landing-border)')}
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Clear filters */}
            {(search || selectedCategory) && (
              <button
                onClick={() => {
                  setSearch('')
                  setSelectedCategory('')
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.625rem 1rem',
                  background: 'transparent',
                  border: '1px solid var(--danger)',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: 'var(--danger)',
                  fontWeight: '500',
                  transition: 'background 0.15s, color 0.15s'
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--danger)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--landing-on-dark)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'
                }}
              >
                <X size={13} /> Reset
              </button>
            )}

            <div
              style={{
                marginLeft: 'auto',
                fontSize: '0.8rem',
                color: 'var(--neutral-400)',
                background: 'var(--landing-surface-muted)',
                padding: '0.5rem 0.875rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--landing-border)'
              }}
            >
              <span style={{ fontWeight: '600', color: 'var(--landing-heading)' }}>{filtered.length}</span> produk
            </div>
          </div>
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem',
            color: 'var(--neutral-400)',
            background: 'var(--landing-surface)',
            borderRadius: '1rem',
            border: '1px solid var(--landing-border)'
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              border: '3px solid var(--landing-border)',
              borderTopColor: 'var(--landing-accent)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}
          />
          <p>Memuat produk...</p>
        </div>
      ) : displayProducts.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem',
            color: 'var(--neutral-400)',
            background: 'var(--landing-surface)',
            borderRadius: '1rem',
            border: '1px solid var(--landing-border)'
          }}
        >
          <Package size={40} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
          <p style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--landing-body)', marginBottom: '0.25rem' }}>
            Tidak ada produk ditemukan
          </p>
          <p style={{ fontSize: '0.875rem' }}>Coba ubah kata kunci atau filter kategori</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.5rem' }}>
            {displayProducts.map((p) => (
              <div
                key={p.id}
                style={{
                  background: 'var(--landing-surface)',
                  borderRadius: '1rem',
                  overflow: 'hidden',
                  border: '1px solid var(--landing-border)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px var(--landing-shadow)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
                }}
              >
                {/* Image */}
                <Link href={`/products/${p.id}`} style={{ display: 'block' }}>
                  <div
                    style={{
                      aspectRatio: '4/3',
                      background: 'linear-gradient(135deg, var(--neutral-100) 0%, var(--neutral-200) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    {(p.images as string[])?.length > 0 ? (
                      <Image
                        src={(p.images as string[])[0]}
                        alt={p.name}
                        fill
                        style={{ objectFit: 'cover', transition: 'transform 0.3s' }}
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    ) : (
                      <Package size={40} style={{ color: 'var(--landing-secondary)' }} />
                    )}
                    {/* Category badge overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '0.75rem',
                        left: '0.75rem',
                        background: 'var(--landing-surface)',
                        border: '1px solid var(--landing-border)',
                        padding: '0.25rem 0.625rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--landing-accent)'
                      }}
                    >
                      {p.category?.name ?? 'Produk'}
                    </div>
                  </div>
                </Link>

                {/* Body */}
                <div style={{ padding: '1.125rem' }}>
                  <Link href={`/products/${p.id}`} style={{ textDecoration: 'none' }}>
                    <div
                      style={{
                        fontSize: '1rem',
                        fontWeight: '700',
                        color: 'var(--landing-heading)',
                        marginBottom: '0.5rem',
                        lineHeight: 1.3
                      }}
                    >
                      {p.name}
                    </div>
                  </Link>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: '800',
                      color: 'var(--landing-accent)',
                      marginBottom: '1rem'
                    }}
                  >
                    {formatRp(p.price)}
                    <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--landing-muted)', marginLeft: '0.25rem' }}>
                      /unit
                    </span>
                  </div>

                  {/* WhatsApp order button (theme-adaptive, brand accent) */}
                  <a
                    href={getWhatsAppLink(p)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-card"
                  >
                    <MessageCircle size={16} /> Pesan via WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* View All button */}
          {showViewAll && filtered.length > (maxProducts ?? 0) && (
            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <Link
                href="/catalog"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1rem 2.5rem',
                  background: 'transparent',
                  color: 'var(--landing-accent)',
                  borderRadius: '0.625rem',
                  textDecoration: 'none',
                  fontSize: '1rem',
                  fontWeight: '600',
                  border: '2px solid var(--landing-accent)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLAnchorElement).style.background = 'var(--landing-accent)'
                  ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--landing-on-dark)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--landing-accent)'
                }}
              >
                <Search size={18} /> Lihat Semua Katalog ({filtered.length} produk)
              </Link>
            </div>
          )}
        </>
      )}

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
