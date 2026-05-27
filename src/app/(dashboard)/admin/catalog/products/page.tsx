'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, Pencil, Trash2, Package, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Product, Category } from '@/types'
import { GORDEN_STYLES, SMOKRING_COLORS } from '@/types'
import { useToast } from '@/components/ui/Toast'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const PAGE_SIZE = 20

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [activeTab, setActiveTab] = useState<'gorden' | 'perabot' | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

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
    is_catalog_visible: true,
    product_type: 'perabot' as 'gorden' | 'perabot',
    // Style variants for gorden
    style_variants: [] as string[],
    smokring_colors: [] as string[],
    // Color variants for perabot
    color_variants: '',
    // Shipping dimensions
    dimension_p: '',
    dimension_l: '',
    dimension_t: '',
    weight: '',
    // Images
    images: [] as string[],
  })
  type Field = { label: string; id: string; placeholder: string; type?: string }
  const [saving, setSaving] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()

  async function fetchProducts() {
    setLoading(true)
    const from = (currentPage - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const [dataResult, countResult] = await Promise.all([
      supabase
        .from('products')
        .select('*, category:categories(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true }),
    ])

    setProducts((dataResult.data as Product[]) ?? [])
    setTotalCount(countResult.count ?? 0)
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
    async function fetchCategories() {
      const { data } = await supabase.from('categories').select('*').order('name')
      setCategories((data as Category[]) ?? [])
    }
    fetchCategories()
  }, [currentPage])

  const filtered = products.filter(
    (p) =>
      (activeTab === 'all' || (p as any).product_type === activeTab) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  function openAdd() {
    setEditProduct(null)
    setForm({
      name: '', sku: '', kode_kain: '', category_id: '', price: '', stock_toko: '',
      is_featured: false, is_custom: false, is_catalog_visible: true,
      product_type: activeTab === 'all' ? 'perabot' : activeTab,
      style_variants: [], smokring_colors: [], color_variants: '',
      dimension_p: '', dimension_l: '', dimension_t: '', weight: '',
      images: [],
    })
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
      is_catalog_visible: p.is_catalog_visible !== false,
      product_type: ((p as any).product_type as 'gorden' | 'perabot') || 'perabot',
      style_variants: p.style_variants ?? [],
      smokring_colors: p.smokring_colors ?? [],
      color_variants: (p.color_variants ?? []).join(', '),
      dimension_p: p.dimension_p ? String(p.dimension_p) : '',
      dimension_l: p.dimension_l ? String(p.dimension_l) : '',
      dimension_t: p.dimension_t ? String(p.dimension_t) : '',
      weight: p.weight ? String(p.weight) : '',
      images: p.images ?? [],
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload: Record<string, unknown> = {
      name: form.name,
      sku: form.sku || null,
      kode_kain: form.kode_kain || null,
      category_id: form.category_id || null,
      price: Number(form.price),
      stock_toko: Number(form.stock_toko),
      is_featured: form.is_featured,
      is_custom: form.is_custom,
      is_catalog_visible: form.is_catalog_visible,
      product_type: form.product_type,
      style_variants: form.product_type === 'gorden' ? form.style_variants : [],
      smokring_colors: form.product_type === 'gorden' ? form.smokring_colors : [],
      color_variants: form.product_type === 'perabot' ? (form.color_variants ? form.color_variants.split(',').map(s => s.trim()).filter(Boolean) : []) : [],
      dimension_p: form.dimension_p ? Number(form.dimension_p) : null,
      dimension_l: form.dimension_l ? Number(form.dimension_l) : null,
      dimension_t: form.dimension_t ? Number(form.dimension_t) : null,
      weight: form.weight ? Number(form.weight) : null,
      images: form.images,
    }
    if (editProduct) {
      await supabase.from('products').update(payload).eq('id', editProduct.id)
    } else {
      await supabase.from('products').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    toast('success', editProduct ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan')
    fetchProducts()
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus produk ini?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      toast('error', 'Gagal hapus: ' + error.message)
      return
    }
    toast('success', 'Produk berhasil dihapus')
    fetchProducts()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Produk</h1>
        <p className="page-subtitle">Kelola katalog produk KJ Homedecor</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveTab('gorden')}
          style={{
            padding: '0.5rem 1.25rem',
            border: 'none',
            borderRadius: '0.5rem 0.5rem 0 0',
            fontWeight: '600',
            fontSize: '0.875rem',
            cursor: 'pointer',
            background: activeTab === 'gorden' ? '#cc7030' : '#f3f4f6',
            color: activeTab === 'gorden' ? '#fff' : '#6b7280',
          }}
        >
          Gorden
        </button>
        <button
          onClick={() => setActiveTab('perabot')}
          style={{
            padding: '0.5rem 1.25rem',
            border: 'none',
            borderRadius: '0.5rem 0.5rem 0 0',
            fontWeight: '600',
            fontSize: '0.875rem',
            cursor: 'pointer',
            background: activeTab === 'perabot' ? '#cc7030' : '#f3f4f6',
            color: activeTab === 'perabot' ? '#fff' : '#6b7280',
          }}
        >
          Perabot
        </button>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '0.5rem 1.25rem',
            border: 'none',
            borderRadius: '0.5rem 0.5rem 0 0',
            fontWeight: '600',
            fontSize: '0.875rem',
            cursor: 'pointer',
            background: activeTab === 'all' ? '#cc7030' : '#f3f4f6',
            color: activeTab === 'all' ? '#fff' : '#6b7280',
          }}
        >
          Semua
        </button>
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
          <div style={{ padding: '1.5rem' }}><TableSkeleton rows={8} cols={7} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="📦" title="Belum ada produk" description="Tambah produk baru dengan tombol di atas." />
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
                <tr key={p.id} onClick={() => openEdit(p)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {p.images && p.images.length > 0 ? (
                        <img src={p.images[0]} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }} />
                      ) : (
                        <div style={{ width: 36, height: 36, background: '#f3f4f6', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.7rem' }}>📷</div>
                      )}
                      <span style={{ fontWeight: '500' }}>{p.name}</span>
                    </div>
                  </td>
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
                    {p.is_catalog_visible === false && (
                      <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600', marginLeft: '0.25rem' }}>
                        Internal
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

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', padding: '0.75rem 0', borderTop: '1px solid #e5e7eb' }}>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            Halaman {currentPage} dari {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))} — {totalCount} produk
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', color: currentPage === 1 ? '#9ca3af' : '#374151' }}
            >
              <ChevronLeft size={14} /> Sebelumnya
            </button>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: '#fff', cursor: currentPage >= Math.ceil(totalCount / PAGE_SIZE) ? 'not-allowed' : 'pointer', fontSize: '0.8rem', color: currentPage >= Math.ceil(totalCount / PAGE_SIZE) ? '#9ca3af' : '#374151' }}
            >
              Selanjutnya <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

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
                    value={(form as unknown as Record<string, string | string[] | boolean>)[field.id] as string}
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
                    value={(form as unknown as Record<string, string | string[] | boolean>)[field.id] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [field.id]: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input type="radio" name="product_type" checked={form.product_type === 'gorden'} onChange={() => setForm((f) => ({ ...f, product_type: 'gorden' }))} />
                  Tipe Gorden
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input type="radio" name="product_type" checked={form.product_type === 'perabot'} onChange={() => setForm((f) => ({ ...f, product_type: 'perabot' }))} />
                  Tipe Perabot
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))} />
                  Produk Unggulan
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_custom} onChange={(e) => setForm((f) => ({ ...f, is_custom: e.target.checked }))} />
                  Custom Order
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_catalog_visible} onChange={(e) => setForm((f) => ({ ...f, is_catalog_visible: e.target.checked }))} />
                  Tampil di Katalog
                </label>
              </div>

              {/* Style Variants for Gorden */}
              {form.product_type === 'gorden' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    Model Gorden (Style Variants)
                  </label>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {GORDEN_STYLES.map((style) => (
                      <label key={style} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={form.style_variants.includes(style)}
                          onChange={(e) => {
                            const newStyles = e.target.checked
                              ? [...form.style_variants, style]
                              : form.style_variants.filter(s => s !== style)
                            setForm((f) => ({ ...f, style_variants: newStyles }))
                          }}
                        />
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Smokring Colors */}
              {form.product_type === 'gorden' && form.style_variants.includes('smokring') && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    Warna Smokring
                  </label>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {SMOKRING_COLORS.map((color) => (
                      <label key={color} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={form.smokring_colors.includes(color)}
                          onChange={(e) => {
                            const newColors = e.target.checked
                              ? [...form.smokring_colors, color]
                              : form.smokring_colors.filter(c => c !== color)
                            setForm((f) => ({ ...f, smokring_colors: newColors }))
                          }}
                        />
                        {color}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Variants for Perabot */}
              {form.product_type === 'perabot' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
                    Warna Variants (Perabot) - pisahkan dengan koma
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Hitam, Silver, Merah"
                    value={form.color_variants}
                    onChange={(e) => setForm((f) => ({ ...f, color_variants: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>
              )}

              {/* Shipping Dimensions */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Dimensi & Berat (untuk ongkir)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#6b7280' }}>Panjang (cm)</label>
                    <input
                      type="number"
                      placeholder="P"
                      value={form.dimension_p}
                      onChange={(e) => setForm((f) => ({ ...f, dimension_p: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#6b7280' }}>Lebar (cm)</label>
                    <input
                      type="number"
                      placeholder="L"
                      value={form.dimension_l}
                      onChange={(e) => setForm((f) => ({ ...f, dimension_l: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#6b7280' }}>Tinggi (cm)</label>
                    <input
                      type="number"
                      placeholder="T"
                      value={form.dimension_t}
                      onChange={(e) => setForm((f) => ({ ...f, dimension_t: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#6b7280' }}>Berat (kg)</label>
                    <input
                      type="number"
                      placeholder="Kg"
                      value={form.weight}
                      onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Foto Produk
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {form.images.map((img, i) => (
                    <div key={i} style={{ position: 'relative', width: 72, height: 72, borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                      <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))}
                        style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >✕</button>
                    </div>
                  ))}
                  <label style={{ width: 72, height: 72, border: '2px dashed #d1d5db', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9ca3af', fontSize: '0.7rem', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '1.2rem' }}>+</div>
                      <div>Tambah</div>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const fd = new FormData()
                        fd.append('file', file)
                        fd.append('folder', 'products')
                        const res = await fetch('/api/upload', { method: 'POST', body: fd })
                        const json = await res.json()
                        if (json.success) {
                          setForm(f => ({ ...f, images: [...f.images, json.url] }))
                        } else {
                          toast('error', 'Gagal upload gambar')
                        }
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
                <p style={{ fontSize: '0.7rem', color: '#9ca3af' }}>PNG, JPG, WebP — maks 5MB per foto</p>
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
