'use client'
import type { PreparationChecklistItem } from '@/types'

// Phase 6B-3d-1 (refactor order detail): checklist "Persiapan & Kelengkapan"
// diekstrak dari admin/orders/[id]/page.tsx — behavior-preserving.
interface Props {
  checklist: PreparationChecklistItem[]
  onUpdate: (key: string, field: 'done' | 'notes', value: boolean | string) => void
}

export default function PreparationChecklist({ checklist, onUpdate }: Props) {
  return (
    <div
      style={{
        marginTop: '1.5rem',
        background: 'var(--surface)',
        borderRadius: '0.875rem',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <span style={{ fontSize: '1.1rem' }}>📦</span>
        <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--neutral-700)' }}>Persiapan & Kelengkapan</h2>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--neutral-400)' }}>
          {checklist.filter((i) => i.done).length}/{checklist.length} siap
        </span>
      </div>
      <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {checklist.map((item) => (
          <div
            key={item.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 0',
              borderBottom: '1px solid #f9fafb'
            }}
          >
            <input
              type="checkbox"
              checked={item.done}
              onChange={(e) => onUpdate(item.key, 'done', e.target.checked)}
              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#cc7030' }}
            />
            <span
              style={{
                flex: 1,
                fontSize: '0.875rem',
                fontWeight: item.done ? '400' : '500',
                color: item.done ? 'var(--neutral-400)' : 'var(--neutral-700)',
                textDecoration: item.done ? 'line-through' : 'none'
              }}
            >
              {item.label}
            </span>
            <input
              type="text"
              placeholder="Catatan..."
              value={item.notes}
              onChange={(e) => onUpdate(item.key, 'notes', e.target.value)}
              style={{
                flex: 2,
                padding: '0.375rem 0.625rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
