'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Search, MessageCircle, X } from 'lucide-react'
import Link from 'next/link'
import type { Product, Category } from '@/types'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [whatsappNumber, setWhatsappNumber] = useState('6281234567890')

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [productsRes, categoriesRes, settingsRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('landing_settings').select('whatsapp_number').eq('id', 'hero').single(),
      ])
      setProducts(productsRes.data ?? [])
      setCategories(categoriesRes.data ?? [])
      if (settingsRes.data?.whatsapp_number) setWhatsappNumber(settingsRes.data.whatsapp_number)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !selectedCategory || p.category_id === selectedCategory
    return matchSearch && matchCat
  })

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <Link href="/" style={{ fontSize: '0.8rem', color: '#6b7280', textDecoration: 'none' }}>← Kembali</Link>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937', marginTop: '0.25rem' }}>Katalog Lengkap</h1>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{filtered.length} produk</span>
          </div>

          {/* Search + Filter */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Cari produk..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '0.625rem 0.75rem 0.625rem 2.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
              />
            </div>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              style={{ padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="">Semua Kategori</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {(search || selectedCategory) && (
              <button
                onClick={() => { setSearch(''); setSelectedCategory('') }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 0.75rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', color: '#6b7280' }}
              >
                <X size={14} /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af' }}>
            <p>Produk tidak ditemukan</p>
          </div>
        ) : (
          <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {filtered.map(product => (
              <div key={product.id} className="product-card" style={{ background: '#fff', borderRadius: '0.875rem', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'all 0.25s', cursor: 'pointer' }}>
                <Link href={`/products/${product.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ height: 180, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {product.images && (product.images as string[]).length > 0 ? (
                      <img src={(product.images as string[])[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>No Image</span>
                    )}
                  </div>
                  <div style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#cc7030', marginBottom: '0.3rem' }}>
                      {categories.find(c => c.id === product.category_id)?.name ?? 'Lainnya'}
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                      {product.name}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#cc7030' }}>
                      {formatRp(product.price ?? 0)}
                    </div>
                  </div>
                </Link>
                <div style={{ padding: '0 1rem 1rem' }}>
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=Halo%20KJ%20Homedecor,%20saya%20tertarik%20dengan%20${encodeURIComponent(product.name)}%20(Rp%20${formatRp(product.price ?? 0).replace(/[^0-9]/g, '')})`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.625rem', background: '#25D366', color: '#fff', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none' }}
                  >
                    <MessageCircle size={15} /> Pesan via WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
