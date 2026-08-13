'use client'
import { Modal } from '@/components/ui/Modal'
import { GORDEN_STYLES, SMOKRING_COLORS } from '@/types'
import type { Product } from '@/types'
import { parseGordenMeter } from '@/lib/order-detail'
import type { ItemType, BomRow } from '@/lib/order-detail'

// Phase 6B-3d-3 (refactor order detail): modal "Tambah Item Pesanan" diekstrak dari
// admin/orders/[id]/page.tsx — behavior-preserving (state & handler tetap di parent).
export interface ItemFormState {
  product_id: string
  qty: string
  price: string
  size: string
  meter_gorden: string
  meter: string
  poni_lurus: boolean
  poni_gel: boolean
  style_type: string
  smokring_color: string
  variant_color: string
  dimension_p: string
  dimension_l: string
  dimension_t: string
  weight: string
  customer_name: string
  customer_phone: string
  kg: string
  meter_laundry: string
  description: string
}

interface Props {
  open: boolean
  onClose: () => void
  onReset: () => void
  itemType: ItemType
  setItemType: (t: ItemType) => void
  itemForm: ItemFormState
  setItemForm: (updater: (f: ItemFormState) => ItemFormState) => void
  searchProduct: string
  setSearchProduct: (v: string) => void
  products: Product[]
  boms: BomRow[]
  laundryRate: number
  savingItem: boolean
  fmt: (n: number) => string
  onSubmit: (e: React.FormEvent) => void
}

const TYPE_LABELS: Record<ItemType, string> = {
  gorden: '🪟 Gorden',
  perabot: '🪑 Perabot',
  laundry: '🧺 Laundry'
}

