'use client'

import { useState } from 'react'
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

      {/* Desktop notification bell — top right (mobile pakai drawer di TopNav) */}
      <div style={{ position: 'fixed', top: 10, right: 16, zIndex: 300 }} className="desktop-notif-bell">
        <NotificationBell />
      </div>

      {/* Desktop slide-out sidebar */}
      <DashboardSidebar role={role} userName={userName} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="dashboard-main">
        <div className="dashboard-content">{children}</div>
      </main>
    </div>
  )
}
