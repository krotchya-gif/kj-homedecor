'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface Notif {
  id: string
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}

/**
 * Bell notifikasi in-app (SRS Survey 13: notifikasi ke Admin/Owner saat survey baru).
 * Phase 6D (BUG-109): polling 30s → REALTIME (postgres_changes). Notifikasi baru
 * muncul langsung tanpa refresh. RLS `notifications_own` (user_id = auth.uid())
 * menjaga hanya notif milik sendiri yang diterima.
 */
export default function NotificationBell() {
  const router = useRouter()
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const json = await res.json()
      setItems(json.data ?? [])
      setUnread(json.unread ?? 0)
    } catch {
      // offline — abaikan
    }
  }, [])

  useEffect(() => {
    let active = true
    let userId: string | null = null

    ;(async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) return
      userId = user.id
      if (active) load()
    })()

    // Realtime: refresh otomatis saat ada INSERT notifikasi milik user.
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId ?? ''}` },
        () => {
          load()
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [load, supabase])

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH' })
    setUnread(0)
    setItems((p) => p.map((n) => ({ ...n, is_read: true })))
  }

  async function openItem(n: Notif) {
    if (!n.is_read) {
      await fetch(`/api/notifications?id=${n.id}`, { method: 'PATCH' })
      setUnread((u) => Math.max(0, u - 1))
      setItems((p) => p.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  const fmtTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (diffMin < 1) return 'Baru saja'
    if (diffMin < 60) return `${diffMin} mnt lalu`
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)} jam lalu`
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  return (
    <div style={{ position: 'relative' }} ref={boxRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifikasi"
        style={{
          position: 'relative',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '0.35rem',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Bell size={20} style={{ color: 'var(--neutral-700)' }} />
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              background: '#ef4444',
              color: '#fff',
              fontSize: '0.6rem',
              fontWeight: '700',
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px'
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            width: 320,
            maxHeight: 420,
            overflowY: 'auto',
            background: 'var(--surface, #fff)',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
            zIndex: 400
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #f1f5f9'
            }}
          >
            <span style={{ fontWeight: '700', fontSize: '0.875rem' }}>Notifikasi</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                style={{ fontSize: '0.7rem', color: '#cc7030', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Tandai semua dibaca
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--neutral-400)' }}>
              Belum ada notifikasi
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => openItem(n)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  borderBottom: '1px solid #f1f5f9',
                  background: n.is_read ? 'transparent' : 'rgba(204,112,48,0.06)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>{n.title}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--neutral-400)', whiteSpace: 'nowrap' }}>
                    {fmtTime(n.created_at)}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-600)', marginTop: '0.2rem' }}>{n.message}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
