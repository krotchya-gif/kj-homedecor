'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu,
  X,
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard', href: '/admin', icon: <span /> },
    { label: 'Katalog', href: '/admin/catalog', icon: <span /> },
    { label: 'Pesanan', href: '/admin/orders', icon: <span /> },
    { label: 'Pelanggan', href: '/admin/customers', icon: <span /> },
    { label: 'Booking', href: '/admin/booking', icon: <span /> },
    { label: 'Portofolio', href: '/admin/portfolio', icon: <span /> },
    { label: 'Laporan', href: '/admin/reports', icon: <span /> },
    { label: 'Staff', href: '/admin/staff', icon: <span /> },
    { label: 'Pengiriman', href: '/admin/shipping', icon: <span /> },
    { label: 'Landing', href: '/admin/landing-settings', icon: <span /> },
    { label: 'SEO', href: '/admin/seo', icon: <span /> },
  ],
  gudang: [
    { label: 'Dashboard', href: '/gudang', icon: <span /> },
    { label: 'Produksi', href: '/gudang/production', icon: <span /> },
    { label: 'Laundry/Steam', href: '/gudang/steam', icon: <span /> },
    { label: 'Posisi Stok', href: '/gudang/stock', icon: <span /> },
    { label: 'Alerts', href: '/gudang/alerts', icon: <span /> },
    { label: 'Lembur', href: '/gudang/lembur', icon: <span /> },
    { label: 'QC', href: '/gudang/qc', icon: <span /> },
  ],
  penjahit: [
    { label: 'Dashboard', href: '/penjahit', icon: <span /> },
    { label: 'Job Queue', href: '/penjahit/jobs', icon: <span /> },
    { label: 'Rekap', href: '/penjahit/reports', icon: <span /> },
    { label: 'Riwayat', href: '/penjahit/history', icon: <span /> },
  ],
  finance: [
    { label: 'Dashboard', href: '/finance', icon: <span /> },
    { label: 'BOM & Material', href: '/finance/materials', icon: <span /> },
    { label: 'HPP', href: '/finance/hpp', icon: <span /> },
    { label: 'Pembayaran', href: '/finance/payments', icon: <span /> },
    { label: 'Supplier', href: '/finance/suppliers', icon: <span /> },
    { label: 'Laporan', href: '/finance/reports', icon: <span /> },
  ],
  installer: [
    { label: 'Jadwal', href: '/installer', icon: <span /> },
    { label: 'Laporan', href: '/installer/reports', icon: <span /> },
  ],
  owner: [
    { label: 'Overview', href: '/owner', icon: <span /> },
    { label: 'Pesanan', href: '/admin/orders', icon: <span /> },
    { label: 'Pengiriman', href: '/admin/shipping', icon: <span /> },
    { label: 'Stok Gudang', href: '/gudang/stock', icon: <span /> },
    { label: 'Staff', href: '/owner/staff', icon: <span /> },
    { label: 'Marketplace', href: '/owner/marketplace', icon: <span /> },
    { label: 'Top Produk', href: '/owner/products', icon: <span /> },
    { label: 'Laporan', href: '/admin/reports', icon: <span /> },
  ],
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  gudang: 'Gudang',
  penjahit: 'Penjahit',
  finance: 'Finance',
  installer: 'Installer',
  owner: 'Owner',
}

interface DashboardTopNavProps {
  role: string
  userName: string
  onMenuClick: () => void
}

export default function DashboardTopNav({ role, userName, onMenuClick }: DashboardTopNavProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const navItems = NAV_BY_ROLE[role] ?? []

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
          </div>
        </>
      )}
    </>
  )
}