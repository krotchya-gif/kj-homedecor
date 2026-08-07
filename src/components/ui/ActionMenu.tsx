'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreVertical } from 'lucide-react'

/**
 * ActionMenu — menu 3 titik (kebab) untuk kolom aksi tabel.
 * Best practice Material: kebab menu untuk 2+ aksi per row; touch target >= 40px.
 * Klik di luar menu -> tutup otomatis.
 */
export interface ActionMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
}

export default function ActionMenu({ items }: { items: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        aria-label="Menu aksi"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.375rem',
          borderRadius: '0.5rem',
          color: 'var(--neutral-500)',
          minHeight: 36,
          minWidth: 36,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 4px)',
            zIndex: 50,
            minWidth: 180,
            background: 'var(--surface)',
            border: '1px solid var(--neutral-200)',
            borderRadius: '0.625rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: '0.375rem',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => {
                setOpen(false)
                it.onClick()
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                fontSize: '0.82rem',
                fontWeight: '500',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                color: it.danger ? '#dc2626' : 'var(--neutral-700)',
                minHeight: 40
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = it.danger ? '#fef2f2' : 'var(--neutral-100)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none'
              }}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
