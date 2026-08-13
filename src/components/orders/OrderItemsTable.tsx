'use client'
import { Plus, CheckCircle2, Trash2 } from 'lucide-react'
import type { OrderItem } from '@/types'

// Phase 6B-3d-2 (refactor order detail): tabel "Item Pesanan" diekstrak dari
// admin/orders/[id]/page.tsx — behavior-preserving.
interface Props {
  items: OrderItem[]
  fmt: (n: number) => string
  onAddItem: () => void
  onToggleReady: (id: string, current: boolean) => void
  onRemoveItem: (id: string) => void
}

export default function OrderItemsTable({ items, fmt, onAddItem, onToggleReady, onRemoveItem }: Props) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--neutral-700)' }}>Item Pesanan</h2>
        <button
          onClick={onAddItem}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.5rem 1rem',
            background: '#cc7030',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: '600',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          <Plus size={14} /> Tambah Item
        </button>
      </div>
      <div className="data-table">
        {items.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)', fontSize: '0.875rem' }}>
            Belum ada item pesanan
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tipe</th>
                <th>Produk</th>
                <th>Ukuran</th>
                <th>Qty</th>
                <th>Specs</th>
                <th>Harga</th>
                <th>Ready</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const prod = item.product as { name: string; sku?: string } | null
                const itemTypeLabel =
                  item.item_type === 'laundry'
                    ? '🧺 Laundry'
                    : item.item_type === 'perabot'
                      ? '🪑 Perabot'
                      : '🪟 Gorden'
                return (
                  <tr key={item.id}>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          background: 'var(--neutral-100)',
                          color: 'var(--neutral-700)'
                        }}
                      >
                        {itemTypeLabel}
                      </span>
                    </td>
                    <td style={{ fontWeight: '500' }}>{prod?.name ?? item.custom_specs ?? '—'}</td>
                    <td style={{ color: 'var(--neutral-600)', fontSize: '0.8rem' }}>{item.size ?? '—'}</td>
                    <td>{item.qty}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--neutral-600)', maxWidth: 180 }}>
                      {item.item_type === 'gorden' && (
                        <>
                          {Number(item.meter_gorden ?? 0) > 0 && (
                            <span>Gorden: {Number(item.meter_gorden).toFixed(2)}m</span>
                          )}
                          {item.style_type && <span> • {item.style_type}</span>}
                          {item.meter && <span> • {Number(item.meter).toFixed(2)}m</span>}
                          {(item.poni_lurus || item.poni_gel) && (
                            <span>
                              {' '}
                              • {[item.poni_lurus && 'Lurus', item.poni_gel && 'Gel'].filter(Boolean).join('/')}
                            </span>
                          )}
                        </>
                      )}
                      {item.item_type === 'perabot' && (
                        <>
                          {item.variant_color && <span>Warna: {item.variant_color}</span>}
                          {item.dimension_p && (
                            <span>
                              {' '}
                              • {item.dimension_p}×{item.dimension_l}×{item.dimension_t}cm
                            </span>
                          )}
                          {item.weight && <span> • {item.weight}kg</span>}
                        </>
                      )}
                      {item.item_type === 'laundry' && (
                        <>{item.meter && <span>{Number(item.meter).toFixed(2)}m</span>}</>
                      )}
                    </td>
                    <td style={{ fontWeight: '600', color: '#cc7030' }}>{fmt(item.price)}</td>
                    <td>
                      <button
                        onClick={() => onToggleReady(item.id, item.ready)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: item.ready ? '#16a34a' : 'var(--input-border)'
                        }}
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
