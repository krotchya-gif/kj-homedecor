'use client'
import { Modal } from '@/components/ui/Modal'

// Phase 6B-2c (refactor order detail): modal "Batalkan Order" diekstrak dari
// admin/orders/[id]/page.tsx — behavior-preserving.
interface Props {
  open: boolean
  onClose: () => void
  cancelReason: string
  setCancelReason: (v: string) => void
  onConfirm: () => void
}

export default function CancelOrderModal({ open, onClose, cancelReason, setCancelReason, onConfirm }: Props) {
  return (
    <Modal open={open} onClose={onClose} maxWidth={440} padding="2rem">
      <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>❌ Batalkan Order</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--neutral-600)', marginBottom: '1.25rem' }}>
        Order akan dibatalkan dan payment di-void. Tindakan ini tidak bisa dibatalkan.
      </p>
      <div style={{ marginBottom: '1rem' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.8rem',
            fontWeight: '600',
            color: 'var(--neutral-700)',
            marginBottom: '0.3rem'
          }}
        >
          Alasan Pembatalan *
        </label>
        <textarea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '0.625rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            outline: 'none',
            resize: 'vertical'
          }}
          placeholder="Contoh: Customer batal, stok tidak tersedia, dll"
        />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
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
          onClick={onConfirm}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Ya, Batalkan
        </button>
      </div>
    </Modal>
  )
}
