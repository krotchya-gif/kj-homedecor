'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, Package, AlertTriangle, ChevronLeft, ChevronRight, Download, Upload } from 'lucide-react'
import type { Material } from '@/types'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import ImportModal from '@/components/ui/ImportModal'
import { exportToCSV, generateCSVTemplate } from '@/lib/csv'

const PAGE_SIZE = 20

const IMPORT_COLUMNS = [
  { key: 'name', label: 'Nama Material', required: true },
  { key: 'unit', label: 'Unit', aliases: ['satuan'] },
  { key: 'cost_per_unit', label: 'Harga Per Unit', aliases: ['harga', 'cost'] },
  { key: 'stock_gudang', label: 'Stok Gudang' },
  { key: 'stock_toko', label: 'Stok Toko' },
  { key: 'min_stock_level', label: 'Min Stok', aliases: ['minimum'] },
  { key: 'supplier_name', label: 'Supplier', aliases: ['nama_supplier', 'vendor'] }
]

const EXPORT_COLUMNS = [
  { key: 'name', label: 'Nama' },
  { key: 'unit', label: 'Unit' },
  { key: 'cost_per_unit', label: 'Harga' },
  { key: 'stock_gudang', label: 'Stok Gudang' },
  { key: 'stock_toko', label: 'Stok Toko' },
  { key: 'min_stock_level', label: 'Min Stok' }
]

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({
    name: '',
    unit: 'meter',
    cost_per_unit: '',
    stock_gudang: '',
    stock_toko: '',
    min_stock_level: ''
  })

  const supabase = createClient()

  async function fetchMaterials() {
    setLoading(true)
    const from = (currentPage - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const [dataResult, countResult] = await Promise.all([
      supabase
        .from('materials')
        .select('*, supplier:suppliers(name)', { count: 'exact' })
        .order('name')
        .range(from, to),
      supabase.from('materials').select('id', { count: 'exact', head: true })
    ])

    setMaterials((dataResult.data as Material[]) ?? [])
    setTotalCount(countResult.count ?? 0)
    setLoading(false)
  }

  useEffect(() => {
    fetchMaterials()
    supabase
      .from('suppliers')
      .select('id, name')
      .then(({ data }) => setSuppliers(data ?? []))
  }, [currentPage])

  function getSupplierId(name: string): string | null {
    if (!name) return null
    const s = suppliers.find((s) => s.name.toLowerCase() === name.toLowerCase())
    return s?.id ?? null
  }

  function resolveMaterialField(key: string, value: string): string | number | null {
    if (!value && value !== '0') return null
    if (key === 'supplier_name') return getSupplierId(value)
    if (key === 'cost_per_unit' || key === 'stock_gudang' || key === 'stock_toko' || key === 'min_stock_level') {
      const n = parseFloat(value)
      return isNaN(n) ? null : n
    }
    return value
  }

  function handleExport() {
    exportToCSV(materials as any, EXPORT_COLUMNS)
  }

  function handleDownloadTemplate() {
    generateCSVTemplate(IMPORT_COLUMNS)
  }

  async function handleImport(rows: Record<string, string | number | null>[]) {
    const errors: string[] = []
    let inserted = 0
    const BATCH = 50
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      for (const row of batch) {
        const supplierId = getSupplierId(String(row.supplier_name ?? ''))
        const { error } = await supabase.from('materials').insert({
          name: String(row.name ?? ''),
          unit: String(row.unit ?? 'meter'),
          cost_per_unit: Number(row.cost_per_unit) || 0,
          stock_gudang: Number(row.stock_gudang) || 0,
          stock_toko: Number(row.stock_toko) || 0,
          min_stock_level: Number(row.min_stock_level) || 0,
          supplier_id: supplierId
        })
        if (error) errors.push(`Row ${i + 1}: ${error.message}`)
        else inserted++
      }
    }
    fetchMaterials()
    return { inserted, updated: 0, errors }
  }

  const filtered = materials.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('materials').insert({
      name: form.name,
      unit: form.unit,
      cost_per_unit: Number(form.cost_per_unit),
      stock_gudang: Number(form.stock_gudang) || 0,
      stock_toko: Number(form.stock_toko) || 0,
      min_stock_level: Number(form.min_stock_level) || 0
    })
    setSaving(false)
    setShowForm(false)
    setForm({ name: '', unit: 'meter', cost_per_unit: '', stock_gudang: '', stock_toko: '', min_stock_level: '' })
    fetchMaterials()
  }

  return (
    <div>
      <PageHeader title="BOM & Material" subtitle="Database bahan baku dan Bill of Materials" />

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af'
            }}
          />
          <input
            type="text"
            placeholder="Cari material..."
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
            background: '#fff',
            color: '#374151',
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
            background: '#fff',
            color: '#374151',
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
            background: '#fff',
            color: '#374151',
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
          onClick={() => setShowForm(true)}
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
          <Plus size={16} /> Tambah
        </button>
      </div>

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '1.5rem' }}>
            <TableSkeleton rows={8} cols={6} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="📦" title="Belum ada material" description="Tambah material baru dengan tombol di atas." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nama Material</th>
                <th>Satuan</th>
                <th>Harga/Satuan</th>
                <th>Stok Gudang</th>
                <th>Stok Toko</th>
                <th>Min. Stok</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const isLow = m.stock_gudang < m.min_stock_level
                return (
                  <tr key={m.id}>
                    <td style={{ fontWeight: '500' }}>{m.name}</td>
                    <td style={{ color: '#6b7280' }}>{m.unit}</td>
                    <td style={{ fontWeight: '600', color: '#cc7030' }}>{formatRp(m.cost_per_unit)}</td>
                    <td>{m.stock_gudang}</td>
                    <td>{m.stock_toko}</td>
                    <td>{m.min_stock_level}</td>
                    <td>
                      {isLow ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            background: '#fef2f2',
                            color: '#dc2626',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}
                        >
                          <AlertTriangle size={10} /> Stok Rendah
                        </span>
                      ) : (
                        <span
                          style={{
                            background: '#f0fdf4',
                            color: '#166534',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}
                        >
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '1rem',
            padding: '0.75rem 0',
            borderTop: '1px solid #e5e7eb'
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            Halaman {currentPage} dari {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))} — {totalCount} material
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                background: '#fff',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                color: currentPage === 1 ? '#9ca3af' : '#374151'
              }}
            >
              <ChevronLeft size={14} /> Sebelumnya
            </button>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                background: '#fff',
                cursor: currentPage >= Math.ceil(totalCount / PAGE_SIZE) ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                color: currentPage >= Math.ceil(totalCount / PAGE_SIZE) ? '#9ca3af' : '#374151'
              }}
            >
              Selanjutnya <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForm(false)
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '0.875rem',
              padding: '2rem',
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)'
            }}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Tambah Material</h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.3rem'
                  }}
                >
                  Nama Material *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Kain Atlas 59-1"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.3rem'
                    }}
                  >
                    Satuan
                  </label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      background: '#fff'
                    }}
                  >
                    <option value="meter">Meter</option>
                    <option value="pcs">Pcs</option>
                    <option value="set">Set</option>
                    <option value="glb">Gulung</option>
                    <option value="kg">Kg</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.3rem'
                    }}
                  >
                    Harga/Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.cost_per_unit}
                    onChange={(e) => setForm((f) => ({ ...f, cost_per_unit: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                {[
                  { label: 'Stok Gudang', id: 'stock_gudang' },
                  { label: 'Stok Toko', id: 'stock_toko' },
                  { label: 'Min. Stok', id: 'min_stock_level' }
                ].map((f) => (
                  <div key={f.id}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.3rem'
                      }}
                    >
                      {f.label}
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={(form as Record<string, string>)[f.id]}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.id]: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                ))}
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
                    background: '#fff',
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
          </div>
        </div>
      )}
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        columns={IMPORT_COLUMNS}
        resolveField={resolveMaterialField}
        onImport={handleImport}
        entityName="Material"
      />
    </div>
  )
}
