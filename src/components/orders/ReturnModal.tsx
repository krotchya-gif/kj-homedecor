'use client'
import { Modal } from '@/components/ui/Modal'
import type { OrderItem } from '@/types'

// Phase 6B-2d (refactor order detail): modal "Proses Return" diekstrak dari
// admin/orders/[id]/page.tsx — behavior-preserving.
export interface ReturnFormState {
  item_id: string
  reason: string
  condition: 'good' | 'damaged'
  qty: string
  refund_amount: string
}

interface Props {
  open: boolean
  onClose: () => void
  returnForm: ReturnFormState
  setReturnForm: (updater: (f: ReturnFormState) => ReturnFormState) => void
  items: OrderItem[]
  onSubmit: (e: React.FormEvent) => void
}

export default function ReturnModal({ open, onClose, returnForm, setReturnForm, items, onSubmit }: Props) {
  return (
    <Modal open={open} onClose={onClose} maxWidth={480} padding="2rem">
      <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>📦 Proses Return</h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', marginBottom: '1.25rem' }}>
        Barang yang dikembalikan akan dicek kondisinya. Bagus → masuk stock toko. Rusak → dispose.
      </p>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            Item (opsional)
          </label>
          <select
            value={returnForm.item_id}
            onChange={(e) => setReturnForm((f) => ({ ...f, item_id: e.target.value }))}
            style={{
              width: '100%',
              padding: '0.625rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              outline: 'none',
              background: 'var(--surface)'
            }}
          >
            <option value="">Semua item (return entire order)</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.product?.name ?? 'Item'} — Qty: {it.qty}
              </option>
            ))}
          </select>
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
            Alasan Return *
          </label>
          <textarea
            value={returnForm.reason}
            onChange={(e) => setReturnForm((f) => ({ ...f, reason: e.target.value }))}
            rows={2}
            style={{
              width: '100%',
              padding: '0.625rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              outline: 'none',
              resize: 'vertical'
            }}
            placeholder="Contoh: Barang rusak, tidak sesuai ukuran, dll"
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
            Kondisi Barang *
          </label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {[
              ['good', '✅ Bagus (masuk stock)'],
              ['damaged', '❌ Rusak (dispose)']
            ].map(([val, label]) => (
              <label
                key={val}
                onClick={() => setReturnForm((f) => ({ ...f, condition: val as 'good' | 'damaged' }))}
                style={{
                  flex: 1,
                  cursor: 'pointer',
                  border: `2px solid ${returnForm.condition === val ? '#9333ea' : 'var(--neutral-200)'}`,
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  background: returnForm.condition === val ? '#f5f3ff' : '#fff',
                  textAlign: 'center'
                }}
              >
                <input
                  type="radio"
                  name="condition"
                  value={val}
                  checked={returnForm.condition === val}
                  onChange={() => {}}
                  style={{ display: 'none' }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{label}</span>
              </label>
            ))}
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
              Qty Return
            </label>
            <input
              type="number"
              min="1"
              value={returnForm.qty}
              onChange={(e) => setReturnForm((f) => ({ ...f, qty: e.target.value }))}
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
              Refund (Rp)
            </label>
            <input
              type="number"
              min="0"
              value={returnForm.refund_amount}
              onChange={(e) => setReturnForm((f) => ({ ...f, refund_amount: e.target.value }))}
              placeholder="0 = tidak ada refund"
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
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={onClose}
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
            style={{
              flex: 1,
              padding: '0.75rem',
              background: '#9333ea',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Simpan Return
          </button>
        </div>
      </form>
    </Modal>
  )
}
