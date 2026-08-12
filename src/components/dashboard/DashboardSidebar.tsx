'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { LogOut, X } from 'lucide-react'
import { useState } from 'react'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { NAV_BY_ROLE, ROLE_LABELS } from '@/config/nav'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DashboardSidebarProps {
  role: string
  userName: string
  open: boolean
  onClose: () => void
}

export default function DashboardSidebar({ role, userName, open, onClose }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const navGroups = NAV_BY_ROLE[role] ?? []

  async function handleLogout() {
    setLogoutOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Overlay backdrop — hidden when logout dialog is open */}
      {open && !logoutOpen && <div className="sidebar-overlay" onClick={onClose} />}

      {/* Sidebar panel */}
      <div className={`sidebar ${open ? 'open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-user">
            <div className="user-avatar" style={{ width: 40, height: 40, fontSize: '1rem' }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{userName}</div>
              <div style={{ fontSize: '0.75rem' }}>{ROLE_LABELS[role]}</div>
            </div>
          </div>
          <button onClick={onClose} className="sidebar-close-btn" aria-label="Close sidebar">
            <X size={20} />
          </button>
        </div>

        {/* Nav items — grouped */}
        <div className="sidebar-nav">
          {navGroups.map((group) => (
            <div key={group.title} className="sidebar-group">
              <div className="sidebar-group-title">{group.title}</div>
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = item.href === `/${role}` ? pathname === item.href : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                    onClick={onClose}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer: theme toggle + logout */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-top">
            <ThemeToggle />
            <button
              className="sidebar-logout-btn"
              onClick={() => {
                onClose()
                setLogoutOpen(true)
              }}
            >
              <LogOut size={16} />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Logout confirmation dialog */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Konfirmasi Keluar</DialogTitle>
            <DialogDescription>Apakah Anda yakin ingin keluar dari dashboard?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleLogout}>Ya, Keluar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
