'use client'
import { Modal } from '@/components/ui/Modal'

// Phase 6B-2e (refactor order detail): modal "Tambah Pembayaran" diekstrak dari
// admin/orders/[id]/page.tsx — behavior-preserving.
export interface PaymentFormState {
  type: 'dp' | 'lunas'
  amount: string
}

interface Props {
  open: boolean
  onClose: () => void
  paymentForm: PaymentFormState
  setPaymentForm: (updater: (f: PaymentFormState) => PaymentFormState) => void
  saving: boolean
  sisa: number
  fmt: (n: number) => string
  onSubmit: (e: React.FormEvent) => void
  // Sesi 59: bukti foto pembayaran (wajib untuk DP & pelunasan)
  proofUrl: string
  uploading: boolean
  onProofUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveProof: () => void
}

export default function PaymentModal({
  open,
  onClose,
  paymentForm,
  setPaymentForm,
  saving,
  sisa,
  fmt,
  onSubmit,
  proofUrl,
  uploading,
  onProofUpload,
  onRemoveProof
}: Props) {
  return (
    <Modal open={open} onClose={onClose} maxWidth={400} padding="2rem">
      <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>+ Tambah Pembayaran</h2>
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
            Tipe Pembayaran
          </label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {(
              [
                ['dp', '💰 DP'],
                ['lunas', '✅ Lunas']
              ] as const
            ).map(([val, label]) => (
              <label
                key={val}
                onClick={() => setPaymentForm((f) => ({ ...f, type: val }))}
                style={{
                  flex: 1,
                  cursor: 'pointer',
                  border: `2px solid ${paymentForm.type === val ? '#16a34a' : 'var(--neutral-200)'}`,
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  background: paymentForm.type === val ? '#f0fdf4' : '#fff',
                  textAlign: 'center'
                }}
              >
                <input
                  type="radio"
                  name="paymentType"
                  value={val}
                  checked={paymentForm.type === val}
                  onChange={() => {}}
                  style={{ display: 'none' }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{label}</span>
              </label>
            ))}
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
            Jumlah (Rp)
          </label>
          <input
            type="number"
            min="1"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
            style={{
              width: '100%',
              padding: '0.625rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--neutral-600)' }}>
            Sisa: {fmt(sisa)}
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
            Bukti Pembayaran (foto) <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              padding: '0.5rem',
              border: '1px dashed #d1d5db',
              borderRadius: '0.5rem',
              background: 'var(--surface)'
            }}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onProofUpload}
              disabled={uploading}
              style={{ fontSize: '0.8rem', width: '100%' }}
            />
          </div>
          {uploading && (
            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginTop: '0.25rem' }}>
              Mengunggah bukti...
            </div>
          )}
          {proofUrl && !uploading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
              <img
                src={proofUrl}
                alt="Bukti pembayaran"
                style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '0.4rem' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>✓ Bukti ter-upload</span>
              <button
                type="button"
                onClick={onRemoveProof}
                style={{
                  fontSize: '0.7rem',
                  color: '#dc2626',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Hapus
              </button>
            </div>
          )}
          {!proofUrl && !uploading && (
            <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>
              Wajib unggah foto bukti sebelum menyimpan pembayaran.
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
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
            disabled={saving}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: '#16a34a',
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
  )
}
