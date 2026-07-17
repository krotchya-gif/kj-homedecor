'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { createClient } from '@/utils/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { NAV_BY_ROLE, ROLE_LABELS } from '@/config/navigation'

interface DashboardTopNavProps {
  role: string
  userName: string
  onMenuClick: () => void
}

export default function DashboardTopNav({ role, userName, onMenuClick }: DashboardTopNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const navItems = NAV_BY_ROLE[role] ?? []

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  async function handleLogout() {
    setLogoutOpen(false)
    setMobileMenuOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Only render on mobile
  if (!isMobile) return null

  return (
    <>
      <nav className="topnav">
        {/* Mobile menu button */}
        <button
          className="hamburger-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Brand */}
        <a href="/" target="_blank" rel="noopener noreferrer" className="topnav-brand" suppressHydrationWarning>
          KJ <span>Homedecor</span>
        </a>

        {/* Right side: desktop toggle button */}
        <div className="topnav-right">
          <button
            onClick={onMenuClick}
            className="desktop-sidebar-btn"
            title="Buka menu"
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Close user dropdown on outside click */}
        {mobileMenuOpen && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </nav>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <>
          <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
          <div className="mobile-drawer">
            <div className="mobile-drawer-header">
              <div className="mobile-user-info">
                <div className="user-avatar" style={{ width: 40, height: 40, fontSize: '1rem' }}>
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{userName}</div>
                  <div style={{ fontSize: '0.75rem' }}>{ROLE_LABELS[role]}</div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="mobile-nav-items">
              {navItems.map((item) => {
                const isActive =
                  item.href === `/${role}`
                    ? pathname === item.href
                    : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
            <div className="mobile-drawer-footer">
              <ThemeToggle />
              <button
                className="mobile-logout-btn"
                onClick={() => { setMobileMenuOpen(false); setLogoutOpen(true) }}
              >
                <LogOut size={16} />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Logout confirmation dialog */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Konfirmasi Keluar</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin keluar dari dashboard?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>Batal</Button>
            <Button onClick={handleLogout}>Ya, Keluar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}