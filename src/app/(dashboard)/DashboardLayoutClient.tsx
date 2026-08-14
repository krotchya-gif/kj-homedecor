'use client'

import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import DashboardTopNav from '@/components/dashboard/DashboardTopNav'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import NotificationBell from '@/components/dashboard/NotificationBell'

export default function DashboardLayoutClient({
  children,
  role,
  userName
}: {
  children: React.ReactNode
  role: string
  userName: string
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // BUG-119 (Opsi C): HANYA SATU instance NotificationBell yang boleh ter-mount.
  // Desktop → bell fixed di kanan atas. Mobile → bell di footer drawer (DashboardTopNav),
  // jadi bell desktop TIDAK dirender saat mobile (tidak ada 2 subscribe channel).
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="dashboard-layout" style={{ flexDirection: 'column' }}>
      {/* Mobile topnav (shown only on mobile via DashboardTopNav internal check) */}
      <DashboardTopNav role={role} userName={userName} onMenuClick={() => setSidebarOpen(true)} />

      {/* Desktop sidebar toggle — visible only on desktop via CSS */}
      <button
        className="desktop-sidebar-btn desktop-sidebar-toggle"
        onClick={() => setSidebarOpen(true)}
        title="Buka navigasi"
      >
        <Menu size={20} />
      </button>

      {/* Desktop notification bell — hanya dirender non-mobile; di mobile bell ada di drawer */}
      {!isMobile && (
        <div style={{ position: 'fixed', top: 10, right: 16, zIndex: 300 }} className="desktop-notif-bell">
          <NotificationBell />
        </div>
      )}

      {/* Desktop slide-out sidebar */}
      <DashboardSidebar role={role} userName={userName} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="dashboard-main">
        <div className="dashboard-content">{children}</div>
      </main>
    </div>
  )
}
