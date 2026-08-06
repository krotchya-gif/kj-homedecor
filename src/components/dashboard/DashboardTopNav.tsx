'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu,
  X,
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
  LogOut,
  Truck,
  WashingMachine,
  TrendingUp,
  Search,
  Settings,
  Book,
  CreditCard,
  ArrowLeftRight,
  LandPlot,
  FileText,
  ClipboardPlus,
  History,
  ClipboardList
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
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={18} /> },
    { label: 'Katalog', href: '/admin/catalog', icon: <Package size={18} /> },
    { label: 'Pesanan', href: '/admin/orders', icon: <ShoppingCart size={18} /> },
    { label: 'Pelanggan', href: '/admin/customers', icon: <Users size={18} /> },
    { label: 'Booking', href: '/admin/booking', icon: <Calendar size={18} /> },
    { label: 'Portofolio', href: '/admin/portfolio', icon: <ImageIcon size={18} /> },
    { label: 'Laporan', href: '/admin/reports', icon: <BarChart3 size={18} /> },
    { label: 'Staff', href: '/admin/staff', icon: <Users size={18} /> },
    { label: 'Pengiriman', href: '/admin/shipping', icon: <Truck size={18} /> },
    { label: 'Laundry', href: '/admin/laundry', icon: <WashingMachine size={18} /> },
    { label: 'Landing', href: '/admin/landing-settings', icon: <Settings size={18} /> },
    { label: 'SEO', href: '/admin/seo', icon: <Search size={18} /> }
  ],
  gudang: [
    { label: 'Dashboard', href: '/gudang', icon: <LayoutDashboard size={18} /> },
    { label: 'Produksi', href: '/gudang/production', icon: <Warehouse size={18} /> },
    { label: 'Steam & QC Jahitan', href: '/gudang/steam', icon: <Package size={18} /> },
    { label: 'QC Per-Item & Retur', href: '/gudang/qc', icon: <Wrench size={18} /> },
    { label: 'Posisi Stok', href: '/gudang/stock', icon: <Package size={18} /> },
    { label: 'Alerts', href: '/gudang/alerts', icon: <Calendar size={18} /> },
    { label: 'Lembur', href: '/gudang/lembur', icon: <Calendar size={18} /> }
  ],
  penjahit: [
    { label: 'Dashboard', href: '/penjahit', icon: <LayoutDashboard size={18} /> },
    { label: 'Job Queue', href: '/penjahit/jobs', icon: <Scissors size={18} /> },
    { label: 'Rekap', href: '/penjahit/reports', icon: <BarChart3 size={18} /> },
    { label: 'Riwayat', href: '/penjahit/history', icon: <BarChart3 size={18} /> }
  ],
  finance: [
    { label: 'Dashboard', href: '/finance', icon: <LayoutDashboard size={18} /> },
    { label: 'Akun', href: '/finance/accounts', icon: <Book size={18} /> },
    { label: 'Hutang', href: '/finance/hutang', icon: <CreditCard size={18} /> },
    { label: 'Piutang', href: '/finance/piutang', icon: <ArrowLeftRight size={18} /> },
    { label: 'Kas & Bank', href: '/finance/cash', icon: <LandPlot size={18} /> },
    { label: 'Aset', href: '/finance/assets', icon: <LandPlot size={18} /> },
    { label: 'Jurnal', href: '/finance/journal', icon: <FileText size={18} /> },
    { label: 'Pembayaran', href: '/finance/payments', icon: <DollarSign size={18} /> },
    { label: 'Laundry Gaji', href: '/finance/laundry-payroll', icon: <WashingMachine size={18} /> },
    { label: 'Laporan Keuangan', href: '/finance/laporan', icon: <BarChart3 size={18} /> }
  ],
  installer: [
    { label: 'Jadwal', href: '/installer', icon: <Calendar size={18} /> },
    { label: 'Laporan', href: '/installer/reports', icon: <BarChart3 size={18} /> }
  ],
  surveyor: [
    { label: 'Dashboard', href: '/surveyor', icon: <LayoutDashboard size={18} /> },
    { label: 'Survey Baru', href: '/surveyor/survey/new', icon: <ClipboardPlus size={18} /> },
    { label: 'Riwayat Survey', href: '/surveyor/history', icon: <History size={18} /> }
  ],
  owner: [
    { label: 'Overview', href: '/owner', icon: <Eye size={18} /> },
    { label: 'Pesanan', href: '/admin/orders', icon: <ShoppingCart size={18} /> },
    { label: 'Pengiriman', href: '/admin/shipping', icon: <Truck size={18} /> },
    { label: 'Material', href: '/owner/materials', icon: <Package size={18} /> },
    { label: 'HPP', href: '/owner/hpp', icon: <DollarSign size={18} /> },
    { label: 'Supplier', href: '/owner/suppliers', icon: <Users size={18} /> },
    { label: 'Riwayat Harga', href: '/owner/suppliers/price-history', icon: <TrendingUp size={18} /> },
    { label: 'Stok Gudang', href: '/gudang/stock', icon: <Warehouse size={18} /> },
    { label: 'Staff', href: '/owner/staff', icon: <Users size={18} /> },
    { label: 'Marketplace', href: '/owner/marketplace', icon: <ShoppingCart size={18} /> },
    { label: 'Top Produk', href: '/owner/products', icon: <Package size={18} /> },
    { label: 'Laporan Keuangan', href: '/owner/laporan', icon: <BarChart3 size={18} /> }
  ]
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  gudang: 'Gudang',
  penjahit: 'Penjahit',
  finance: 'Finance',
  installer: 'Installer',
  surveyor: 'Surveyor',
  owner: 'Owner'
}

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
        <button className="hamburger-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Brand */}
        <a href="/" target="_blank" rel="noopener noreferrer" className="topnav-brand" suppressHydrationWarning>
          KJ <span>Homedecor</span>
        </a>

        {/* Right side: desktop toggle button */}
        <div className="topnav-right">
          <button onClick={onMenuClick} className="desktop-sidebar-btn" title="Buka menu">
            <Menu size={18} />
          </button>
        </div>

        {/* Close user dropdown on outside click */}
        {mobileMenuOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setMobileMenuOpen(false)} />
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
                const isActive = item.href === `/${role}` ? pathname === item.href : pathname.startsWith(item.href)
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
                onClick={() => {
                  setMobileMenuOpen(false)
                  setLogoutOpen(true)
                }}
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
