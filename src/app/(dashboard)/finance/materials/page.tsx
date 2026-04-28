'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, Package, AlertTriangle } from 'lucide-react'
import type { Material } from '@/types'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', unit: 'meter', cost_per_unit: '', stock_gudang: '', stock_toko: '', min_stock_level: '',
  })

  const supabase = createClient()

  async function fetchMaterials() {
    setLoading(true)
    const { data } = await supabase.from('materials').select('*, supplier:suppliers(name)').order('name')
    setMaterials((data as Material[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchMaterials() }, [])

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
      min_stock_level: Number(form.min_stock_level) || 0,
    })
    setSaving(false)
    setShowForm(false)
    setForm({ name: '', unit: 'meter', cost_per_unit: '', stock_gudang: '', stock_toko: '', min_stock_level: '' })
    fetchMaterials()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">BOM & Material</h1>
        <p className="page-subtitle">Database bahan baku dan Bill of Materials</p>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="Cari material..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '0.625rem 1rem 0.625rem 2.25rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}>
          <Plus size={16} /> Tambah Material
        </button>
      </div>

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <Package size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada material</p>
          </div>
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
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: '#fef2f2', color: '#dc2626', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600' }}>
                          <AlertTriangle size={10} /> Stok Rendah
                        </span>
                      ) : (
                        <span style={{ background: '#f0fdf4', color: '#166534', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600' }}>OK</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ background: '#fff', borderRadius: '0.875rem', padding: '2rem', width: '100%', maxWidth: 480, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Tambah Material</h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Nama Material *</label>
                <input required type="text" placeholder="Kain Atlas 59-1" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Satuan</label>
                  <select value={form.unit} onChange={(e) => setForm(f => ({ ...f, unit: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }}>
                    <option value="meter">Meter</option>
                    <option value="pcs">Pcs</option>
                    <option value="set">Set</option>
                    <option value="glb">Gulung</option>
                    <option value="kg">Kg</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Harga/Satuan (Rp)</label>
                  <input type="number" placeholder="0" value={form.cost_per_unit} onChange={(e) => setForm(f => ({ ...f, cost_per_unit: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                {[
                  { label: 'Stok Gudang', id: 'stock_gudang' },
                  { label: 'Stok Toko', id: 'stock_toko' },
                  { label: 'Min. Stok', id: 'min_stock_level' },
                ].map((f) => (
                  <div key={f.id}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>{f.label}</label>
                    <input type="number" placeholder="0" value={(form as Record<string, string>)[f.id]} onChange={(e) => setForm(prev => ({ ...prev, [f.id]: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: '#fff', cursor: 'pointer', fontWeight: '600' }}>Batal</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.75rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '600' }}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