export default function AddItemModal({
  open,
  onClose,
  onReset,
  itemType,
  setItemType,
  itemForm,
  setItemForm,
  searchProduct,
  setSearchProduct,
  products,
  boms,
  laundryRate,
  savingItem,
  fmt,
  onSubmit
}: Props) {
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchProduct.toLowerCase()))
  )

  return (
    <Modal open={open} onClose={onClose} maxWidth={580} padding="2rem">
      <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Tambah Item Pesanan</h2>

      {/* Step 1: Type selector */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {(['gorden', 'perabot', 'laundry'] as ItemType[]).map((t) => (
          <button
            key={t}
            onClick={() => setItemType(t)}
            style={{
              flex: 1,
              padding: '0.625rem',
              border: `2px solid ${itemType === t ? '#cc7030' : 'var(--neutral-200)'}`,
              borderRadius: '0.5rem',
              background: itemType === t ? '#fff7ed' : '#fff',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.8rem',
              color: itemType === t ? '#92400e' : 'var(--neutral-600)'
            }}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* === GORDEN FORM === */}
        {itemType === 'gorden' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
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
                  Produk
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Cari produk..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      background: 'var(--surface)'
                    }}
                  />
                  {searchProduct && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        background: 'var(--surface)',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        maxHeight: 200,
                        overflowY: 'auto'
                      }}
                    >
                      <div
                        onClick={() => {
                          setItemForm((f) => ({ ...f, product_id: '', price: '' }))
                          setSearchProduct('')
                        }}
                        style={{
                          padding: '0.5rem 0.75rem',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          color: 'var(--neutral-600)',
                          borderBottom: '1px solid #f3f4f6'
                        }}
                      >
                        — Pilih Produk —
                      </div>
                      {filteredProducts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setItemForm((f) => ({ ...f, product_id: p.id, price: String(p.price ?? 0) }))
                            setSearchProduct('')
                          }}
                          style={{
                            padding: '0.5rem 0.75rem',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            borderBottom: '1px solid #f3f4f6',
                            background: itemForm.product_id === p.id ? '#fef3c7' : 'transparent'
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{p.name}</span>
                          {p.sku && <span style={{ color: 'var(--neutral-400)', marginLeft: '0.5rem' }}>({p.sku})</span>}
                          <span style={{ float: 'right', color: '#cc7030' }}>
                            {p.price != null
                              ? new Intl.NumberFormat('id-ID', {
                                  style: 'currency',
                                  currency: 'IDR',
                                  maximumFractionDigits: 0
                                }).format(p.price)
                              : ''}
                          </span>
                        </div>
                      ))}
                      {filteredProducts.length === 0 && (
                        <div style={{ padding: '0.75rem', color: 'var(--neutral-400)', fontSize: '0.8rem' }}>
                          Tidak ada produk ditemukan
                        </div>
                      )}
                    </div>
                  )}
                  {!searchProduct && !itemForm.product_id && (
                    <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--neutral-400)' }}>
                      Ketik untuk mencari produk
                    </div>
                  )}
                  {!searchProduct &&
                    itemForm.product_id &&
                    (() => {
                      const sel = products.find((p) => p.id === itemForm.product_id)
                      return sel ? (
                        <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--neutral-700)' }}>
                          <span style={{ fontWeight: 500 }}>{sel.name}</span>
                          {sel.sku && <span style={{ color: 'var(--neutral-400)', marginLeft: '0.5rem' }}>({sel.sku})</span>}
                        </div>
                      ) : null
                    })()}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                  Ukuran (cm)
                </label>
                <input
                  type="text"
                  placeholder="120 x 250"
                  value={itemForm.size}
                  onChange={(e) => setItemForm((f) => ({ ...f, size: e.target.value }))}
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
              {itemForm.product_id &&
                (() => {
                  const prodBom = boms.filter((b) => b.product_id === itemForm.product_id)
                  if (prodBom.length === 0) return null
                  return (
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
                        📋 Material Dibutuhkan
                      </label>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                          maxHeight: 120,
                          overflowY: 'auto',
                          padding: '0.5rem',
                          background: '#fef3c7',
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem'
                        }}
                      >
                        {prodBom.map((b) => {
                          const mat = b.material
                          const isLow = (mat?.stock_gudang ?? 0) < (b.qty_per_unit ?? 0)
                          return (
                            <div
                              key={b.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.2rem 0'
                              }}
                            >
                              <span
                                style={{
                                  color: isLow ? '#dc2626' : 'var(--neutral-700)',
                                  fontWeight: isLow ? '700' : '400'
                                }}
                              >
                                {mat?.name ?? '—'} × {(b.qty_per_unit ?? 0)} {mat?.unit}
                              </span>
                              <span style={{ color: isLow ? '#dc2626' : '#059669', fontWeight: '600' }}>
                                {isLow ? '⚠️ Stok kurang' : '✅ Cukup'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
            </div>
            {itemType === 'gorden' && (
              <div style={{ background: 'var(--neutral-100)', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.75rem' }}>
                  Meteran Gorden (otomatis dari ukuran)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--neutral-600)',
                        marginBottom: '0.25rem'
                      }}
                    >
                      Meter Gorden (m)
                    </label>
                    <input
                      type="text"
                      value={parseGordenMeter(itemForm.size) > 0 ? parseGordenMeter(itemForm.size).toFixed(2) : '0'}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        outline: 'none',
                        background: 'var(--surface)'
                      }}
                    />
                    <div style={{ fontSize: '0.68rem', color: 'var(--neutral-400)', marginTop: '0.2rem' }}>
                      = tinggi ukuran ÷ 100 (isi ukuran "lebar x tinggi" di atas)
                    </div>
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--neutral-600)',
                        marginBottom: '0.25rem'
                      }}
                    >
                      Berat Auto (kg)
                    </label>
                    <input
                      type="text"
                      value={parseGordenMeter(itemForm.size) > 0 ? (parseGordenMeter(itemForm.size) * 0.4).toFixed(2) : '0'}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        outline: 'none',
                        background: 'var(--neutral-100)',
                        color: 'var(--neutral-600)'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            {/* Style Variant Cards */}
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.5rem' }}>
                Model Gorden
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem' }}>
                {GORDEN_STYLES.map((style) => (
                  <div
                    key={style}
                    onClick={() => setItemForm((f) => ({ ...f, style_type: style, smokring_color: '' }))}
                    style={{
                      padding: '0.625rem 0.5rem',
                      textAlign: 'center',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: itemForm.style_type === style ? '#cc7030' : '#fff',
                      color: itemForm.style_type === style ? '#fff' : 'var(--neutral-700)',
                      border: `1px solid ${itemForm.style_type === style ? '#cc7030' : 'var(--input-border)'}`
                    }}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </div>
                ))}
              </div>
              {itemForm.style_type === 'smokring' && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--neutral-600)', marginBottom: '0.4rem' }}>
                    Warna Smokring
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {SMOKRING_COLORS.map((c) => (
                      <div
                        key={c}
                        onClick={() => setItemForm((f) => ({ ...f, smokring_color: c }))}
                        style={{
                          padding: '0.375rem 0.75rem',
                          borderRadius: '9999px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          background: itemForm.smokring_color === c ? '#cc7030' : '#fff',
                          color: itemForm.smokring_color === c ? '#fff' : 'var(--neutral-700)',
                          border: `1px solid ${itemForm.smokring_color === c ? '#cc7030' : 'var(--input-border)'}`
                        }}
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ background: 'var(--neutral-100)', borderRadius: '0.5rem', padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    background: 'var(--surface)',
                    border: '1px solid var(--input-border)',
                    borderRadius: '0.5rem',
                    padding: '0.625rem 0.75rem'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={itemForm.poni_lurus}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, poni_lurus: e.target.checked }))}
                  />
                  Poni Lurus
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    background: 'var(--surface)',
                    border: '1px solid var(--input-border)',
                    borderRadius: '0.5rem',
                    padding: '0.625rem 0.75rem'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={itemForm.poni_gel}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, poni_gel: e.target.checked }))}
                  />
                  Poni Gel
                </label>
              </div>
              {itemForm.meter_gorden && Number(itemForm.meter_gorden) > 0 && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#16a34a', fontWeight: '600' }}>
                  Estimasi:{' '}
                  {(products.find((p) => p.id === itemForm.product_id)?.price || 0) * Number(itemForm.meter_gorden)}
                </div>
              )}
            </div>
          </>
        )}

        {/* === PERABOT FORM === */}
        {itemType === 'perabot' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
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
                  Produk
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Cari produk..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      background: 'var(--surface)'
                    }}
                  />
                  {searchProduct && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        background: 'var(--surface)',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        maxHeight: 200,
                        overflowY: 'auto'
                      }}
                    >
                      <div
                        onClick={() => {
                          setItemForm((f) => ({ ...f, product_id: '', price: '' }))
                          setSearchProduct('')
                        }}
                        style={{
                          padding: '0.5rem 0.75rem',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          color: 'var(--neutral-600)',
                          borderBottom: '1px solid #f3f4f6'
                        }}
                      >
                        — Pilih Produk —
                      </div>
                      {filteredProducts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setItemForm((f) => ({ ...f, product_id: p.id, price: String(p.price ?? 0) }))
                            setSearchProduct('')
                          }}
                          style={{
                            padding: '0.5rem 0.75rem',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            borderBottom: '1px solid #f3f4f6',
                            background: itemForm.product_id === p.id ? '#fef3c7' : 'transparent'
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{p.name}</span>
                          {p.sku && <span style={{ color: 'var(--neutral-400)', marginLeft: '0.5rem' }}>({p.sku})</span>}
                          <span style={{ float: 'right', color: '#cc7030' }}>
                            {p.price != null
                              ? new Intl.NumberFormat('id-ID', {
                                  style: 'currency',
                                  currency: 'IDR',
                                  maximumFractionDigits: 0
                                }).format(p.price)
                              : ''}
                          </span>
                        </div>
                      ))}
                      {filteredProducts.length === 0 && (
                        <div style={{ padding: '0.75rem', color: 'var(--neutral-400)', fontSize: '0.8rem' }}>
                          Tidak ada produk ditemukan
                        </div>
                      )}
                    </div>
                  )}
                  {!searchProduct &&
                    itemForm.product_id &&
                    (() => {
                      const sel = products.find((p) => p.id === itemForm.product_id)
                      return sel ? (
                        <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--neutral-700)' }}>
                          <span style={{ fontWeight: 500 }}>{sel.name}</span>
                          {sel.sku && <span style={{ color: 'var(--neutral-400)', marginLeft: '0.5rem' }}>({sel.sku})</span>}
                        </div>
                      ) : null
                    })()}
                </div>
              </div>
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
                  Qty
                </label>
                <input
                  type="number"
                  min="1"
                  value={itemForm.qty}
                  onChange={(e) => setItemForm((f) => ({ ...f, qty: e.target.value }))}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                  Harga (Rp)
                </label>
                <input
                  type="number"
                  value={itemForm.price}
                  onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))}
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
                  Ukuran (cm)
                </label>
                <input
                  type="text"
                  placeholder="120 x 250"
                  value={itemForm.size}
                  onChange={(e) => setItemForm((f) => ({ ...f, size: e.target.value }))}
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
            <div style={{ background: 'var(--neutral-100)', borderRadius: '0.5rem', padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.5rem' }}>
                Warna & Dimensi
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: 'var(--neutral-600)',
                      marginBottom: '0.25rem'
                    }}
                  >
                    Warna
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Hitam, Silver"
                    value={itemForm.variant_color}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, variant_color: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: 'var(--neutral-600)',
                      marginBottom: '0.25rem'
                    }}
                  >
                    Berat (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={itemForm.weight}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, weight: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3,1fr)',
                  gap: '0.5rem',
                  marginTop: '0.5rem'
                }}
              >
                {(['dimension_p', 'P', 'dimension_l', 'L', 'dimension_t', 'T'] as const).map((field, i) => (
                  <div key={field}>
                    <label style={{ fontSize: '0.65rem', color: 'var(--neutral-600)' }}>{['P', 'L', 'T'][i]} (cm)</label>
                    <input
                      type="number"
                      placeholder={['P', 'L', 'T'][i]}
                      value={itemForm[field as keyof ItemFormState] as string}
                      onChange={(e) => setItemForm((prev) => ({ ...prev, [field]: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.4rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* === LAUNDRY FORM === */}
        {itemType === 'laundry' && (
          <>
            <div style={{ background: 'var(--neutral-100)', borderRadius: '0.5rem', padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.75rem' }}>
                🧺 Detail Laundry
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: 'var(--neutral-600)',
                      marginBottom: '0.25rem'
                    }}
                  >
                    Nama Customer *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama customer"
                    value={itemForm.customer_name}
                    onChange={(e) => setItemForm((f) => ({ ...f, customer_name: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: 'var(--neutral-600)',
                      marginBottom: '0.25rem'
                    }}
                  >
                    Telepon
                  </label>
                  <input
                    type="text"
                    placeholder="08xxxxxxxxxx"
                    value={itemForm.customer_phone}
                    onChange={(e) => setItemForm((f) => ({ ...f, customer_phone: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: 'var(--neutral-600)',
                      marginBottom: '0.25rem'
                    }}
                  >
                    Berat (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemForm.kg}
                    onChange={(e) => setItemForm((f) => ({ ...f, kg: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: 'var(--neutral-600)',
                      marginBottom: '0.25rem'
                    }}
                  >
                    Meter (m)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemForm.meter_laundry}
                    onChange={(e) => setItemForm((f) => ({ ...f, meter_laundry: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
              {itemForm.kg && laundryRate > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#16a34a' }}>
                  Estimasi harga: {fmt(Number(itemForm.kg) * laundryRate)} ({itemForm.kg}kg × {fmt(laundryRate)}
                  /kg)
                </div>
              )}
              <div style={{ marginTop: '0.75rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: 'var(--neutral-600)',
                    marginBottom: '0.25rem'
                  }}
                >
                  Keterangan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Gorden 15kg, Vitras 5kg, dll..."
                  value={itemForm.description}
                  onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onReset}
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
            disabled={savingItem}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: '#cc7030',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: savingItem ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            {savingItem ? 'Menyimpan...' : 'Tambah Item'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
