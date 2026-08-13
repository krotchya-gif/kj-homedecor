'use client'
import { CheckCircle2, Camera } from 'lucide-react'
import { STATUS_LABELS } from '@/types'
import type { OrderPhoto } from '@/lib/order-detail'

// Phase 6B-3a (refactor order detail): pipeline stepper diekstrak dari
// admin/orders/[id]/page.tsx — behavior-preserving.
interface Props {
  statuses: readonly string[]
  statusIdx: number
  currentStatus: string
  photos: OrderPhoto[]
  onPhotoClick: (stage: string, urls: string[]) => void
}

export default function OrderPipelineStepper({ statuses, statusIdx, currentStatus, photos, onPhotoClick }: Props) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        marginBottom: '1.25rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
        {statuses.map((s, i) => {
          const done = i <= statusIdx
          const current = s === currentStatus
          // Foto lama (path relatif /uploads/... dari era public/uploads) sudah HILANG
          // (file tidak pernah ada di storage) — jangan hitung sbg foto valid (fix 2026-08-10)
          const stagePhotos = photos.filter((p) => p.stage === s && p.photo_url.startsWith('http'))
          const hasPhotos = stagePhotos.length > 0
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 80 }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                  gap: '0.375rem',
                  position: 'relative'
                }}
              >
                <div
                  onClick={() => (hasPhotos ? onPhotoClick(s, stagePhotos.map((p) => p.photo_url)) : null)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: current ? '#cc7030' : done ? '#d1fae5' : 'var(--neutral-100)',
                    border: `2px solid ${current ? '#cc7030' : done ? '#22c55e' : 'var(--neutral-200)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: current ? '#fff' : done ? '#16a34a' : 'var(--neutral-400)',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: hasPhotos ? 'pointer' : 'default',
                    position: 'relative'
                  }}
                >
                  {done && !current ? <CheckCircle2 size={14} /> : i + 1}
                  {hasPhotos && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #fff'
                      }}
                    >
                      <Camera size={8} style={{ color: '#fff' }} />
                    </div>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: current ? '700' : '400',
                    color: current ? '#cc7030' : done ? 'var(--neutral-700)' : 'var(--neutral-400)',
                    textAlign: 'center',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {STATUS_LABELS[s as keyof typeof STATUS_LABELS]}
                </span>
                {current && (
                  <span
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: '600',
                      color: '#cc7030',
                      background: 'rgba(204,112,48,0.12)',
                      borderRadius: '0.25rem',
                      padding: '0.1rem 0.35rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Saat Ini
                  </span>
                )}
              </div>
              {i < statuses.length - 1 && (
                <div
                  style={{ width: 24, height: 2, background: i < statusIdx ? '#22c55e' : 'var(--neutral-200)', flexShrink: 0 }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
