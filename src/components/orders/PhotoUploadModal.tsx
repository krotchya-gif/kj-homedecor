'use client'
import { Modal } from '@/components/ui/Modal'
import { XIcon, Loader2, Upload } from 'lucide-react'
import { STATUS_LABELS } from '@/types'
import { isPhotoRequired } from '@/lib/orders'
import type { OrderStatus } from '@/types'

// Phase 6B-2b (refactor order detail): modal "Foto Progress" diekstrak dari
// admin/orders/[id]/page.tsx — behavior-preserving (state & handler tetap di parent).
interface Props {
  open: boolean
  onClose: () => void
  pendingStatus: string | null
  progressPhotos: string[]
  setProgressPhotos: (updater: (p: string[]) => string[]) => void
  uploadingPhoto: boolean
  updating: boolean
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onConfirm: () => void
}

export default function PhotoUploadModal({
  open,
  onClose,
  pendingStatus,
  progressPhotos,
  setProgressPhotos,
  uploadingPhoto,
  updating,
  onUpload,
  onConfirm
}: Props) {
  const statusLabel = pendingStatus ? STATUS_LABELS[pendingStatus as keyof typeof STATUS_LABELS] : ''

  return (
    <Modal open={open} onClose={onClose} maxWidth={480} padding="1.5rem">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '700' }}>📷 Foto Progress — {statusLabel}</h2>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
        >
          <XIcon size={18} />
        </button>
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', marginBottom: '1rem' }}>
        {pendingStatus && isPhotoRequired(pendingStatus as OrderStatus) ? (
          <>
            <strong style={{ color: '#dc2626' }}>WAJIB</strong> upload minimal <strong>1 foto</strong> untuk stage{' '}
            <strong>{statusLabel}</strong> (wajib bukti foto). Foto akan tercatat sebagai bukti pengerjaan.
          </>
        ) : (
          <>
            <strong style={{ color: '#dc2626' }}>WAJIB</strong> upload minimal <strong>1 foto</strong> sebagai bukti
            pengerjaan. Foto akan tercatat sebagai akuntabilitas siapa yang bertanggung jawab di stage ini.
          </>
        )}
      </p>
      <div
        style={{
          border: '2px dashed #d1d5db',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          textAlign: 'center',
          marginBottom: '1rem',
          cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
          opacity: uploadingPhoto ? 0.6 : 1
        }}
      >
        <input
          type="file"
          accept="image/*"
          onChange={onUpload}
          disabled={uploadingPhoto}
          id="progress-photo-input"
          style={{ display: 'none' }}
        />
        <label
          htmlFor="progress-photo-input"
          style={{
            cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {uploadingPhoto ? (
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Upload size={24} style={{ color: 'var(--neutral-400)' }} />
          )}
          <span style={{ fontSize: '0.875rem', color: 'var(--neutral-600)' }}>
            {uploadingPhoto ? 'Mengupload...' : 'Klik untuk upload foto'}
          </span>
        </label>
      </div>
      {progressPhotos.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {progressPhotos.map((url, i) => (
            <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
              <img
                src={url}
                style={{
                  width: 72,
                  height: 72,
                  objectFit: 'cover',
                  borderRadius: '0.375rem',
                  border: '1px solid #e5e7eb'
                }}
              />
              <button
                onClick={() => setProgressPhotos((p) => p.filter((_, j) => j !== i))}
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: 10
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
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
          disabled={updating || progressPhotos.length === 0}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: progressPhotos.length === 0 ? 'var(--neutral-400)' : '#cc7030',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: updating || progressPhotos.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            opacity: updating ? 0.6 : 1
          }}
        >
          {updating ? (
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', display: 'inline', marginRight: 4 }} />
          ) : null}
          {progressPhotos.length === 0 ? '📷 Upload foto dulu' : `Lanjut & Simpan (${progressPhotos.length} foto)`}
        </button>
      </div>
    </Modal>
  )
}
