'use client'
import { PageHeader } from '@/components/ui/PageHeader'
import MobileCards from '@/components/ui/MobileCards'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, Pencil, Trash2, Package, Star, ChevronLeft, ChevronRight, Download, Upload } from 'lucide-react'
import type { Product, Category } from '@/types'
import { GORDEN_STYLES, SMOKRING_COLORS } from '@/types'
import { useToast } from '@/components/ui/Toast'
import Pagination from '@/components/ui/Pagination'
import ActionMenu from '@/components/ui/ActionMenu'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import ImportModal from '@/components/ui/ImportModal'
import { exportToCSV, generateCSVTemplate } from '@/lib/csv'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const IMPORT_COLUMNS = [
  { key: 'name', label: 'Nama', aliases: ['nama_produk'], required: true },
  { key: 'sku', label: 'SKU', aliases: ['kode_sku', 'kode'] },
  { key: 'kode_kain', label: 'Kode Kain', aliases: [] },
  { key: 'category_name', label: 'Kategori', aliases: ['kategori'], required: true },
  { key: 'price', label: 'Harga', aliases: ['harga', 'harga_jual'], required: true },
  { key: 'stock_toko', label: 'Stok Toko', aliases: ['stok'] },
  { key: 'description', label: 'Deskripsi', aliases: ['keterangan', 'desc'] },
  { key: 'product_type', label: 'Tipe/Jenis', aliases: ['jenis', 'type'] },
  { key: 'images', label: 'Gambar', aliases: ['gambar', 'image', 'foto'] },
  { key: 'is_custom', label: 'Custom', aliases: ['custom'] },
  { key: 'is_catalog_visible', label: 'Tampil di Katalog', aliases: ['visible', 'catalog_visible'] }
]

