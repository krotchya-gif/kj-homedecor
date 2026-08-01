'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { AlertTriangle, CheckCircle2, Minus, Plus, Pencil, Package, Truck } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'

const PAGE_SIZE = 20

const REASON_ADD = ['Restock', 'PO Received', 'Return from Customer', 'Transfer from Toko', 'Adjustment', 'Lainnya']
const REASON_REDUCE = [
  'Broken',
  'Expired',
  'Data Correction',
  'Used for Installation',
  'Transfer to Toko',
  'Disposal',
  'Lainnya'
]

export default function GudangStockPage() {
  const [materials, setMaterials] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'materials' | 'products' | 'mutasi' | 'edit' | 'delivery'>('materials')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalCountProd, setTotalCountProd] = useState(0)
  const supabase = createClient()

  // Mutasi state
  const [mutasiTarget, setMutasiTarget] = useState<'material' | 'produk'>('material')
  const [mutasiSearch, setMutasiSearch] = useState('')
  const [mutasiItem, setMutasiItem] = useState('')
  const [mutasiQty, setMutasiQty] = useState('')
  const [mutasiLocation, setMutasiLocation] = useState<'gudang' | 'toko'>('gudang')
  const [mutasiReason, setMutasiReason] = useState('')
  const [mutasiNotes, setMutasiNotes] = useState('')
  const [savingMutasi, setSavingMutasi] = useState(false)
  const [mutasiSuccess, setMutasiSuccess] = useState(false)

  // Edit state
  const [editTarget, setEditTarget] = useState<'material' | 'produk'>('material')
  const [editSearch, setEditSearch] = useState('')
  const [editItem, setEditItem] = useState<any | null>(null)
  const [editQty, setEditQty] = useState('')
  const [editMode, setEditMode] = useState<'add' | 'reduce'>('add')
  const [editLocation, setEditLocation] = useState<'gudang' | 'toko'>('gudang')
  const [editReason, setEditReason] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Delivery state
  const [deliveryPOs, setDeliveryPOs] = useState<any[]>([])
  const [loadingDelivery, setLoadingDelivery] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const from = (currentPage - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const [mRes, pRes, mCountRes, pCountRes] = await Promise.all([
      supabase
        .from('materials')
        .select('*, supplier:suppliers(name)', { count: 'exact' })
        .order('name')
        .range(from, to),
      supabase
        .from('products')
        .select('*, category:categories(name)', { count: 'exact' })
        .order('name')
        .range(from, to),
      supabase.from('materials').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true })
    ])
    setMaterials(mRes.data ?? [])
    setTotalCount(mCountRes.count ?? 0)
    setProducts(pRes.data ?? [])
    setTotalCountProd(pCountRes.count ?? 0)
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [currentPage, tab])

  useEffect(() => {
    if (tab === 'delivery') loadDeliveries()
  }, [tab])

  async function loadDeliveries() {
    setLoadingDelivery(true)
    try {
      const res = await fetch('/api/gudang/po-delivery')
      const json = await res.json()
      setDeliveryPOs(json.data ?? [])
    } catch {
      setDeliveryPOs([])
    }
    setLoadingDelivery(false)
  }

  async function handleConfirmDelivery(poId: string) {
    setConfirmingId(poId)
    try {
      await fetch('/api/gudang/po-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ po_id: poId })
      })
      await loadDeliveries()
    } finally {
      setConfirmingId(null)
    }
  }

  function filteredItems(list: any[], searchVal: string) {
    return list.filter((it: any) => it.name.toLowerCase().includes(searchVal.toLowerCase()))
  }

  async function handleMutasiSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!mutasiItem || !mutasiQty) return
    setSavingMutasi(true)
    const qty = Number(mutasiQty)
    const {
      data: { user }
    } = await supabase.auth.getUser()
    const reason = mutasiReason || 'Restock'
    try {
      if (mutasiTarget === 'material') {
        const field = mutasiLocation === 'gudang' ? 'stock_gudang' : 'stock_toko'
        const { data: mat } = await supabase
          .from('materials')
          .select('stock_gudang, stock_toko')
          .eq('id', mutasiItem)
          .single()
        const matAny = mat as any
        await supabase
          .from('materials')
          .update({ [field]: (matAny?.[field] ?? 0) + qty })
          .eq('id', mutasiItem)
        await supabase.from('inventory_movements').insert({
          material_id: mutasiItem,
          type: 'in',
          qty,
          to_location: mutasiLocation,
          reason,
          notes: mutasiNotes || null,
          created_by: user?.id ?? null
        })
      } else {
        const { data: prod } = await supabase.from('products').select('stock_toko').eq('id', mutasiItem).single()
        const prodAny = prod as any
        await supabase
          .from('products')
          .update({ stock_toko: (prodAny?.stock_toko ?? 0) + qty })
          .eq('id', mutasiItem)
        await supabase.from('inventory_movements').insert({
          product_id: mutasiItem,
          type: 'in',
          qty,
          to_location: 'toko',
          reason,
          notes: mutasiNotes || null,
          created_by: user?.id ?? null
        })
      }
      setMutasiSuccess(true)
      setTimeout(() => setMutasiSuccess(false), 2500)
      setMutasiQty('')
      setMutasiReason('')
      setMutasiNotes('')
      setMutasiItem('')
      setMutasiSearch('')
    } finally {
      setSavingMutasi(false)
    }
  }

  async function quickAdjust(
    itemId: string,
    target: 'material' | 'produk',
    direction: 'add' | 'reduce',
    location?: 'gudang' | 'toko'
  ) {
    const qty = 1
    const {
      data: { user }
    } = await supabase.auth.getUser()
    const reason = direction === 'add' ? 'Quick Add' : 'Quick Reduce'
    if (target === 'material') {
      const field = (location ?? 'gudang') === 'gudang' ? 'stock_gudang' : 'stock_toko'
      const { data: mat } = await supabase
        .from('materials')
        .select('stock_gudang, stock_toko')
        .eq('id', itemId)
        .single()
      const matAny = mat as any
      const newVal = direction === 'add' ? (matAny?.[field] ?? 0) + qty : Math.max(0, (matAny?.[field] ?? 0) - qty)
      await supabase
        .from('materials')
        .update({ [field]: newVal })
        .eq('id', itemId)
      await supabase.from('inventory_movements').insert({
        material_id: itemId,
        type: direction === 'add' ? 'in' : 'out',
        qty,
        from_location: direction === 'reduce' ? (location ?? 'gudang') : null,
        to_location: direction === 'add' ? (location ?? 'gudang') : null,
        reason,
        created_by: user?.id ?? null
      })
    } else {
      const { data: prod } = await supabase.from('products').select('stock_toko').eq('id', itemId).single()
      const prodAny = prod as any
      const newVal =
        direction === 'add' ? (prodAny?.stock_toko ?? 0) + qty : Math.max(0, (prodAny?.stock_toko ?? 0) - qty)
      await supabase.from('products').update({ stock_toko: newVal }).eq('id', itemId)
      await supabase.from('inventory_movements').insert({
        product_id: itemId,
        type: direction === 'add' ? 'in' : 'out',
        qty,
        from_location: direction === 'reduce' ? 'toko' : null,
        to_location: direction === 'add' ? 'toko' : null,
        reason,
        created_by: user?.id ?? null
      })
    }
    load()
  }

  function openEditModal(item: any, target: 'material' | 'produk') {
    setEditItem(item)
    setEditTarget(target)
    setEditQty('')
    setEditMode('add')
    setEditLocation('gudang')
    setEditReason('')
    setEditNotes('')
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editItem || !editQty) return
    setSavingEdit(true)
    const qty = Math.abs(Number(editQty))
    const {
      data: { user }
    } = await supabase.auth.getUser()
    const reason = editReason || (editMode === 'add' ? 'Adjustment' : 'Reduction')
    try {
      if (editTarget === 'material') {
        const field = editLocation === 'gudang' ? 'stock_gudang' : 'stock_toko'
        const { data: mat } = await supabase
          .from('materials')
          .select('stock_gudang, stock_toko')
          .eq('id', editItem.id)
          .single()
        const matAny = mat as any
        const newVal = editMode === 'add' ? (matAny?.[field] ?? 0) + qty : Math.max(0, (matAny?.[field] ?? 0) - qty)
        await supabase
          .from('materials')
          .update({ [field]: newVal })
          .eq('id', editItem.id)
        await supabase.from('inventory_movements').insert({
          material_id: editItem.id,
          type: editMode === 'add' ? 'in' : 'out',
          qty,
          from_location: editMode === 'reduce' ? editLocation : null,
          to_location: editMode === 'add' ? editLocation : null,
          reason,
          notes: editNotes || null,
          created_by: user?.id ?? null
        })
      } else {
        const { data: prod } = await supabase.from('products').select('stock_toko').eq('id', editItem.id).single()
        const prodAny = prod as any
        const newVal =
          editMode === 'add' ? (prodAny?.stock_toko ?? 0) + qty : Math.max(0, (prodAny?.stock_toko ?? 0) - qty)
        await supabase.from('products').update({ stock_toko: newVal }).eq('id', editItem.id)
        await supabase.from('inventory_movements').insert({
          product_id: editItem.id,
          type: editMode === 'add' ? 'in' : 'out',
          qty,
          from_location: editMode === 'reduce' ? 'toko' : null,
          to_location: editMode === 'add' ? 'toko' : null,
          reason,
          notes: editNotes || null,
          created_by: user?.id ?? null
        })
      }
      setEditItem(null)
      load()
    } finally {
      setSavingEdit(false)
    }
  }

  const filteredMat = filteredItems(materials, search)
  const filteredProd = filteredItems(products, search)
  const mutasiItemList =
    mutasiTarget === 'material' ? filteredItems(materials, mutasiSearch) : filteredItems(products, mutasiSearch)
  const selectedMutasiItem = mutasiItemList.find((it: any) => it.id === mutasiItem)

  const editReasonOptions = editMode === 'add' ? REASON_ADD : REASON_REDUCE

  const inp = {
    width: '100%',
    padding: '0.625rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    outline: 'none'
  }
  const lbl = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: '600' as const,
    color: 'var(--neutral-700)',
    marginBottom: '0.3rem'
  }

  return (
    <div>
      <PageHeader title="Posisi Stok" subtitle="Stok Gudang vs Stok Toko — terpisah, tidak double-count" />

      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem' }}>
        {(['materials', 'products', 'mutasi', 'edit', 'delivery'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === t ? '#cc7030' : 'transparent'}`,
              cursor: 'pointer',
              fontWeight: tab === t ? '700' : '500',
              color: tab === t ? '#cc7030' : 'var(--neutral-600)',
              fontSize: '0.9rem',
              marginBottom: '-2px'
            }}
          >
            {t === 'materials'
              ? '🧵 Material'
              : t === 'products'
                ? '📦 Produk'
                : t === 'mutasi'
                  ? '📥 Barang Masuk'
                  : t === 'edit'
                    ? '✏️ Edit Stok'
                    : '📦 Pesanan Datang'}
          </button>
        ))}
      </div>

      {tab === 'materials' && (
        <>
          <input
            type="text"
            placeholder="Cari material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              marginBottom: '1rem',
              padding: '0.625rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              outline: 'none',
              width: 280
            }}
          />
          <div className="data-table">
            {loading ? (
              <div style={{ padding: '1.5rem' }}>
                <TableSkeleton rows={8} cols={6} />
              </div>
            ) : filteredMat.length === 0 ? (
              <EmptyState icon="🧵" title="Tidak ada material" description="" />
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nama Material</th>
                    <th>Satuan</th>
                    <th>Stok Gudang</th>
                    <th>Stok Toko</th>
                    <th>Min. Stok</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMat.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: '500' }}>{m.name}</td>
                      <td style={{ color: 'var(--neutral-600)' }}>{m.unit}</td>
                      <td
                        style={{
                          fontWeight: '700',
                          color: m.stock_gudang <= m.min_stock_level ? '#ef4444' : 'var(--neutral-700)'
                        }}
                      >
                        {m.stock_gudang}
                      </td>
                      <td>{m.stock_toko}</td>
                      <td style={{ color: 'var(--neutral-400)' }}>{m.min_stock_level}</td>
                      <td>
                        {m.stock_gudang < m.min_stock_level && (
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
                            <AlertTriangle size={10} /> Rendah
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'products' && (
        <>
          <input
            type="text"
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              marginBottom: '1rem',
              padding: '0.625rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              outline: 'none',
              width: 280
            }}
          />
          <div className="data-table">
            {loading ? (
              <div style={{ padding: '1.5rem' }}>
                <TableSkeleton rows={8} cols={5} />
              </div>
            ) : filteredProd.length === 0 ? (
              <EmptyState icon="📦" title="Tidak ada produk" description="" />
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nama Produk</th>
                    <th>Kategori</th>
                    <th>SKU</th>
                    <th>Stok Toko</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProd.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: '500' }}>{p.name}</td>
                      <td style={{ color: 'var(--neutral-600)' }}>{p.category?.name ?? '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--neutral-400)' }}>{p.sku ?? '—'}</td>
                      <td style={{ fontWeight: '700', color: p.stock_toko === 0 ? '#ef4444' : 'var(--neutral-700)' }}>
                        {p.stock_toko}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'mutasi' && (
        <div style={{ maxWidth: 560 }}>
          {mutasiSuccess && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.875rem 1rem',
                background: '#d1fae5',
                border: '1px solid #22c55e',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                color: '#065f46',
                fontWeight: '600',
                fontSize: '0.875rem'
              }}
            >
              <CheckCircle2 size={18} /> Stok berhasil dimasukkam!
            </div>
          )}
          <form
            onSubmit={handleMutasiSubmit}
            style={{
              background: 'var(--surface)',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>📥 Input Barang Masuk</h3>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setMutasiTarget('material')
                  setMutasiItem('')
                  setMutasiSearch('')
                }}
                style={{
                  flex: 1,
                  padding: '0.625rem',
                  border: `2px solid ${mutasiTarget === 'material' ? '#cc7030' : 'var(--neutral-200)'}`,
                  borderRadius: '0.5rem',
                  background: mutasiTarget === 'material' ? '#fff7ed' : '#fff',
                  cursor: 'pointer',
                  fontWeight: '600',
                  color: mutasiTarget === 'material' ? '#92400e' : 'var(--neutral-600)',
                  fontSize: '0.875rem'
                }}
              >
                🧵 Material
              </button>
              <button
                type="button"
                onClick={() => {
                  setMutasiTarget('produk')
                  setMutasiItem('')
                  setMutasiSearch('')
                }}
                style={{
                  flex: 1,
                  padding: '0.625rem',
                  border: `2px solid ${mutasiTarget === 'produk' ? '#cc7030' : 'var(--neutral-200)'}`,
                  borderRadius: '0.5rem',
                  background: mutasiTarget === 'produk' ? '#fff7ed' : '#fff',
                  cursor: 'pointer',
                  fontWeight: '600',
                  color: mutasiTarget === 'produk' ? '#92400e' : 'var(--neutral-600)',
                  fontSize: '0.875rem'
                }}
              >
                📦 Produk Jadi
              </button>
            </div>

            <div>
              <label style={lbl}>{mutasiTarget === 'material' ? 'Material *' : 'Produk Jadi *'}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder={`Cari ${mutasiTarget === 'material' ? 'material' : 'produk'}...`}
                  value={mutasiSearch}
                  onChange={(e) => {
                    setMutasiSearch(e.target.value)
                    setMutasiItem('')
                  }}
                  style={inp}
                />
                {mutasiSearch && mutasiItemList.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'var(--surface)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      maxHeight: 200,
                      overflowY: 'auto',
                      zIndex: 10
                    }}
                  >
                    {mutasiItemList.map((it: any) => (
                      <div
                        key={it.id}
                        onClick={() => {
                          setMutasiItem(it.id)
                          setMutasiSearch(it.name)
                          setMutasiLocation(mutasiTarget === 'material' ? 'gudang' : 'toko')
                        }}
                        style={{
                          padding: '0.625rem 0.875rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f3f4f6',
                          fontSize: '0.875rem',
                          background: mutasiItem === it.id ? '#fff7ed' : ''
                        }}
                      >
                        <div style={{ fontWeight: '500' }}>{it.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>
                          {mutasiTarget === 'material'
                            ? `Gudang: ${it.stock_gudang} | Toko: ${it.stock_toko}`
                            : `Stok Toko: ${it.stock_toko}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedMutasiItem && (
                <div
                  style={{
                    marginTop: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '0.375rem',
                    fontSize: '0.8rem',
                    color: '#166534'
                  }}
                >
                  &#10003; <strong>{selectedMutasiItem.name}</strong>
                  {mutasiTarget === 'material'
                    ? ` — Gudang: ${selectedMutasiItem.stock_gudang} | Toko: ${selectedMutasiItem.stock_toko}`
                    : ` — Stok Toko: ${selectedMutasiItem.stock_toko}`}
                </div>
              )}
            </div>

            <div>
              <label style={lbl}>Qty *</label>
              <input
                type="number"
                required
                min="1"
                placeholder="0"
                value={mutasiQty}
                onChange={(e) => setMutasiQty(e.target.value)}
                style={inp}
              />
            </div>

            {mutasiTarget === 'material' && (
              <div>
                <label style={lbl}>Lokasi Tujuan</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['gudang', 'toko'] as const).map((loc) => (
                    <label
                      key={loc}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.625rem',
                        border: `2px solid ${mutasiLocation === loc ? '#cc7030' : 'var(--neutral-200)'}`,
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.875rem',
                        background: mutasiLocation === loc ? '#fff7ed' : '#fff',
                        color: mutasiLocation === loc ? '#92400e' : 'var(--neutral-600)',
                        textTransform: 'capitalize' as const
                      }}
                    >
                      <input
                        type="radio"
                        name="mutasiLoc"
                        value={loc}
                        checked={mutasiLocation === loc}
                        onChange={() => setMutasiLocation(loc)}
                        style={{ display: 'none' }}
                      />
                      {loc}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {mutasiTarget === 'produk' && (
              <div
                style={{
                  padding: '0.625rem',
                  background: 'var(--neutral-100)',
                  borderRadius: '0.5rem',
                  fontSize: '0.82rem',
                  color: 'var(--neutral-600)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                &#128205; Lokasi: <strong>Toko</strong>
              </div>
            )}

            <div>
              <label style={lbl}>Alasan</label>
              <select
                value={mutasiReason}
                onChange={(e) => setMutasiReason(e.target.value)}
                style={{ ...inp, background: 'var(--surface)' }}
              >
                <option value="">— Pilih Alasan —</option>
                <option value="Restock">Restock</option>
                <option value="PO Received">PO Received</option>
                <option value="Return from Customer">Return dari Customer</option>
                <option value="Transfer from Toko">Transfer dari Toko</option>
                <option value="Adjustment">Adjustment</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label style={lbl}>Catatan (opsional)</label>
              <input
                type="text"
                placeholder="Catatan..."
                value={mutasiNotes}
                onChange={(e) => setMutasiNotes(e.target.value)}
                style={inp}
              />
            </div>

            <button
              type="submit"
              disabled={savingMutasi || !mutasiItem || !mutasiQty}
              style={{
                padding: '0.875rem',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: savingMutasi || !mutasiItem || !mutasiQty ? 'not-allowed' : 'pointer',
                fontWeight: '700',
                fontSize: '0.9rem'
              }}
            >
              {savingMutasi ? 'Menyimpan...' : '📥 Simpan Barang Masuk'}
            </button>
          </form>
        </div>
      )}

      {tab === 'edit' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <button
              onClick={() => {
                setEditTarget('material')
                setEditSearch('')
              }}
              style={{
                flex: 1,
                padding: '0.875rem',
                border: `2px solid ${editTarget === 'material' ? '#cc7030' : 'var(--neutral-200)'}`,
                borderRadius: '0.75rem',
                background: editTarget === 'material' ? '#fff7ed' : '#fff',
                cursor: 'pointer',
                fontWeight: '700',
                color: editTarget === 'material' ? '#92400e' : 'var(--neutral-600)',
                fontSize: '0.9rem'
              }}
            >
              🧵 Material
            </button>
            <button
              onClick={() => {
                setEditTarget('produk')
                setEditSearch('')
              }}
              style={{
                flex: 1,
                padding: '0.875rem',
                border: `2px solid ${editTarget === 'produk' ? '#cc7030' : 'var(--neutral-200)'}`,
                borderRadius: '0.75rem',
                background: editTarget === 'produk' ? '#fff7ed' : '#fff',
                cursor: 'pointer',
                fontWeight: '700',
                color: editTarget === 'produk' ? '#92400e' : 'var(--neutral-600)',
                fontSize: '0.9rem'
              }}
            >
              📦 Produk Jadi
            </button>
          </div>

          <input
            type="text"
            placeholder={`Cari ${editTarget === 'material' ? 'material' : 'produk'}...`}
            value={editSearch}
            onChange={(e) => setEditSearch(e.target.value)}
            style={{
              marginBottom: '1rem',
              padding: '0.625rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              outline: 'none',
              width: 280
            }}
          />

          <div className="data-table">
            {loading ? (
              <div style={{ padding: '1.5rem' }}>
                <TableSkeleton rows={8} cols={editTarget === 'material' ? 6 : 5} />
              </div>
            ) : editTarget === 'material' ? (
              filteredItems(materials, editSearch).length === 0 ? (
                <EmptyState icon="🧵" title="Tidak ada material" description="" />
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Nama Material</th>
                      <th>Satuan</th>
                      <th>Stok Gudang</th>
                      <th>Stok Toko</th>
                      <th>Min. Stok</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems(materials, editSearch).map((m) => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: '500' }}>{m.name}</td>
                        <td style={{ color: 'var(--neutral-600)' }}>{m.unit}</td>
                        <td
                          style={{
                            fontWeight: '700',
                            color: m.stock_gudang <= m.min_stock_level ? '#ef4444' : 'var(--neutral-700)'
                          }}
                        >
                          {m.stock_gudang}
                        </td>
                        <td>{m.stock_toko}</td>
                        <td style={{ color: 'var(--neutral-400)' }}>{m.min_stock_level}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                            <button
                              onClick={() => quickAdjust(m.id, 'material', 'add', 'gudang')}
                              title="Tambah Gudang +1"
                              style={{
                                background: '#d1fae5',
                                border: 'none',
                                borderRadius: '0.375rem',
                                width: 28,
                                height: 28,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#16a34a',
                                fontWeight: '700'
                              }}
                            >
                              <Plus size={14} />
                            </button>
                            <button
                              onClick={() => quickAdjust(m.id, 'material', 'reduce', 'gudang')}
                              title="Kurangi Gudang -1"
                              style={{
                                background: '#fee2e2',
                                border: 'none',
                                borderRadius: '0.375rem',
                                width: 28,
                                height: 28,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#dc2626',
                                fontWeight: '700'
                              }}
                            >
                              <Minus size={14} />
                            </button>
                            <button
                              onClick={() => openEditModal(m, 'material')}
                              title="Edit detail"
                              style={{
                                background: '#e0e7ff',
                                border: 'none',
                                borderRadius: '0.375rem',
                                width: 28,
                                height: 28,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#3730a3'
                              }}
                            >
                              <Pencil size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : filteredItems(products, editSearch).length === 0 ? (
              <EmptyState icon="📦" title="Tidak ada produk" description="" />
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nama Produk</th>
                    <th>Kategori</th>
                    <th>SKU</th>
                    <th>Stok Toko</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems(products, editSearch).map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: '500' }}>{p.name}</td>
                      <td style={{ color: 'var(--neutral-600)' }}>{p.category?.name ?? '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--neutral-400)' }}>{p.sku ?? '—'}</td>
                      <td style={{ fontWeight: '700', color: p.stock_toko === 0 ? '#ef4444' : 'var(--neutral-700)' }}>
                        {p.stock_toko}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                          <button
                            onClick={() => quickAdjust(p.id, 'produk', 'add', 'toko')}
                            title="Tambah +1"
                            style={{
                              background: '#d1fae5',
                              border: 'none',
                              borderRadius: '0.375rem',
                              width: 28,
                              height: 28,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#16a34a',
                              fontWeight: '700'
                            }}
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => quickAdjust(p.id, 'produk', 'reduce', 'toko')}
                            title="Kurangi -1"
                            style={{
                              background: '#fee2e2',
                              border: 'none',
                              borderRadius: '0.375rem',
                              width: 28,
                              height: 28,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#dc2626',
                              fontWeight: '700'
                            }}
                          >
                            <Minus size={14} />
                          </button>
                          <button
                            onClick={() => openEditModal(p, 'produk')}
                            title="Edit detail"
                            style={{
                              background: '#e0e7ff',
                              border: 'none',
                              borderRadius: '0.375rem',
                              width: 28,
                              height: 28,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#3730a3'
                            }}
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <Modal open={!!editItem} onClose={() => setEditItem(null)} maxWidth={460} padding="2rem" zIndex={200}>
        {editItem && (
          <>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 1.25rem' }}>✏️ Edit Stok</h2>
            <div style={{ padding: '0.75rem', background: 'var(--neutral-100)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <strong>{editItem.name}</strong>
              <div style={{ color: 'var(--neutral-600)', marginTop: '0.25rem' }}>
                {editTarget === 'material'
                  ? `Stok saat ini — Gudang: ${editItem.stock_gudang} | Toko: ${editItem.stock_toko}`
                  : `Stok Toko: ${editItem.stock_toko}`}
              </div>
            </div>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditMode('add')}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    border: `2px solid ${editMode === 'add' ? '#16a34a' : 'var(--neutral-200)'}`,
                    borderRadius: '0.5rem',
                    background: editMode === 'add' ? '#d1fae5' : '#fff',
                    cursor: 'pointer',
                    fontWeight: '700',
                    color: editMode === 'add' ? '#16a34a' : 'var(--neutral-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem'
                  }}
                >
                  <Plus size={15} /> Tambah
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode('reduce')}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    border: `2px solid ${editMode === 'reduce' ? '#ef4444' : 'var(--neutral-200)'}`,
                    borderRadius: '0.5rem',
                    background: editMode === 'reduce' ? '#fee2e2' : '#fff',
                    cursor: 'pointer',
                    fontWeight: '700',
                    color: editMode === 'reduce' ? '#ef4444' : 'var(--neutral-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem'
                  }}
                >
                  <Minus size={15} /> Kurangi
                </button>
              </div>
              <div>
                <label style={lbl}>Qty *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="0"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  style={inp}
                />
              </div>
              {editTarget === 'material' && (
                <div>
                  <label style={lbl}>Lokasi</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {(['gudang', 'toko'] as const).map((loc) => (
                      <label
                        key={loc}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          padding: '0.625rem',
                          border: `2px solid ${editLocation === loc ? '#cc7030' : 'var(--neutral-200)'}`,
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          background: editLocation === loc ? '#fff7ed' : '#fff',
                          color: editLocation === loc ? '#92400e' : 'var(--neutral-600)',
                          textTransform: 'capitalize' as const
                        }}
                      >
                        <input
                          type="radio"
                          name="editLoc"
                          value={loc}
                          checked={editLocation === loc}
                          onChange={() => setEditLocation(loc)}
                          style={{ display: 'none' }}
                        />
                        {loc}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {editTarget === 'produk' && (
                <div
                  style={{
                    padding: '0.625rem',
                    background: 'var(--neutral-100)',
                    borderRadius: '0.5rem',
                    fontSize: '0.82rem',
                    color: 'var(--neutral-600)'
                  }}
                >
                  &#128205; Lokasi: <strong>Toko</strong>
                </div>
              )}
              <div>
                <label style={lbl}>Alasan *</label>
                <select
                  required
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  style={{ ...inp, background: 'var(--surface)' }}
                >
                  <option value="">— Pilih Alasan —</option>
                  {editReasonOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Catatan</label>
                <input
                  type="text"
                  placeholder="Opsional..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  style={inp}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
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
                  disabled={savingEdit || !editQty || !editReason}
                  style={{
                    flex: 2,
                    padding: '0.75rem',
                    background: editMode === 'add' ? '#16a34a' : '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: savingEdit || !editQty || !editReason ? 'not-allowed' : 'pointer',
                    fontWeight: '700'
                  }}
                >
                  {savingEdit ? 'Menyimpan...' : editMode === 'add' ? '➕ Tambah Stok' : '➖ Kurangi Stok'}
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>

      {tab === 'delivery' && (
        <div>
          <div
            style={{
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '0.5rem',
              padding: '0.875rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.82rem',
              color: '#92400e'
            }}
          >
            ⚠️ Konfirmasi barang yang benar-benar sudah diterima di gudang. Stok akan bertambah setelah Anda klik "Sudah
            Sampai".
          </div>

          {loadingDelivery ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--neutral-400)' }}>Memuat...</div>
          ) : deliveryPOs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--neutral-400)' }}>
              <Truck size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem', display: 'block' }} />
              <p>Tidak ada pesanan yang sedang dalam perjalanan.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {deliveryPOs.map((po) => {
                const pr = po.pr as any
                const material = pr?.material
                return (
                  <div
                    key={po.id}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      padding: '1.25rem'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                          <span
                            style={{
                              background: '#7c3aed',
                              color: '#fff',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: '700'
                            }}
                          >
                            📦 Sedang dalam perjalanan
                          </span>
                        </div>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--neutral-800)' }}>
                          {material?.name ?? '—'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', marginTop: '0.2rem' }}>
                          Supplier: <strong>{po.supplier?.name ?? '—'}</strong> &bull; Qty:{' '}
                          <strong>
                            {pr?.qty ?? '—'} {material?.unit ?? ''}
                          </strong>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.2rem' }}>
                          PO: <span style={{ fontFamily: 'monospace' }}>{po.id.slice(0, 8)}</span> &bull; Estimation
                          cost:{' '}
                          <strong style={{ color: '#cc7030' }}>
                            {new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                              maximumFractionDigits: 0
                            }).format(po.actual_cost ?? 0)}
                          </strong>
                        </div>
                      </div>
                      <button
                        onClick={() => handleConfirmDelivery(po.id)}
                        disabled={confirmingId === po.id}
                        style={{
                          padding: '0.625rem 1.25rem',
                          background: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '0.5rem',
                          cursor: confirmingId === po.id ? 'not-allowed' : 'pointer',
                          fontWeight: '700',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          opacity: confirmingId === po.id ? 0.6 : 1
                        }}
                      >
                        {confirmingId === po.id ? 'Memproses...' : '✅'} Sudah Sampai di Gudang
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
