'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Package, AlertTriangle } from 'lucide-react'

export default function GudangStockPage() {
  const [materials, setMaterials] = useState<any[]>([])
  const [products, setProducts]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<'materials'|'products'>('materials')
  const [search, setSearch]       = useState('')
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const [mRes, pRes] = await Promise.all([
      supabase.from('materials').select('*, supplier:suppliers(name)').order('name'),
      supabase.from('products').select('*, category:categories(name)').order('name'),
    ])
    setMaterials(mRes.data ?? [])
    setProducts(pRes.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filteredMat  = materials.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
  const filteredProd = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Posisi Stok</h1>
        <p className="page-subtitle">Stok Gudang vs Stok Toko — terpisah, tidak double-count</p>
      </div>

      <div style={{ display:'flex', gap:'0', borderBottom:'2px solid #e5e7eb', marginBottom:'1.5rem' }}>
        {(['materials','products'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ padding:'0.75rem 1.5rem', background:'none', border:'none', borderBottom:`2px solid ${tab===t?'#cc7030':'transparent'}`, cursor:'pointer', fontWeight:tab===t?'700':'500', color:tab===t?'#cc7030':'#6b7280', fontSize:'0.9rem', marginBottom:'-2px' }}>
            {t === 'materials' ? '🧵 Material Bahan' : '📦 Produk Jadi'}
          </button>
        ))}
      </div>

      <input type="text" placeholder="Cari..." value={search} onChange={e=>setSearch(e.target.value)}
        style={{ marginBottom:'1rem', padding:'0.625rem 1rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none', width:280 }}/>

      <div className="data-table">
        {loading ? (
          <div style={{ padding:'2rem', textAlign:'center', color:'#9ca3af' }}>Memuat...</div>
        ) : tab === 'materials' ? (
          <table>
            <thead><tr><th>Nama Material</th><th>Satuan</th><th>Stok Gudang</th><th>Stok Toko</th><th>Min. Stok</th><th>Status</th></tr></thead>
            <tbody>
              {filteredMat.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight:'500' }}>{m.name}</td>
                  <td style={{ color:'#6b7280' }}>{m.unit}</td>
                  <td style={{ fontWeight:'700', color: m.stock_gudang <= m.min_stock_level ? '#ef4444':'#374151' }}>{m.stock_gudang}</td>
                  <td>{m.stock_toko}</td>
                  <td style={{ color:'#9ca3af' }}>{m.min_stock_level}</td>
                  <td>
                    {m.stock_gudang < m.min_stock_level && (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:'0.2rem', background:'#fef2f2', color:'#dc2626', padding:'0.15rem 0.5rem', borderRadius:'999px', fontSize:'0.72rem', fontWeight:'600' }}>
                        <AlertTriangle size={10}/> Rendah
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table>
            <thead><tr><th>Nama Produk</th><th>Kategori</th><th>SKU</th><th>Stok Toko</th></tr></thead>
            <tbody>
              {filteredProd.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight:'500' }}>{p.name}</td>
                  <td style={{ color:'#6b7280' }}>{p.category?.name ?? '—'}</td>
                  <td style={{ fontFamily:'monospace', fontSize:'0.8rem', color:'#9ca3af' }}>{p.sku ?? '—'}</td>
                  <td style={{ fontWeight:'700', color: p.stock_toko === 0 ? '#ef4444':'#374151' }}>{p.stock_toko}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
