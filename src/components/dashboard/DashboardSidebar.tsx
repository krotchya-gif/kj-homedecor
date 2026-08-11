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
  WashingMachine,
  TrendingUp,
  Search,
  Settings,
  Book,
  CreditCard,
  ArrowLeftRight,
  LandPlot,
  FileText,
  ShoppingBag,
  ClipboardPlus,
  History,
  ClipboardList,
  Scale
} from 'lucide-react'
import { useState } from 'react'
import ThemeToggle from '@/components/ui/ThemeToggle'
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

interface NavGroup {
  title: string
  items: NavItem[]
}

const NAV_BY_ROLE: Record<string, NavGroup[]> = {
  admin: [
    {
      title: 'Utama',
      items: [
        { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={18} /> },
        { label: 'Pesanan', href: '/admin/orders', icon: <ShoppingCart size={18} /> },
        { label: 'Booking', href: '/admin/booking', icon: <Calendar size={18} /> },
        { label: 'Survey', href: '/admin/surveys', icon: <ClipboardList size={18} /> }
      ]
    },
    {
      title: 'Katalog & Pelanggan',
      items: [
        { label: 'Katalog', href: '/admin/catalog', icon: <Package size={18} /> },
        { label: 'Pelanggan', href: '/admin/customers', icon: <Users size={18} /> },
        { label: 'Portofolio', href: '/admin/portfolio', icon: <ImageIcon size={18} /> }
      ]
    },
    {
      title: 'Operasional',
      items: [
        { label: 'Pengiriman', href: '/admin/shipping', icon: <Truck size={18} /> },
        { label: 'Laundry', href: '/admin/laundry', icon: <WashingMachine size={18} /> },
        { label: 'Staff', href: '/admin/staff', icon: <Users size={18} /> }
      ]
    },
    {
      title: 'Konten & Laporan',
      items: [
        { label: 'Landing', href: '/admin/landing-settings', icon: <Settings size={18} /> },
        { label: 'SEO', href: '/admin/seo', icon: <Search size={18} /> },
        { label: 'Laporan', href: '/admin/reports', icon: <BarChart3 size={18} /> }
      ]
    }
  ],
  gudang: [
    {
      title: 'Utama',
      items: [{ label: 'Dashboard', href: '/gudang', icon: <LayoutDashboard size={18} /> }]
    },
    {
      title: 'Produksi',
      items: [
        { label: 'Produksi', href: '/gudang/production', icon: <Warehouse size={18} /> },
        { label: 'Steam & QC Jahitan', href: '/gudang/steam', icon: <Package size={18} /> },
        { label: 'QC Per-Item & Retur', href: '/gudang/qc', icon: <Wrench size={18} /> }
      ]
    },
    {
      title: 'Inventori',
      items: [
        { label: 'Posisi Stok', href: '/gudang/stock', icon: <Package size={18} /> },
        { label: 'Alerts', href: '/gudang/alerts', icon: <Calendar size={18} /> },
        { label: 'Lembur', href: '/gudang/lembur', icon: <Calendar size={18} /> }
      ]
    }
  ],
  penjahit: [
    {
      title: 'Utama',
      items: [
        { label: 'Dashboard', href: '/penjahit', icon: <LayoutDashboard size={18} /> },
        { label: 'Job Queue', href: '/penjahit/jobs', icon: <Scissors size={18} /> }
      ]
    },
    {
      title: 'Laporan',
      items: [
        { label: 'Rekap', href: '/penjahit/reports', icon: <BarChart3 size={18} /> },
        { label: 'Riwayat', href: '/penjahit/history', icon: <BarChart3 size={18} /> }
      ]
    }
  ],
  finance: [
    {
      title: 'Utama',
      items: [{ label: 'Dashboard', href: '/finance', icon: <LayoutDashboard size={18} /> }]
    },
    {
      title: 'Kas & Bank',
      items: [
        { label: 'Kas & Bank', href: '/finance/cash', icon: <LandPlot size={18} /> },
        { label: 'Mutasi Kas', href: '/finance/cash/mutation', icon: <ArrowLeftRight size={18} /> },
        { label: 'Pemasukan', href: '/finance/cash/income', icon: <TrendingUp size={18} /> },
        { label: 'Pengeluaran', href: '/finance/cash/expense', icon: <DollarSign size={18} /> },
        { label: 'Transfer Internal Kas', href: '/finance/cash/transfer', icon: <ArrowLeftRight size={18} /> }
      ]
    },
    {
      title: 'Hutang & Piutang',
      items: [
        { label: 'Hutang', href: '/finance/hutang', icon: <CreditCard size={18} /> },
        { label: 'Piutang', href: '/finance/piutang', icon: <ArrowLeftRight size={18} /> },
        { label: 'Cek Pembayaran', href: '/finance/payments', icon: <DollarSign size={18} /> },
        { label: 'Marketplace', href: '/owner/marketplace', icon: <ShoppingBag size={18} /> },
        { label: 'TikTok Shop', href: '/owner/tiktok', icon: <ShoppingBag size={18} /> }
      ]
    },
    {
      title: 'Akuntansi',
      items: [
        { label: 'Akun', href: '/finance/accounts', icon: <Book size={18} /> },
        { label: 'Aset', href: '/finance/assets', icon: <LandPlot size={18} /> },
        { label: 'Jurnal', href: '/finance/journal', icon: <FileText size={18} /> },
        { label: 'Laundry Gaji', href: '/finance/laundry-payroll', icon: <WashingMachine size={18} /> },
        { label: 'Rekonsiliasi', href: '/finance/rekonsiliasi', icon: <Scale size={18} /> }
      ]
    },
    {
      title: 'Laporan & Pengaturan',
      items: [
        { label: 'Laporan Keuangan', href: '/finance/laporan', icon: <BarChart3 size={18} /> },
        { label: 'Pengaturan', href: '/finance/settings', icon: <Settings size={18} /> }
      ]
    }
  ],
  installer: [
    {
      title: 'Utama',
      items: [
        { label: 'Jadwal', href: '/installer', icon: <Calendar size={18} /> },
        { label: 'Laporan', href: '/installer/reports', icon: <BarChart3 size={18} /> }
      ]
    }
  ],
  surveyor: [
    {
      title: 'Utama',
      items: [
        { label: 'Dashboard', href: '/surveyor', icon: <LayoutDashboard size={18} /> },
        { label: 'Survey Baru', href: '/surveyor/survey/new', icon: <ClipboardPlus size={18} /> },
        { label: 'Riwayat Survey', href: '/surveyor/history', icon: <History size={18} /> }
      ]
    }
  ],
  laundry: [
    {
      title: 'Utama',
      items: [
        { label: 'Tugas Laundry', href: '/laundry', icon: <WashingMachine size={18} /> }
      ]
    }
  ],
  owner: [
    {
      title: 'Utama',
      items: [
        { label: 'Overview', href: '/owner', icon: <Eye size={18} /> },
        { label: 'Pesanan', href: '/admin/orders', icon: <ShoppingCart size={18} /> },
        { label: 'Survey', href: '/owner/surveys', icon: <ClipboardList size={18} /> },
        { label: 'Pengiriman', href: '/admin/shipping', icon: <Truck size={18} /> }
      ]
    },
    {
      title: 'Produk & Material',
      items: [
        { label: 'Material', href: '/owner/materials', icon: <Package size={18} /> },
        { label: 'HPP', href: '/owner/hpp', icon: <DollarSign size={18} /> },
        { label: 'Supplier', href: '/owner/suppliers', icon: <Users size={18} /> },
        { label: 'Riwayat Harga', href: '/owner/suppliers/price-history', icon: <TrendingUp size={18} /> },
        { label: 'Stok Gudang', href: '/gudang/stock', icon: <Warehouse size={18} /> },
        { label: 'Top Produk', href: '/owner/products', icon: <Package size={18} /> }
      ]
    },
    {
      title: 'Sales & Marketplace',
      items: [
        { label: 'Marketplace', href: '/owner/marketplace', icon: <ShoppingCart size={18} /> },
        { label: 'TikTok Shop', href: '/owner/tiktok', icon: <ShoppingBag size={18} /> }
      ]
    },
    {
      title: 'Organisasi',
      items: [
        { label: 'Staff', href: '/owner/staff', icon: <Users size={18} /> },
        { label: 'Laporan Keuangan', href: '/owner/laporan', icon: <BarChart3 size={18} /> },
        { label: 'Pengaturan', href: '/owner/settings', icon: <Settings size={18} /> }
      ]
    }
  ]
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  gudang: 'Gudang',
  penjahit: 'Penjahit',
  finance: 'Finance',
  installer: 'Installer',
  surveyor: 'Surveyor',
  laundry: 'Laundry',
  owner: 'Owner'
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
                const isActive = item.href === `/${role}` ? pathname === item.href : pathname.startsWith(item.href)
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
