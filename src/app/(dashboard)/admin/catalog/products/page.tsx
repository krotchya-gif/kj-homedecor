'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, Pencil, Trash2, Package, Star } from 'lucide-react'
import type { Product, Category } from '@/types'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)

  // Form state
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState({
    name: '',
    sku: '',
    kode_kain: '',
    category_id: '',
    price: '',
    stock_toko: '',
    is_featured: false,
    is_custom: false,
  })
  type Field = { label: string; id: string; placeholder: string; type?: string }
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  async function fetchProducts() {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*, category:categories(name)')
      .order('created_at', { ascending: false })
    setProducts((data as Product[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
    async function fetchCategories() {
      const { data } = await supabase.from('categories').select('*').order('name')
      setCategories((data as Category[]) ?? [])
    }
    fetchCategories()
  }, [])

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditProduct(null)
    setForm({ name: '', sku: '', kode_kain: '', category_id: '', price: '', stock_toko: '', is_featured: false, is_custom: false })
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setEditProduct(p)
    setForm({
      name: p.name,
      sku: p.sku ?? '',
      kode_kain: p.kode_kain ?? '',
      category_id: (p as any).category_id ?? '',
      price: String(p.price),
      stock_toko: String(p.stock_toko),
      is_featured: p.is_featured,
      is_custom: p.is_custom,
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name,
      sku: form.sku || null,
      kode_kain: form.kode_kain || null,
      category_id: form.category_id || null,
      price: Number(form.price),
      stock_toko: Number(form.stock_toko),
      is_featured: form.is_featured,
      is_custom: form.is_custom,
    }
    if (editProduct) {
      await supabase.from('products').update(payload).eq('id', editProduct.id)
    } else {
      await supabase.from('products').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    fetchProducts()
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus produk ini?')) return
    await supabase.from('products').delete().eq('id', id)
    fetchProducts()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Produk</h1>
        <p className="page-subtitle">Kelola katalog produk KJ Homedecor</p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Cari produk atau SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 1rem 0.625rem 2.25rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>
        <button
          onClick={openAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.625rem 1.25rem',
            background: '#cc7030',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: '600',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Tambah Produk
        </button>
      </div>

      {/* Table */}
      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <Package size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada produk</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nama Produk</th>
                <th>SKU</th>
                <th>Kode Kain</th>
                <th>Harga</th>
                <th>Stok Toko</th>
                <th>Label</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: '500' }}>{p.name}</td>
                  <td style={{ color: '#6b7280', fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.sku ?? '—'}</td>
                  <td style={{ color: '#6b7280' }}>{p.kode_kain ?? '—'}</td>
                  <td style={{ fontWeight: '600', color: '#cc7030' }}>{formatRp(p.price)}</td>
                  <td>{p.stock_toko}</td>
                  <td>
                    {p.is_featured && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: '#fef3c7', color: '#92400e', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600' }}>
                        <Star size={10} /> Unggulan
                      </span>
                    )}
                    {p.is_custom && (
                      <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600', marginLeft: '0.25rem' }}>
                        Custom
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => openEdit(p)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '0.25rem' }}
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0.25rem' }}
                        title="Hapus"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}
        >
          <div style={{
            background: '#fff', borderRadius: '0.875rem', padding: '2rem',
            width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
          }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>
              {editProduct ? 'Edit Produk' : 'Tambah Produk'}
            </h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {([{ label: 'Nama Produk *', id: 'name', placeholder: 'Atlas 59-1 Smokering' }, { label: 'SKU', id: 'sku', placeholder: 'SKU-001' }, { label: 'Kode Kain', id: 'kode_kain', placeholder: 'ATL-59' }] as Field[]).map((field) => (
                <div key={field.id}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type ?? 'text'}
                    required={field.label.includes('*')}
                    placeholder={field.placeholder}
                    value={(form as Record<string, string | boolean>)[field.id] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [field.id]: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
                  Kategori
                </label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
                >
                  <option value="">— Pilih Kategori —</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {([{ label: 'Harga Jual (Rp) *', id: 'price', placeholder: '250000', type: 'number' }, { label: 'Stok Toko', id: 'stock_toko', placeholder: '0', type: 'number' }] as Field[]).map((field) => (
                <div key={field.id}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type ?? 'text'}
                    required={field.label.includes('*')}
                    placeholder={field.placeholder}
                    value={(form as Record<string, string | boolean>)[field.id] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [field.id]: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))} />
                  Produk Unggulan
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_custom} onChange={(e) => setForm((f) => ({ ...f, is_custom: e.target.checked }))} />
                  Custom Order
                </label>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: '#fff', cursor: 'pointer', fontWeight: '600' }}>
                  Batal
                </button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.75rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
