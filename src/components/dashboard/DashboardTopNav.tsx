'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Calendar,
  ImageIcon,
  BarChart3,
  Warehouse,
  Scissors,
  DollarSign,
  Wrench,
  Eye,
  Bell,
  LogOut,
  ChevronDown,
  Settings,
  Menu,
  X,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import ThemeToggle from '@/components/ui/ThemeToggle'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={16} /> },
    { label: 'Katalog', href: '/admin/catalog', icon: <Package size={16} /> },
    { label: 'Pesanan', href: '/admin/orders', icon: <ShoppingCart size={16} /> },
    { label: 'Pelanggan', href: '/admin/customers', icon: <Users size={16} /> },
    { label: 'Booking', href: '/admin/booking', icon: <Calendar size={16} /> },
    { label: 'Portofolio', href: '/admin/portfolio', icon: <ImageIcon size={16} /> },
    { label: 'Laporan', href: '/admin/reports', icon: <BarChart3 size={16} /> },
    { label: 'Staff', href: '/admin/staff', icon: <Users size={16} /> },
    { label: 'Landing', href: '/admin/landing-settings', icon: <Settings size={16} /> },
  ],
  gudang: [
    { label: 'Dashboard',  href: '/gudang',            icon: <LayoutDashboard size={16} /> },
    { label: 'Produksi',   href: '/gudang/production', icon: <Warehouse size={16} /> },
    { label: 'Laundry/Steam', href: '/gudang/steam',   icon: <Package size={16} /> },
    { label: 'Posisi Stok',href: '/gudang/stock',      icon: <Package size={16} /> },
    { label: 'Alerts',     href: '/gudang/alerts',     icon: <Bell size={16} /> },
    { label: 'Lembur',     href: '/gudang/lembur',     icon: <Calendar size={16} /> },
    { label: 'QC',         href: '/gudang/qc',         icon: <Wrench size={16} /> },
  ],
  penjahit: [
    { label: 'Dashboard',  href: '/penjahit',          icon: <LayoutDashboard size={16} /> },
    { label: 'Job Queue',  href: '/penjahit/jobs',     icon: <Scissors size={16} /> },
    { label: 'Rekap',      href: '/penjahit/reports',  icon: <BarChart3 size={16} /> },
    { label: 'Riwayat',    href: '/penjahit/history',  icon: <BarChart3 size={16} /> },
  ],
  finance: [
    { label: 'Dashboard', href: '/finance', icon: <LayoutDashboard size={16} /> },
    { label: 'BOM & Material', href: '/finance/materials', icon: <Package size={16} /> },
    { label: 'HPP', href: '/finance/hpp', icon: <DollarSign size={16} /> },
    { label: 'Pembayaran', href: '/finance/payments', icon: <DollarSign size={16} /> },
    { label: 'Supplier', href: '/finance/suppliers', icon: <Users size={16} /> },
    { label: 'Laporan', href: '/finance/reports', icon: <BarChart3 size={16} /> },
  ],
  installer: [
    { label: 'Jadwal', href: '/installer', icon: <Calendar size={16} /> },
    { label: 'Laporan', href: '/installer/reports', icon: <BarChart3 size={16} /> },
  ],
  owner: [
    { label: 'Overview', href: '/owner', icon: <Eye size={16} /> },
    { label: 'Staff', href: '/owner/staff', icon: <Users size={16} /> },
    { label: 'Marketplace', href: '/owner/marketplace', icon: <ShoppingCart size={16} /> },
    { label: 'Top Produk', href: '/owner/products', icon: <Package size={16} /> },
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

export default function DashboardTopNav({
  role,
  userName,
}: {
  role: string
  userName: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const navItems = NAV_BY_ROLE[role] ?? []

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

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
        <Link href="/" className="topnav-brand">
          KJ <span>Homedecor</span>
        </Link>

        {/* Nav links - desktop */}
        <div className="topnav-nav">
          {navItems.map((item) => {
            const isActive =
              item.href === `/${role}`
                ? pathname === item.href
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`topnav-link ${isActive ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div className="topnav-right">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notification */}
          <button
            className="notification-btn"
            title="Notifikasi"
          >
            <Bell size={18} />
          </button>

          {/* User menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="user-menu-btn"
            >
              <div className="user-avatar">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#111827' }}>
                  {userName}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                  {ROLE_LABELS[role] ?? role}
                </div>
              </div>
              <ChevronDown size={14} style={{ color: '#9ca3af' }} />
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <div className="user-dropdown">
                <div className="user-dropdown-header">
                  Masuk sebagai <strong style={{ color: '#111827' }}>{ROLE_LABELS[role]}</strong>
                </div>
                <button
                  onClick={handleLogout}
                  className="logout-btn"
                >
                  <LogOut size={15} />
                  Keluar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Close dropdown on outside click */}
        {userMenuOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99,
            }}
            onClick={() => setUserMenuOpen(false)}
          />
        )}
      </nav>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="mobile-overlay"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="mobile-drawer">
            <div className="mobile-drawer-header">
              <div className="mobile-user-info">
                <div className="user-avatar" style={{ width: 40, height: 40, fontSize: '1rem' }}>
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: '600', color: '#111827', fontSize: '0.9rem' }}>{userName}</div>
                  <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{ROLE_LABELS[role]}</div>
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
              <button onClick={handleLogout} className="logout-btn-mobile">
                <LogOut size={16} />
                Keluar
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
