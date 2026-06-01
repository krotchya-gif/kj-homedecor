'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Package, AlertTriangle, ChevronLeft, ChevronRight, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, CheckCircle2 } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

const PAGE_SIZE = 20

export default function GudangStockPage() {
  const [materials, setMaterials] = useState<any[]>([])
  const [products, setProducts]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<'materials'|'products'|'mutasi'>('materials')
  const [search, setSearch]       = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalCountProd, setTotalCountProd] = useState(0)
  const supabase = createClient()

  // Mutasi form state
  const [mutasiType, setMutasiType] = useState<'in'|'out'|'transfer'>('in')
  const [mutasiMaterial, setMutasiMaterial] = useState('')
  const [mutasiQty, setMutasiQty] = useState('')
  const [mutasiLocation, setMutasiLocation] = useState<'gudang'|'toko'>('gudang')
  const [mutasiFrom, setMutasiFrom] = useState<'gudang'|'toko'>('gudang')
  const [mutasiTo, setMutasiTo] = useState<'gudang'|'toko'>('toko')
  const [mutasiReason, setMutasiReason] = useState('')
  const [mutasiNotes, setMutasiNotes] = useState('')
  const [savingMutasi, setSavingMutasi] = useState(false)
  const [mutasiSuccess, setMutasiSuccess] = useState(false)

  async function load() {
    setLoading(true)
    const from = (currentPage - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const [mRes, pRes, mCountRes, pCountRes] = await Promise.all([
      supabase.from('materials').select('*, supplier:suppliers(name)', { count: 'exact' }).order('name').range(from, to),
      supabase.from('products').select('*, category:categories(name)', { count: 'exact' }).order('name').range(from, to),
      supabase.from('materials').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
    ])
    setMaterials(mRes.data ?? [])
    setTotalCount(mCountRes.count ?? 0)
    setProducts(pRes.data ?? [])
    setTotalCountProd(pCountRes.count ?? 0)
    setLoading(false)
  }
  useEffect(() => { load() }, [currentPage, tab])

  async function handleMutasiSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!mutasiMaterial || !mutasiQty) return
    setSavingMutasi(true)
    const qty = Number(mutasiQty)
    const { data: { user } } = await supabase.auth.getUser()
    const reason = mutasiReason || (mutasiType === 'in' ? 'Restock' : mutasiType === 'out' ? 'Adjustment' : 'Transfer')

    try {
      if (mutasiType === 'in') {
        const field = mutasiLocation === 'gudang' ? 'stock_gudang' : 'stock_toko'
        const { data: mat } = await supabase.from('materials').select('stock_gudang, stock_toko').eq('id', mutasiMaterial).single()
        const matAny = mat as any
        await supabase.from('materials').update({ [field]: (matAny?.[field] ?? 0) + qty }).eq('id', mutasiMaterial)
        await supabase.from('inventory_movements').insert({
          material_id: mutasiMaterial,
          type: 'in',
          qty,
          to_location: mutasiLocation,
          reason,
          notes: mutasiNotes || null,
          created_by: user?.id ?? null,
        })
      } else if (mutasiType === 'out') {
        const field = mutasiLocation === 'gudang' ? 'stock_gudang' : 'stock_toko'
        const { data: mat } = await supabase.from('materials').select('stock_gudang, stock_toko').eq('id', mutasiMaterial).single()
        const matAny = mat as any
        const newQty = Math.max(0, (matAny?.[field] ?? 0) - qty)
        await supabase.from('materials').update({ [field]: newQty }).eq('id', mutasiMaterial)
        await supabase.from('inventory_movements').insert({
          material_id: mutasiMaterial,
          type: 'out',
          qty,
          from_location: mutasiLocation,
          reason,
          notes: mutasiNotes || null,
          created_by: user?.id ?? null,
        })
      } else {
        // Transfer — always select both columns, then compute which to update
        const { data: mat } = await supabase.from('materials').select('stock_gudang, stock_toko').eq('id', mutasiMaterial).single()
        const matAny = mat as any
        const fromField = mutasiFrom === 'gudang' ? 'stock_gudang' : 'stock_toko'
        const toField = mutasiTo === 'gudang' ? 'stock_gudang' : 'stock_toko'
        await supabase.from('materials').update({
          [fromField]: Math.max(0, (matAny?.[fromField] ?? 0) - qty),
          [toField]: (matAny?.[toField] ?? 0) + qty,
        }).eq('id', mutasiMaterial)
        await supabase.from('inventory_movements').insert({
          material_id: mutasiMaterial,
          type: 'transfer_out',
          qty,
          from_location: mutasiFrom,
          to_location: mutasiTo,
          reason,
          notes: mutasiNotes || null,
          created_by: user?.id ?? null,
        })
        await supabase.from('inventory_movements').insert({
          material_id: mutasiMaterial,
          type: 'transfer_in',
          qty,
          from_location: mutasiFrom,
          to_location: mutasiTo,
          reason,
          notes: mutasiNotes || null,
          created_by: user?.id ?? null,
        })
      }
      setMutasiSuccess(true)
      setTimeout(() => setMutasiSuccess(false), 2500)
      setMutasiQty('')
      setMutasiReason('')
      setMutasiNotes('')
      setMutasiMaterial('')
    } finally {
      setSavingMutasi(false)
    }
  }

  function resetMutasiForm() {
    setMutasiType('in')
    setMutasiMaterial('')
    setMutasiQty('')
    setMutasiLocation('gudang')
    setMutasiFrom('gudang')
    setMutasiTo('toko')
    setMutasiReason('')
    setMutasiNotes('')
  }

  const filteredMat  = materials.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
  const filteredProd = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Posisi Stok</h1>
        <p className="page-subtitle">Stok Gudang vs Stok Toko — terpisah, tidak double-count</p>
      </div>

      <div style={{ display:'flex', gap:'0', borderBottom:'2px solid #e5e7eb', marginBottom:'1.5rem' }}>
        {(['materials','products','mutasi'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ padding:'0.75rem 1.5rem', background:'none', border:'none', borderBottom:`2px solid ${tab===t?'#cc7030':'transparent'}`, cursor:'pointer', fontWeight:tab===t?'700':'500', color:tab===t?'#cc7030':'#6b7280', fontSize:'0.9rem', marginBottom:'-2px' }}>
            {t === 'materials' ? '🧵 Material' : t === 'products' ? '📦 Produk' : '🔄 Mutasi Stok'}
          </button>
        ))}
      </div>

      {/* Only show search + pagination for material/product tabs */}
      {tab !== 'mutasi' && (
        <>
          <input type="text" placeholder="Cari..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ marginBottom:'1rem', padding:'0.625rem 1rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none', width:280 }}/>
        </>
      )}

      {tab === 'mutasi' ? (
        /* ========== MUTASI STOK TAB ========== */
        <div style={{ maxWidth: 640 }}>
          {/* Mutasi type selector */}
          <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1.5rem' }}>
            {([
              { key:'in',      label:'Barang Masuk',  icon:<ArrowDownToLine size={16}/>, color:'#16a34a' },
              { key:'out',     label:'Kurangi Stok',  icon:<ArrowUpFromLine size={16}/>, color:'#ef4444' },
              { key:'transfer',label:'Transfer',       icon:<ArrowLeftRight size={16}/>, color:'#3b82f6' },
            ] as const).map(btn => (
              <button key={btn.key} onClick={() => { setMutasiType(btn.key); resetMutasiForm() }}
                style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'0.4rem',
                  padding:'1rem', border:`2px solid ${mutasiType===btn.key?btn.color:'#e5e7eb'}`,
                  borderRadius:'0.75rem', background: mutasiType===btn.key ? `${btn.color}10` : '#fff',
                  cursor:'pointer', fontWeight:'600', color: mutasiType===btn.key?btn.color:'#6b7280',
                  fontSize:'0.85rem', transition:'all 0.15s' }}>
                <div style={{ color: mutasiType===btn.key ? btn.color : '#9ca3af' }}>{btn.icon}</div>
                {btn.label}
              </button>
            ))}
          </div>

          {/* Success toast */}
          {mutasiSuccess && (
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.875rem 1rem', background:'#d1fae5', border:'1px solid #22c55e', borderRadius:'0.5rem', marginBottom:'1rem', color:'#065f46', fontWeight:'600', fontSize:'0.875rem' }}>
              <CheckCircle2 size={18}/> Stok berhasil diupdate!
            </div>
          )}

          <form onSubmit={handleMutasiSubmit} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:'0.75rem', padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
            <h3 style={{ fontSize:'1rem', fontWeight:'700', margin:'0 0 0.25rem' }}>
              {mutasiType === 'in' ? '📥 Input Barang Masuk' : mutasiType === 'out' ? '📤 Kurangi Stok' : '🔄 Transfer Antar Lokasi'}
            </h3>

            {/* Material selector */}
            <div>
              <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.3rem' }}>Material *</label>
              <select required value={mutasiMaterial} onChange={e => setMutasiMaterial(e.target.value)}
                style={{ width:'100%', padding:'0.625rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none', background:'#fff' }}>
                <option value="">— Pilih Material —</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.unit}) — Gudang: {m.stock_gudang} | Toko: {m.stock_toko}</option>
                ))}
              </select>
            </div>

            {/* Qty */}
            <div>
              <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.3rem' }}>Qty *</label>
              <input type="number" required min="1" placeholder="0" value={mutasiQty}
                onChange={e => setMutasiQty(e.target.value)}
                style={{ width:'100%', padding:'0.625rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none' }}/>
            </div>

            {/* Location: single for in/out, dual for transfer */}
            {mutasiType !== 'transfer' ? (
              <div>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.3rem' }}>Lokasi</label>
                <div style={{ display:'flex', gap:'0.75rem' }}>
                  {(['gudang','toko'] as const).map(loc => (
                    <label key={loc} style={{ flex:1, display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.625rem', border:`2px solid ${mutasiLocation===loc?'#cc7030':'#e5e7eb'}`, borderRadius:'0.5rem', cursor:'pointer', fontWeight:'500', fontSize:'0.875rem', background: mutasiLocation===loc?'#fff7ed':'#fff' }}>
                      <input type="radio" name="loc" value={loc} checked={mutasiLocation===loc} onChange={() => setMutasiLocation(loc)} style={{ display:'none' }}/>
                      <span style={{ textTransform:'capitalize' }}>{loc}</span>
                      <span style={{ marginLeft:'auto', fontSize:'0.75rem', color:'#9ca3af' }}>
                        {loc === 'gudang' ? (materials.find(m => m.id === mutasiMaterial)?.stock_gudang ?? '—') : (materials.find(m => m.id === mutasiMaterial)?.stock_toko ?? '—')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', gap:'1rem' }}>
                <div style={{ flex:1 }}>
                  <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.3rem' }}>Dari Lokasi</label>
                  <select value={mutasiFrom} onChange={e => setMutasiFrom(e.target.value as 'gudang'|'toko')}
                    style={{ width:'100%', padding:'0.625rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none', background:'#fff' }}>
                    <option value="gudang">Gudang</option>
                    <option value="toko">Toko</option>
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.3rem' }}>Ke Lokasi</label>
                  <select value={mutasiTo} onChange={e => setMutasiTo(e.target.value as 'gudang'|'toko')}
                    style={{ width:'100%', padding:'0.625rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none', background:'#fff' }}>
                    <option value="toko">Toko</option>
                    <option value="gudang">Gudang</option>
                  </select>
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.3rem' }}>Alasan</label>
              <select value={mutasiReason} onChange={e => setMutasiReason(e.target.value)}
                style={{ width:'100%', padding:'0.625rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none', background:'#fff' }}>
                <option value="">— Pilih Alasan —</option>
                {mutasiType === 'in' && <>
                  <option value="Restock">Restock</option>
                  <option value="Return from Customer">Return dari Customer</option>
                  <option value="Transfer from Toko">Transfer dari Toko</option>
                  <option value="Adjustment">Adjustment</option>
                  <option value="Lainnya">Lainnya</option>
                </>}
                {mutasiType === 'out' && <>
                  <option value="Broken">Rusak/Broken</option>
                  <option value="Expired">Expired</option>
                  <option value="Data Correction">Koreksi Data</option>
                  <option value="Used for Installation">Dipakai Installasi</option>
                  <option value="Transfer to Toko">Transfer ke Toko</option>
                  <option value="Disposal">Disposal</option>
                  <option value="Lainnya">Lainnya</option>
                </>}
                {mutasiType === 'transfer' && <>
                  <option value="Restock Toko">Restock ke Toko</option>
                  <option value="Restock Gudang">Restock ke Gudang</option>
                  <option value="Adjustment">Adjustment</option>
                  <option value="Lainnya">Lainnya</option>
                </>}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.3rem' }}>Catatan (opsional)</label>
              <input type="text" placeholder="Catatan tambahan..." value={mutasiNotes}
                onChange={e => setMutasiNotes(e.target.value)}
                style={{ width:'100%', padding:'0.625rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none' }}/>
            </div>

            {/* Submit */}
            <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.25rem' }}>
              <button type="button" onClick={resetMutasiForm} style={{ flex:1, padding:'0.75rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', background:'#fff', cursor:'pointer', fontWeight:'600', fontSize:'0.875rem' }}>Reset</button>
              <button type="submit" disabled={savingMutasi || !mutasiMaterial || !mutasiQty}
                style={{ flex:2, padding:'0.75rem', background: mutasiType === 'in' ? '#16a34a' : mutasiType === 'out' ? '#ef4444' : '#3b82f6', color:'#fff', border:'none', borderRadius:'0.5rem', cursor: (savingMutasi || !mutasiMaterial || !mutasiQty) ? 'not-allowed' : 'pointer', fontWeight:'600', fontSize:'0.875rem' }}>
                {savingMutasi ? 'Menyimpan...' : mutasiType === 'in' ? '📥 Simpan Barang Masuk' : mutasiType === 'out' ? '📤 Simpan Kurangi Stok' : '🔄 Simpan Transfer'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ========== MATERIALS / PRODUCTS TABS ========== */
        <>
          <div className="data-table">
            {loading ? (
              <div style={{ padding: '1.5rem' }}><TableSkeleton rows={8} cols={6} /></div>
            ) : tab === 'materials' ? (
              filteredMat.length === 0 ? (
                <EmptyState icon="🧵" title="Tidak ada material" description="Belum ada data material." />
              ) : (
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
              )
            ) : (
              filteredProd.length === 0 ? (
                <EmptyState icon="📦" title="Tidak ada produk" description="Belum ada data produk." />
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
              )
            )}
          </div>

          {/* Pagination */}
          {!loading && (filteredMat.length > 0 || filteredProd.length > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', padding: '0.75rem 0', borderTop: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                Halaman {currentPage} dari {Math.max(1, Math.ceil((tab === 'materials' ? totalCount : totalCountProd) / PAGE_SIZE))} — {tab === 'materials' ? totalCount : totalCountProd} {tab === 'materials' ? 'material' : 'produk'}
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
                  disabled={currentPage >= Math.ceil((tab === 'materials' ? totalCount : totalCountProd) / PAGE_SIZE)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: '#fff', cursor: currentPage >= Math.ceil((tab === 'materials' ? totalCount : totalCountProd) / PAGE_SIZE) ? 'not-allowed' : 'pointer', fontSize: '0.8rem', color: currentPage >= Math.ceil((tab === 'materials' ? totalCount : totalCountProd) / PAGE_SIZE) ? '#9ca3af' : '#374151' }}
                >
                  Selanjutnya <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}