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
  LogOut,
  X,
  Truck,
  Search,
  Settings,
} from 'lucide-react'
import { useState } from 'react'
import ThemeToggle from '@/components/ui/ThemeToggle'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
    { label: 'Landing', href: '/admin/landing-settings', icon: <Settings size={18} /> },
    { label: 'SEO', href: '/admin/seo', icon: <Search size={18} /> },
  ],
  gudang: [
    { label: 'Dashboard', href: '/gudang', icon: <LayoutDashboard size={18} /> },
    { label: 'Produksi', href: '/gudang/production', icon: <Warehouse size={18} /> },
    { label: 'Laundry/Steam', href: '/gudang/steam', icon: <Package size={18} /> },
    { label: 'Posisi Stok', href: '/gudang/stock', icon: <Package size={18} /> },
    { label: 'Alerts', href: '/gudang/alerts', icon: <Calendar size={18} /> },
    { label: 'Lembur', href: '/gudang/lembur', icon: <Calendar size={18} /> },
    { label: 'QC', href: '/gudang/qc', icon: <Wrench size={18} /> },
  ],
  penjahit: [
    { label: 'Dashboard', href: '/penjahit', icon: <LayoutDashboard size={18} /> },
    { label: 'Job Queue', href: '/penjahit/jobs', icon: <Scissors size={18} /> },
    { label: 'Rekap', href: '/penjahit/reports', icon: <BarChart3 size={18} /> },
    { label: 'Riwayat', href: '/penjahit/history', icon: <BarChart3 size={18} /> },
  ],
  finance: [
    { label: 'Dashboard', href: '/finance', icon: <LayoutDashboard size={18} /> },
    { label: 'BOM & Material', href: '/finance/materials', icon: <Package size={18} /> },
    { label: 'HPP', href: '/finance/hpp', icon: <DollarSign size={18} /> },
    { label: 'Pembayaran', href: '/finance/payments', icon: <DollarSign size={18} /> },
    { label: 'Supplier', href: '/finance/suppliers', icon: <Users size={18} /> },
    { label: 'Laporan', href: '/finance/reports', icon: <BarChart3 size={18} /> },
  ],
  installer: [
    { label: 'Jadwal', href: '/installer', icon: <Calendar size={18} /> },
    { label: 'Laporan', href: '/installer/reports', icon: <BarChart3 size={18} /> },
  ],
  owner: [
    { label: 'Overview', href: '/owner', icon: <Eye size={18} /> },
    { label: 'Pesanan', href: '/admin/orders', icon: <ShoppingCart size={18} /> },
    { label: 'Pengiriman', href: '/admin/shipping', icon: <Truck size={18} /> },
    { label: 'Stok Gudang', href: '/gudang/stock', icon: <Warehouse size={18} /> },
    { label: 'Staff', href: '/owner/staff', icon: <Users size={18} /> },
    { label: 'Marketplace', href: '/owner/marketplace', icon: <ShoppingCart size={18} /> },
    { label: 'Top Produk', href: '/owner/products', icon: <Package size={18} /> },
    { label: 'Laporan', href: '/admin/reports', icon: <BarChart3 size={18} /> },
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
  const navItems = NAV_BY_ROLE[role] ?? []

  async function handleLogout() {
    setLogoutOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Overlay backdrop */}
      {open && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

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

        {/* Nav items */}
        <div className="sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              item.href === `/${role}`
                ? pathname === item.href
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Footer: theme toggle + logout */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-top">
            <ThemeToggle />
            <button
              className="sidebar-logout-btn"
              onClick={() => setLogoutOpen(true)}
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