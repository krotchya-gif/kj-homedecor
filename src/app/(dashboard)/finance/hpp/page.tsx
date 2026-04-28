'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Calculator, Plus, Trash2, AlertTriangle } from 'lucide-react'

const fmt  = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
const fmtN = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n)

export default function HPPPage() {
  const [products,  setProducts]  = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [boms,      setBoms]      = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)

  // Selected product for calc
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [markup,    setMarkup]    = useState(30) // % markup
  const [extraCost, setExtraCost] = useState(0)  // production cost manual

  // Manual BOM lines (in-session, not saved unless clicked)
  const [lines, setLines] = useState<{ material_id: string; qty: number }[]>([])
  const [showAddLine, setShowAddLine] = useState(false)
  const [newLine, setNewLine] = useState({ material_id: '', qty: '' })

  const supabase = createClient()

  async function load() {
    setLoading(true)
    const [pRes, mRes, bRes] = await Promise.all([
      supabase.from('products').select('id, name, sku, price, hpp_calculated, hpp_manual').order('name'),
      supabase.from('materials').select('id, name, unit, cost_per_unit').order('name'),
      supabase.from('bom').select('product_id, material_id, qty_per_unit, material:materials(name, unit, cost_per_unit)'),
    ])
    setProducts(pRes.data ?? [])
    setMaterials(mRes.data ?? [])
    setBoms(bRes.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // Manual override mode
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [manualHpp, setManualHpp] = useState(0)

  // When product changes, auto-load BOM lines
  function selectProduct(productId: string) {
    const p = products.find(x => x.id === productId)
    setSelectedProduct(p ?? null)
    const productBom = boms.filter(b => b.product_id === productId)
    setLines(productBom.map(b => ({ material_id: b.material_id, qty: b.qty_per_unit })))
    setMarkup(30)
    setExtraCost(0)
    setMode(p?.hpp_manual ? 'manual' : 'auto')
    setManualHpp(p?.hpp_manual ?? 0)
  }

  function getMaterial(id: string) {
    return materials.find(m => m.id === id)
  }

  // Calculate HPP
  const materialCost = lines.reduce((sum, line) => {
    const mat = getMaterial(line.material_id)
    return sum + (mat?.cost_per_unit ?? 0) * line.qty
  }, 0)
  const autoHpp       = materialCost + extraCost
  const effectiveHpp  = mode === 'manual' ? manualHpp : autoHpp
  const hargaJual     = effectiveHpp * (1 + markup / 100)
  const margin        = hargaJual - effectiveHpp
  const marginPct     = effectiveHpp > 0 ? (margin / effectiveHpp) * 100 : 0

  function addLine() {
    if (!newLine.material_id || !newLine.qty) return
    setLines(prev => [...prev, { material_id: newLine.material_id, qty: Number(newLine.qty) }])
    setNewLine({ material_id: '', qty: '' })
    setShowAddLine(false)
  }

  function removeLine(idx: number) {
    setLines(prev => prev.filter((_, i) => i !== idx))
  }

  async function saveBOM() {
    if (!selectedProduct) return
    // Delete old BOM for this product
    await supabase.from('bom').delete().eq('product_id', selectedProduct.id)
    // Insert new lines
    if (lines.length > 0) {
      await supabase.from('bom').insert(
        lines.map(l => ({ product_id: selectedProduct.id, material_id: l.material_id, qty_per_unit: l.qty }))
      )
    }
    // Update product: hpp_calculated (auto), hpp_manual (if manual mode), price
    await supabase.from('products').update({
      hpp_calculated: Math.round(autoHpp),
      hpp_manual: mode === 'manual' ? Math.round(manualHpp) : null,
      price: Math.round(hargaJual),
    }).eq('id', selectedProduct.id)
    alert(`BOM disimpan & harga jual produk diupdate ke ${fmt(Math.round(hargaJual))}`)
    load()
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">HPP Calculator</h1>
        <p className="page-subtitle">Hitung Harga Pokok Produksi dari BOM + production cost + markup</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* Left — BOM editor */}
        <div>
          {/* Product selector */}
          <div className="form-section" style={{ marginBottom: '1rem' }}>
            <div className="form-section-title">Pilih Produk</div>
            <select value={selectedProduct?.id ?? ''} onChange={e => selectProduct(e.target.value)}
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }}>
              <option value="">— Pilih produk —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>)}
            </select>
            {selectedProduct && (
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem', color: '#6b7280' }}>
                <div>Harga jual saat ini: <strong style={{ color: '#cc7030' }}>{fmt(selectedProduct.price)}</strong></div>
                {selectedProduct.hpp_calculated > 0 && (
                  <div>HPP kalkulasi: <span style={{ color: '#059669', fontWeight: '600' }}>{fmt(selectedProduct.hpp_calculated)}</span></div>
                )}
                {selectedProduct.hpp_manual && (
                  <div>HPP manual: <span style={{ color: '#7c3aed', fontWeight: '600' }}>{fmt(selectedProduct.hpp_manual)}</span></div>
                )}
              </div>
            )}
          </div>

          {/* Mode toggle */}
          {selectedProduct && (
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              {[
                { value: 'auto', label: '🔢 Auto (BOM)', desc: 'HPP dihitung dari material + biaya produksi' },
                { value: 'manual', label: '✏️ Manual', desc: 'Input HPP langsung (override)' },
              ].map(opt => (
                <label key={opt.value} onClick={() => { setMode(opt.value as 'auto' | 'manual'); if (opt.value === 'manual') setManualHpp(selectedProduct.hpp_calculated ?? 0) }}
                  style={{ flex: 1, cursor: 'pointer', border: `2px solid ${mode === opt.value ? '#cc7030' : '#e5e7eb'}`, borderRadius: '0.5rem', padding: '0.75rem', background: mode === opt.value ? '#fff8f2' : '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <input type="radio" name="hppMode" value={opt.value} checked={mode === opt.value} onChange={() => {}} style={{ accentColor: '#cc7030' }} />
                    <span style={{ fontWeight: '700', fontSize: '0.875rem' }}>{opt.label}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{opt.desc}</div>
                </label>
              ))}
            </div>
          )}

          {/* Manual HPP input */}
          {selectedProduct && mode === 'manual' && (
            <div style={{ marginBottom: '1rem', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '0.5rem', padding: '0.875rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#6b21a8', marginBottom: '0.4rem' }}>HPP Manual (Rp) *</label>
              <input type="number" min="0" value={manualHpp || ''} onChange={e => setManualHpp(Number(e.target.value))}
                placeholder={fmt(autoHpp)}
                style={{ width: '100%', padding: '0.625rem', border: '1px solid #c4b5fd', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }} />
              <div style={{ fontSize: '0.72rem', color: '#7c3aed', marginTop: '0.25rem' }}>Gunakan nilai ini sebagai HPP, bukan dari BOM.</div>
            </div>
          )}

          {/* BOM Lines */}
          <div className="form-section" style={{ marginBottom: '1rem' }}>
            <div className="form-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Bill of Materials</span>
              <button onClick={() => setShowAddLine(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cc7030', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', fontWeight: '600' }}>
                <Plus size={13} /> Tambah
              </button>
            </div>

            {lines.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                Belum ada material. Pilih produk atau tambah manual.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {lines.map((line, idx) => {
                  const mat = getMaterial(line.material_id)
                  const cost = (mat?.cost_per_unit ?? 0) * line.qty
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f9fafb', borderRadius: '0.5rem', padding: '0.625rem 0.875rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{mat?.name ?? '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{fmtN(line.qty)} {mat?.unit} × {fmt(mat?.cost_per_unit ?? 0)}</div>
                      </div>
                      <div style={{ fontWeight: '700', color: '#cc7030', fontSize: '0.875rem', minWidth: 90, textAlign: 'right' }}>{fmt(cost)}</div>
                      <button onClick={() => removeLine(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0.25rem' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {showAddLine && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'flex-end' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>Material</label>
                  <select value={newLine.material_id} onChange={e => setNewLine(f => ({ ...f, material_id: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.8rem', outline: 'none', background: '#fff' }}>
                    <option value="">— Pilih —</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>Qty</label>
                  <input type="number" step="0.01" min="0" placeholder="0" value={newLine.qty} onChange={e => setNewLine(f => ({ ...f, qty: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.8rem', outline: 'none' }} />
                </div>
                <button onClick={addLine} style={{ padding: '0.5rem 0.875rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.375rem', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer' }}>+</button>
                <button onClick={() => setShowAddLine(false)} style={{ padding: '0.5rem 0.875rem', background: '#f3f4f6', border: 'none', borderRadius: '0.375rem', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer' }}>✕</button>
              </div>
            )}
          </div>

          {/* Extra cost & markup */}
          <div className="form-section">
            <div className="form-section-title">Biaya Produksi & Markup</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Biaya Produksi/Jasa (Rp)</label>
                <input type="number" min="0" value={extraCost} onChange={e => setExtraCost(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.25rem' }}>Upah jahit, ongkos pasang, dll.</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Markup (%)</label>
                <input type="number" min="0" max="1000" value={markup} onChange={e => setMarkup(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right — Result panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Summary card */}
          <div style={{ background: 'linear-gradient(135deg, #1a0a00, #3d1a08)', borderRadius: '1rem', padding: '1.75rem', color: '#fff' }}>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.25rem' }}>
              {selectedProduct?.name ?? 'Pilih produk dulu'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'Biaya Material',    val: fmt(materialCost), small: true },
                { label: 'Biaya Produksi',    val: fmt(extraCost),    small: true },
                { label: mode === 'manual' ? 'HPP Manual' : 'HPP Auto (BOM)', val: fmt(effectiveHpp), highlight: '#f4a857' },
                { label: `Markup ${markup}%`, val: fmt(margin),       small: true },
                { label: 'Harga Jual',        val: fmt(hargaJual),    highlight: '#fff', big: true },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: row.big ? 'none' : '1px solid rgba(255,255,255,0.08)', paddingBottom: row.big ? 0 : '0.625rem' }}>
                  <span style={{ fontSize: row.big ? '1rem' : '0.85rem', color: row.small ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.85)', fontWeight: row.big ? '700' : '400' }}>
                    {row.label}
                  </span>
                  <span style={{ fontSize: row.big ? '1.5rem' : '0.95rem', fontWeight: row.big ? '800' : '600', color: row.highlight ?? (row.small ? 'rgba(255,255,255,0.7)' : '#fff'), fontFamily: row.big ? 'Playfair Display,serif' : 'inherit' }}>
                    {row.val}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.06)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Margin aktual</span>
              <span style={{ fontWeight: '700', color: marginPct >= 20 ? '#4ade80' : marginPct >= 10 ? '#fbbf24' : '#f87171' }}>
                {marginPct.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Margin indicator */}
          {marginPct < 15 && effectiveHpp > 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.5rem', padding: '0.75rem', display: 'flex', gap: '0.5rem', fontSize: '0.82rem', color: '#92400e' }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              Margin di bawah 15% — pertimbangkan naikkan harga atau kurangi biaya.
            </div>
          )}

          {/* Save button */}
          {selectedProduct && (
            <button onClick={saveBOM}
              style={{ padding: '1rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.625rem', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Calculator size={18} /> Simpan BOM & Update Harga Jual
            </button>
          )}

          {/* Quick guide */}
          <div style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '1rem', fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.7 }}>
            <strong style={{ color: '#374151', display: 'block', marginBottom: '0.375rem' }}>📌 Panduan</strong>
            1. Pilih produk → BOM otomatis dimuat<br />
            2. Edit atau tambah material sesuai kebutuhan<br />
            3. Isi biaya produksi/jasa jika ada<br />
            4. Set markup % → harga jual otomatis terhitung<br />
            5. Klik Simpan → BOM tersimpan & harga produk terupdate
          </div>
        </div>
      </div>
    </div>
  )
}
