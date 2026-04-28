'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Search, MessageCircle, Package, X, Grid, List } from 'lucide-react'
import type { Product, Category } from '@/types'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const WA_NUMBER = '6281234567890'

export default function ProductCatalog() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from('products').select('*, category:categories(*)').order('name'),
      supabase.from('categories').select('*').order('name'),
    ])
    setProducts((prods as Product[]) ?? [])
    setCategories((cats as Category[]) ?? [])
    setLoading(false)
  }

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !selectedCategory || p.category_id === selectedCategory
    return matchSearch && matchCat
  })

  function getWhatsAppLink(product: Product) {
    const msg = `Halo KJ Homedecor, saya tertarik dengan produk "${product.name}" (${formatRp(product.price)}). Mohon info lebih lanjut.`
    return `https://wa.me/${WA_NUMBER.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div>
      {/* Search & Filter Bar - Improved */}
      <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #e5e7eb', marginBottom: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: 240 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Cari produk..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = '#cc7030'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{ padding: '0.75rem 1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff', cursor: 'pointer', color: '#374151', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = '#cc7030'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          >
            <option value="">Semua Kategori</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Clear filters */}
          {(search || selectedCategory) && (
            <button
              onClick={() => { setSearch(''); setSelectedCategory('') }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.625rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: '#dc2626', fontWeight: '500', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2'}
            >
              <X size={13} /> Reset
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#9ca3af', background: '#f9fafb', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
            <span style={{ fontWeight: '600', color: '#374151' }}>{filtered.length}</span> produk
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af', background: '#fff', borderRadius: '1rem', border: '1px solid #e5e7eb' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#cc7030', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p>Memuat produk...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af', background: '#fff', borderRadius: '1rem', border: '1px solid #e5e7eb' }}>
          <Package size={40} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
          <p style={{ fontSize: '1rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>Tidak ada produk ditemukan</p>
          <p style={{ fontSize: '0.875rem' }}>Coba ubah kata kunci atau filter kategori</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {filtered.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: '1rem', overflow: 'hidden', border: '1px solid #e5e7eb', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
            >
              {/* Image */}
              <Link href={`/products/${p.id}`} style={{ display: 'block' }}>
                <div style={{ aspectRatio: '4/3', background: 'linear-gradient(135deg, #fdf8f3 0%, #f5e6d3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                  {(p.images as string[])?.length > 0 ? (
                    <img src={(p.images as string[])[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} />
                  ) : (
                    <Package size={40} style={{ color: '#cc703033' }} />
                  )}
                  {/* Category badge overlay */}
                  <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', background: 'rgba(255,255,255,0.95)', padding: '0.25rem 0.625rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '600', color: '#cc7030' }}>
                    {p.category?.name ?? 'Produk'}
                  </div>
                </div>
              </Link>

              {/* Body */}
              <div style={{ padding: '1.125rem' }}>
                <Link href={`/products/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                    {p.name}
                  </div>
                </Link>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#cc7030', marginBottom: '1rem' }}>
                  {formatRp(p.price)}
                  <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', marginLeft: '0.25rem' }}>/unit</span>
                </div>

                {/* WhatsApp order button */}
                <a
                  href={getWhatsAppLink(p)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    width: '100%', padding: '0.75rem',
                    background: '#22c55e', color: '#fff',
                    borderRadius: '0.5rem', textDecoration: 'none',
                    fontSize: '0.85rem', fontWeight: '600',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = '#16a34a'}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = '#22c55e'}
                >
                  <MessageCircle size={16} /> Pesan via WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}