export default function ProductsPage() {
  const [PAGE_SIZE, setPageSize] = useState(20)
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [activeTab, setActiveTab] = useState<'gorden' | 'perabot' | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [importModalOpen, setImportModalOpen] = useState(false)

  // Form state
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState({
    name: '',
    sku: '',
    kode_kain: '',
    category_id: '',
    price: '',
    stock_toko: '',
    description: '',
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
    images: [] as string[]
  })
  type Field = { label: string; id: string; placeholder: string; type?: string }
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

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
      supabase.from('products').select('id', { count: 'exact', head: true })
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

  // Category lookup map for import
  function getCategoryId(name: string): string | null {
    if (!name) return null
    const cat = categories.find((c) => c.name.toLowerCase() === name.toLowerCase())
    return cat?.id ?? null
  }

  // Resolver for import modal (handles FK lookups)
  function resolveProductField(key: string, value: string): string | number | boolean | null {
    if (!value && value !== '0') return null
    if (key === 'category_name') return getCategoryId(value)
    if (
      key === 'price' ||
      key === 'stock_toko' ||
      key === 'stock_gudang' ||
      key === 'dimension_p' ||
      key === 'dimension_l' ||
      key === 'dimension_t' ||
      key === 'weight'
    ) {
      const n = parseFloat(value)
      return isNaN(n) ? null : n
    }
    if (key === 'is_custom' || key === 'is_catalog_visible') {
      const v = value.toLowerCase()
      return v === 'true' || v === '1' || v === 'yes' || v === 'ya'
    }
    return value
  }

  // Export current products as CSV
  function handleExport() {
    const rows = products.map((p) => ({
      name: p.name,
      sku: p.sku ?? '',
      kode_kain: p.kode_kain ?? '',
      category_name: p.category?.name ?? '',
      price: p.price,
      stock_toko: p.stock_toko,
      description: p.description ?? '',
      product_type: p.product_type ?? 'perabot',
      images: (p.images ?? []).join(';'),
      is_custom: p.is_custom ? 'true' : 'false',
      is_catalog_visible: p.is_catalog_visible ? 'true' : 'false'
    }))
    exportToCSV(rows as Record<string, unknown>[], IMPORT_COLUMNS as { key: string; label: string }[])
  }

  // Download blank template
  function handleDownloadTemplate() {
    generateCSVTemplate(IMPORT_COLUMNS)
  }

  // Handle import rows
  async function handleImport(rows: Record<string, string | number | boolean | null>[]) {
    const errors: string[] = []
    let inserted = 0
    let updated = 0

    // Batch process 50 rows at a time
    const BATCH = 50
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      const upserts = batch.map((row) => {
        const catId = getCategoryId(String(row.category_name ?? ''))
        const payload: Record<string, unknown> = {
          name: row.name,
          sku: row.sku || null,
          kode_kain: row.kode_kain || null,
          category_id: catId,
          price: Number(row.price) || 0,
          stock_toko: Number(row.stock_toko) || 0,
          description: row.description ? String(row.description) : null,
          images: row.images ? [String(row.images)] : [],
          product_type: (row.product_type as 'gorden' | 'perabot') || 'perabot',
          is_custom: row.is_custom,
          is_catalog_visible: row.is_catalog_visible
        }
        return payload
      })

      // Upsert by SKU
      for (const payload of upserts) {
        try {
          if (payload.sku) {
            // Check if exists by SKU
            const { data: existing } = await supabase.from('products').select('id').eq('sku', payload.sku).maybeSingle()
            if (existing) {
              const { error } = await supabase.from('products').update(payload).eq('id', existing.id)
              if (error) errors.push(`Update SKU ${payload.sku}: ${error.message}`)
              else updated++
            } else {
              const { error } = await supabase.from('products').insert(payload)
              if (error) errors.push(`Insert ${payload.name}: ${error.message}`)
              else inserted++
            }
          } else {
            // No SKU = always insert
            const { error } = await supabase.from('products').insert(payload)
            if (error) errors.push(`Insert ${payload.name}: ${error.message}`)
            else inserted++
          }
        } catch (e) {
          errors.push(`Error: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
    }

    fetchProducts()
    toast(errors.length > 0 ? 'warning' : 'success', `Import selesai: ${inserted} baru, ${updated} update${errors.length > 0 ? `, ${errors.length} error` : ''}`)
    return { inserted, updated, errors }
  }

  const filtered = products.filter(
    (p) =>
      (activeTab === 'all' || p.product_type === activeTab) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  function openAdd() {
    setEditProduct(null)
    setForm({
      name: '',
      sku: '',
      kode_kain: '',
      category_id: '',
      price: '',
      stock_toko: '',
      description: '',
      is_featured: false,
      is_custom: false,
      is_catalog_visible: true,
      product_type: activeTab === 'all' ? 'perabot' : activeTab,
      style_variants: [],
      smokring_colors: [],
      color_variants: '',
      dimension_p: '',
      dimension_l: '',
      dimension_t: '',
      weight: '',
      images: []
    })
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setEditProduct(p)
    setForm({
      name: p.name,
      sku: p.sku ?? '',
      kode_kain: p.kode_kain ?? '',
      category_id: p.category_id ?? '',
      price: String(p.price),
      stock_toko: String(p.stock_toko),
      description: p.description ?? '',
      is_featured: p.is_featured,
      is_custom: p.is_custom,
      is_catalog_visible: p.is_catalog_visible !== false,
      product_type: p.product_type || 'perabot',
      style_variants: p.style_variants ?? [],
      smokring_colors: p.smokring_colors ?? [],
      color_variants: (p.color_variants ?? []).join(', '),
      dimension_p: p.dimension_p ? String(p.dimension_p) : '',
      dimension_l: p.dimension_l ? String(p.dimension_l) : '',
      dimension_t: p.dimension_t ? String(p.dimension_t) : '',
      weight: p.weight ? String(p.weight) : '',
      images: p.images ?? []
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
      description: form.description || null,
      is_featured: form.is_featured,
      is_custom: form.is_custom,
      is_catalog_visible: form.is_catalog_visible,
      product_type: form.product_type,
      style_variants: form.product_type === 'gorden' ? form.style_variants : [],
      smokring_colors: form.product_type === 'gorden' ? form.smokring_colors : [],
      color_variants:
        form.product_type === 'perabot'
          ? form.color_variants
            ? form.color_variants
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : []
          : [],
      dimension_p: form.dimension_p ? Number(form.dimension_p) : null,
      dimension_l: form.dimension_l ? Number(form.dimension_l) : null,
      dimension_t: form.dimension_t ? Number(form.dimension_t) : null,
      weight: form.weight ? Number(form.weight) : null,
      images: form.images
    }
    if (editProduct) {
      // UPDATE optimistic: update UI dulu, rollback kalau server error
      const prev = products
      setProducts((curr) => curr.map((p) => (p.id === editProduct.id ? { ...p, ...(payload as Partial<Product>) } : p)))
      const res = await supabase.from('products').update(payload).eq('id', editProduct.id)
      if (res.error) {
        setProducts(prev)
        setSaving(false)
        toast('error', 'Gagal simpan produk: ' + res.error.message)
        return
      }
    } else {
      // CREATE optimistic: item id sementara masuk UI dulu, diganti id asli dari server
      const tempId = crypto.randomUUID()
      const tempItem = { id: tempId, ...(payload as Record<string, unknown>) } as Product
      setProducts((curr) => [tempItem, ...curr])
      const res = await supabase.from('products').insert(payload).select('id').single()
      if (res.error) {
        setProducts((curr) => curr.filter((p) => p.id !== tempId))
        setSaving(false)
        toast('error', 'Gagal simpan produk: ' + res.error.message)
        return
      }
      if (res.data?.id) {
        setProducts((curr) => curr.map((p) => (p.id === tempId ? { ...p, id: res.data.id } : p)))
      }
    }
    setSaving(false)
    setShowForm(false)
    toast('success', editProduct ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan')
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus produk ini?')) return
    // Optimistic update: hapus dari UI dulu, rollback kalau server error
    const prev = products
    setProducts((curr) => curr.filter((p) => p.id !== id))
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      setProducts(prev)
      toast('error', 'Gagal hapus: ' + error.message)
      return
    }
    toast('success', 'Produk berhasil dihapus')
  }

  return (
    <div>
      <PageHeader title="Produk" subtitle="Kelola katalog produk KJ Homedecor" />

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '0.75rem'
        }}
      >
        <button
          onClick={() => setActiveTab('gorden')}
          style={{
            padding: '0.5rem 1.25rem',
            border: 'none',
            borderRadius: '0.5rem 0.5rem 0 0',
            fontWeight: '600',
            fontSize: '0.875rem',
            cursor: 'pointer',
            background: activeTab === 'gorden' ? '#cc7030' : 'var(--neutral-100)',
            color: activeTab === 'gorden' ? '#fff' : 'var(--neutral-600)'
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
            background: activeTab === 'perabot' ? '#cc7030' : 'var(--neutral-100)',
            color: activeTab === 'perabot' ? '#fff' : 'var(--neutral-600)'
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
            background: activeTab === 'all' ? '#cc7030' : 'var(--neutral-100)',
            color: activeTab === 'all' ? '#fff' : 'var(--neutral-600)'
          }}
        >
          Semua
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--neutral-400)'
            }}
          />
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
              outline: 'none'
            }}
          />
        </div>
        <button
          onClick={handleDownloadTemplate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.625rem 1rem',
            background: 'var(--surface)',
            color: 'var(--neutral-700)',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          <Download size={14} /> Template
        </button>
        <button
          onClick={handleExport}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.625rem 1rem',
            background: 'var(--surface)',
            color: 'var(--neutral-700)',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          <Download size={14} /> Export
        </button>
        <button
          onClick={() => setImportModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.625rem 1rem',
            background: 'var(--surface)',
            color: 'var(--neutral-700)',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          <Upload size={14} /> Import
        </button>
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
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          <Plus size={16} /> Tambah Produk
        </button>
      </div>

      {/* Table */}
      {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem' }}>
            <TableSkeleton rows={4} cols={3} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="📦" title="Belum ada produk" description="Tambah produk baru dengan tombol di atas." />
        ) : (
          <MobileCards
            items={filtered}
            keyOf={(p) => p.id}
            renderCard={(p) => (
              <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Produk</span>
                  <span className="mobile-card-value">{p.name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">SKU</span>
                  <span className="mobile-card-value" style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: '400' }}>
                    {p.sku || '—'}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Harga</span>
                  <span className="mobile-card-value" style={{ color: '#cc7030' }}>
                    {formatRp(p.price)}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Stok Toko</span>
                  <span className="mobile-card-value">{p.stock_toko}</span>
                </div>
                <div className="mobile-card-actions">
                  <button onClick={() => openEdit(p)} style={{ background: 'var(--neutral-100)', color: 'var(--neutral-700)', border: 'none', cursor: 'pointer' }}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button onClick={() => handleDelete(p.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={13} /> Hapus
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </div>
      <div className="data-table desktop-only">
        {loading ? (
          <div style={{ padding: '1.5rem' }}>
            <TableSkeleton rows={8} cols={7} />
          </div>
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
                        <img
                          src={p.images[0]}
                          alt=""
                          style={{
                            width: 36,
                            height: 36,
                            objectFit: 'cover',
                            borderRadius: '0.375rem',
                            border: '1px solid #e5e7eb'
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            background: 'var(--neutral-100)',
                            borderRadius: '0.375rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--neutral-400)',
                            fontSize: '0.75rem'
                          }}
                        >
                          📷
                        </div>
                      )}
                      <span style={{ fontWeight: '500' }}>{p.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--neutral-600)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.sku ?? '—'}</td>
                  <td style={{ color: 'var(--neutral-600)' }}>{p.kode_kain ?? '—'}</td>
                  <td style={{ fontWeight: '600', color: '#cc7030' }}>{formatRp(p.price)}</td>
                  <td>{p.stock_toko}</td>
                  <td>
                    {p.is_featured && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          background: '#fef3c7',
                          color: '#92400e',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}
                      >
                        <Star size={10} /> Unggulan
                      </span>
                    )}
                    {p.is_custom && (
                      <span
                        style={{
                          background: '#e0e7ff',
                          color: '#3730a3',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          marginLeft: '0.25rem'
                        }}
                      >
                        Custom
                      </span>
                    )}
                    {p.is_catalog_visible === false && (
                      <span
                        style={{
                          background: 'var(--neutral-100)',
                          color: 'var(--neutral-600)',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          marginLeft: '0.25rem'
                        }}
                      >
                        Internal
                      </span>
                    )}
                  </td>
                  <td>
                    <ActionMenu
                      items={[
                        { label: 'Edit', icon: <Pencil size={14} />, onClick: () => openEdit(p) },
                        { label: 'Hapus', icon: <Trash2 size={14} />, onClick: () => handleDelete(p.id), danger: true }
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
          onPageChange={setCurrentPage}
          pageSize={PAGE_SIZE}
          onPageSizeChange={(s) => {
            setPageSize(s)
            setCurrentPage(1)
          }}
          totalItems={totalCount}
          startIndex={(currentPage - 1) * PAGE_SIZE + 1}
          endIndex={Math.min(currentPage * PAGE_SIZE, totalCount)}
        />
      )}

      {/* Modal Form */}
      <Modal open={showForm} onClose={() => setShowForm(false)} maxWidth={520} padding="2rem" zIndex={200}>
        <style>{`
              .product-form-modal input[type=radio],
              .product-form-modal input[type=checkbox] {
                width: 14px;
                height: 14px;
                accent-color: #cc7030;
                cursor: pointer;
                flex-shrink: 0;
              }
            `}</style>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>
          {editProduct ? 'Edit Produk' : 'Tambah Produk'}
        </h2>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(
            [
              { label: 'Nama Produk *', id: 'name', placeholder: 'Atlas 59-1 Smokering' },
              { label: 'SKU', id: 'sku', placeholder: 'SKU-001' },
              { label: 'Kode Kain', id: 'kode_kain', placeholder: 'ATL-59' }
            ] as Field[]
          ).map((field) => (
            <div key={field.id}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: 'var(--neutral-700)',
                  marginBottom: '0.3rem'
                }}
              >
                {field.label}
              </label>
              <input
                type={field.type ?? 'text'}
                required={field.label.includes('*')}
                placeholder={field.placeholder}
                value={(form as unknown as Record<string, string | string[] | boolean>)[field.id] as string}
                onChange={(e) => setForm((f) => ({ ...f, [field.id]: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>
          ))}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'var(--neutral-700)',
                marginBottom: '0.3rem'
              }}
            >
              Kategori
            </label>
            <select
              value={form.category_id}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                background: 'var(--surface)'
              }}
            >
              <option value="">— Pilih Kategori —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {(
            [
              { label: 'Harga Jual (Rp) *', id: 'price', placeholder: '250000', type: 'number' },
              { label: 'Stok Toko', id: 'stock_toko', placeholder: '0', type: 'number' }
            ] as Field[]
          ).map((field) => (
            <div key={field.id}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: 'var(--neutral-700)',
                  marginBottom: '0.3rem'
                }}
              >
                {field.label}
              </label>
              <input
                type={field.type ?? 'text'}
                required={field.label.includes('*')}
                placeholder={field.placeholder}
                value={(form as unknown as Record<string, string | string[] | boolean>)[field.id] as string}
                onChange={(e) => setForm((f) => ({ ...f, [field.id]: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>
          ))}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'var(--neutral-700)',
                marginBottom: '0.3rem'
              }}
            >
              Deskripsi
            </label>
            <textarea
              placeholder="Deskripsi produk (opsional)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <input
                type="radio"
                name="product_type"
                checked={form.product_type === 'gorden'}
                onChange={() => setForm((f) => ({ ...f, product_type: 'gorden' }))}
              />
              Tipe Gorden
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <input
                type="radio"
                name="product_type"
                checked={form.product_type === 'perabot'}
                onChange={() => setForm((f) => ({ ...f, product_type: 'perabot' }))}
              />
              Tipe Perabot
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
              />
              Produk Unggulan
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={form.is_custom}
                onChange={(e) => setForm((f) => ({ ...f, is_custom: e.target.checked }))}
              />
              Custom Order
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={form.is_catalog_visible}
                onChange={(e) => setForm((f) => ({ ...f, is_catalog_visible: e.target.checked }))}
              />
              Tampil di Katalog
            </label>
          </div>

          {/* Color Variants for Perabot */}
          {form.product_type === 'perabot' && (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: 'var(--neutral-700)',
                  marginBottom: '0.3rem'
                }}
              >
                Warna Variants (Perabot) - pisahkan dengan koma
              </label>
              <input
                type="text"
                placeholder="Contoh: Hitam, Silver, Merah"
                value={form.color_variants}
                onChange={(e) => setForm((f) => ({ ...f, color_variants: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* Shipping Dimensions */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'var(--neutral-700)',
                marginBottom: '0.5rem'
              }}
            >
              Dimensi & Berat (untuk ongkir)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--neutral-600)' }}>Panjang (cm)</label>
                <input
                  type="number"
                  placeholder="P"
                  value={form.dimension_p}
                  onChange={(e) => setForm((f) => ({ ...f, dimension_p: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--neutral-600)' }}>Lebar (cm)</label>
                <input
                  type="number"
                  placeholder="L"
                  value={form.dimension_l}
                  onChange={(e) => setForm((f) => ({ ...f, dimension_l: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--neutral-600)' }}>Tinggi (cm)</label>
                <input
                  type="number"
                  placeholder="T"
                  value={form.dimension_t}
                  onChange={(e) => setForm((f) => ({ ...f, dimension_t: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--neutral-600)' }}>Berat (kg)</label>
                <input
                  type="number"
                  placeholder="Kg"
                  value={form.weight}
                  onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'var(--neutral-700)',
                marginBottom: '0.5rem'
              }}
            >
              Foto Produk
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {form.images.map((img, i) => (
                <div
                  key={i}
                  style={{
                    position: 'relative',
                    width: 72,
                    height: 72,
                    borderRadius: '0.5rem',
                    overflow: 'hidden',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, j) => j !== i) }))}
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      background: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: 18,
                      height: 18,
                      cursor: 'pointer',
                      fontSize: '0.65rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <label
                style={{
                  width: 72,
                  height: 72,
                  border: '2px dashed #d1d5db',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--neutral-400)',
                  fontSize: '0.75rem',
                  textAlign: 'center'
                }}
              >
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
                    try {
                      const fd = new FormData()
                      fd.append('file', file)
                      fd.append('folder', 'products')
                      const res = await fetch('/api/upload', { method: 'POST', body: fd })
                      const json = await res.json().catch(() => null)
                      if (json?.success) {
                        setForm((f) => ({ ...f, images: [...f.images, json.url] }))
                      } else {
                        toast('error', 'Gagal upload gambar: ' + (json?.error ?? `HTTP ${res.status}`))
                      }
                    } catch (err) {
                      console.error('Upload gambar produk gagal:', err)
                      toast('error', '⚠️ Gagal upload gambar: ' + (err instanceof Error ? err.message : String(err)))
                    }
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>PNG, JPG, WebP — maks 5MB per foto</p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                background: 'var(--surface)',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#cc7030',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
      {/* Import Modal */}
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        columns={IMPORT_COLUMNS}
        resolveField={resolveProductField}
        onImport={handleImport}
        entityName="Produk"
      />
    </div>
  )
}
