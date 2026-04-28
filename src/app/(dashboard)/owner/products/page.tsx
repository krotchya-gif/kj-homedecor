'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Package, Loader2, Search } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
  price: number
  stock_toko: number
  category?: { name: string }
}

interface ProductStats {
  id: string
  name: string
  sku: string
  total_qty: number
  total_revenue: number
}

export default function OwnerProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const supabase = createClient()

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*, category:categories(name)')
      .order('name')
    setProducts(data ?? [])
    setLoading(false)
  }

  async function getProductStats(): Promise<ProductStats[]> {
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, qty, price, product:products(name, sku)')

    const stats: Record<string, ProductStats> = {}
    ;(orderItems ?? []).forEach((item: any) => {
      if (!stats[item.product_id]) {
        stats[item.product_id] = {
          id: item.product_id,
          name: item.product?.name ?? 'Unknown',
          sku: item.product?.sku ?? '',
          total_qty: 0,
          total_revenue: 0,
        }
      }
      stats[item.product_id].total_qty += item.qty ?? 1
      stats[item.product_id].total_revenue += (item.price ?? 0) * (item.qty ?? 1)
    })

    return Object.values(stats).sort((a, b) => b.total_revenue - a.total_revenue)
  }

  const [stats, setStats] = useState<ProductStats[]>([])
  useEffect(() => { getProductStats().then(setStats) }, [])

  const filtered = products.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredStats = search
    ? stats.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.sku?.toLowerCase().includes(search.toLowerCase()))
    : stats

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Top Produk</h1>
        <p className="page-subtitle">Produk terlaris berdasarkan revenue dan quantity</p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1rem', maxWidth: 320 }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Cari produk..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.625rem 1rem 0.625rem 2.25rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#cc7030' }} />
        </div>
      ) : (
        <>
          {/* Top Products by Revenue */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>Top 10 Produk (Revenue)</h2>
            </div>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Produk</th>
                    <th>SKU</th>
                    <th>Qty Terjual</th>
                    <th>Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStats.slice(0, 10).map((p, i) => (
                    <tr key={p.id}>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 22, height: 22, borderRadius: '50%',
                          background: i < 3 ? '#cc7030' : '#e5e7eb',
                          color: i < 3 ? '#fff' : '#6b7280',
                          fontSize: '0.7rem', fontWeight: '700'
                        }}>
                          {i + 1}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600' }}>{p.name}</td>
                      <td style={{ color: '#6b7280', fontFamily: 'monospace', fontSize: '0.82rem' }}>{p.sku}</td>
                      <td style={{ color: '#6b7280' }}>{p.total_qty}</td>
                      <td style={{ fontWeight: '700', color: '#cc7030' }}>{formatRp(p.total_revenue)}</td>
                    </tr>
                  ))}
                  {filteredStats.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                        Tidak ada data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* All Products */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>Semua Produk</h2>
            </div>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>SKU</th>
                    <th>Kategori</th>
                    <th>Harga</th>
                    <th>Stok Toko</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: '600' }}>{p.name}</td>
                      <td style={{ color: '#6b7280', fontFamily: 'monospace', fontSize: '0.82rem' }}>{p.sku}</td>
                      <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>{p.category?.name ?? '—'}</td>
                      <td style={{ fontWeight: '600', color: '#cc7030' }}>{formatRp(p.price)}</td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600',
                          background: (p.stock_toko ?? 0) > 0 ? '#d1fae5' : '#fee2e2',
                          color: (p.stock_toko ?? 0) > 0 ? '#065f46' : '#991b1b',
                        }}>
                          {(p.stock_toko ?? 0).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                        <Package size={28} style={{ opacity: 0.3, margin: '0 auto 0.75rem', display: 'block' }} />
                        Tidak ada produk
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
