'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MoreVertical } from 'lucide-react'

/**
 * ActionMenu — menu 3 titik (kebab) untuk kolom aksi tabel.
 *
 * PENTING (2026-08-07): dropdown di-render dengan `position: fixed` di koordinat tombol
 * (getBoundingClientRect) — BUKAN absolute di dalam td. Sebab `.data-table` punya
 * `overflow: hidden` / `overflow-x: auto` → dropdown baris TERAKHIR keluar container
 * dan TERPOTONG (clip), z-index apa pun tidak menembus clip. Fixed + zIndex 9999:
 * - tidak kena overflow parent (keluar dari flow container)
 * - tidak ketutupan elemen lain (stacking paling atas)
 * - auto-flip ke ATAS kalau ruang di bawah tombol tidak cukup (baris paling bawah)
 * - close otomatis saat scroll/resize (posisi fixed tidak ikut scroll)
 */
export interface ActionMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
}

const MENU_WIDTH = 180

export default function ActionMenu({ items }: { items: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setPos(null)
  }, [])

  // hitung posisi fixed: flip ke atas kalau baris dekat bawah viewport
  const openMenu = useCallback(() => {
    const btn = btnRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const menuHeight = items.length * 40 + 12
    const gap = 4
    const spaceBelow = window.innerHeight - r.bottom
    const top = spaceBelow >= menuHeight + gap ? r.bottom + gap : Math.max(8, r.top - menuHeight - gap)
    const left = Math.min(r.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)
    setPos({ top, left: Math.max(8, left) })
    setOpen(true)
  }, [items.length])

  // close saat scroll (capture biar keburu sebelum posisi berubah) & resize
  useEffect(() => {
    if (!open) return
    const onScroll = () => close()
    const onResize = () => close()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, close])

  // close saat klik luar
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return
      if (menuRef.current?.contains(e.target as Node)) return
      close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [close])

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation()
          if (open) close()
          else openMenu()
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
          justifyContent: 'center',
          position: 'relative',
          zIndex: 10
        }}
      >
        <MoreVertical size={18} />
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            minWidth: MENU_WIDTH,
            background: 'var(--surface)',
            border: '1px solid var(--neutral-200)',
            borderRadius: '0.625rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            padding: '0.375rem',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => {
                close()
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
    </>
  )
}
