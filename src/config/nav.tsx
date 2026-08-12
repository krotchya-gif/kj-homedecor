'use client'

import type { LucideIcon } from 'lucide-react'
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

// Satu-satunya sumber konfigurasi navigasi per role.
// Dipakai bersama oleh DashboardSidebar (grouped) & DashboardTopNav (flat/mobile).
// icon = component reference (LucideIcon) → dirender dengan <item.icon size={18} />.

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  gudang: 'Gudang',
  penjahit: 'Penjahit',
  finance: 'Finance',
  installer: 'Installer',
  surveyor: 'Surveyor',
  laundry: 'Laundry',
  owner: 'Owner'
}

export const NAV_BY_ROLE: Record<string, NavGroup[]> = {
  admin: [
    {
      title: 'Utama',
      items: [
        { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { label: 'Pesanan', href: '/admin/orders', icon: ShoppingCart },
        { label: 'Booking', href: '/admin/booking', icon: Calendar },
        { label: 'Survey', href: '/admin/surveys', icon: ClipboardList }
      ]
    },
    {
      title: 'Katalog & Pelanggan',
      items: [
        { label: 'Katalog', href: '/admin/catalog', icon: Package },
        { label: 'Pelanggan', href: '/admin/customers', icon: Users },
        { label: 'Portofolio', href: '/admin/portfolio', icon: ImageIcon }
      ]
    },
    {
      title: 'Operasional',
      items: [
        { label: 'Pengiriman', href: '/admin/shipping', icon: Truck },
        { label: 'TikTok Shop', href: '/admin/tiktok', icon: ShoppingBag },
        { label: 'Laundry', href: '/admin/laundry', icon: WashingMachine },
        { label: 'Staff', href: '/admin/staff', icon: Users }
      ]
    },
    {
      title: 'Konten & Laporan',
      items: [
        { label: 'Landing', href: '/admin/landing-settings', icon: Settings },
        { label: 'SEO', href: '/admin/seo', icon: Search },
        { label: 'Laporan', href: '/admin/reports', icon: BarChart3 }
      ]
    }
  ],
  gudang: [
    {
      title: 'Utama',
      items: [{ label: 'Dashboard', href: '/gudang', icon: LayoutDashboard }]
    },
    {
      title: 'Produksi',
      items: [
        { label: 'Produksi', href: '/gudang/production', icon: Warehouse },
        { label: 'Steam & QC Jahitan', href: '/gudang/steam', icon: Package },
        { label: 'QC Per-Item & Retur', href: '/gudang/qc', icon: Wrench }
      ]
    },
    {
      title: 'Inventori',
      items: [
        { label: 'Posisi Stok', href: '/gudang/stock', icon: Package },
        { label: 'Alerts', href: '/gudang/alerts', icon: Calendar },
        { label: 'Lembur', href: '/gudang/lembur', icon: Calendar },
        { label: 'Stock Opname', href: '/gudang/stock-opname', icon: ClipboardList }
      ]
    }
  ],
  penjahit: [
    {
      title: 'Utama',
      items: [
        { label: 'Dashboard', href: '/penjahit', icon: LayoutDashboard },
        { label: 'Job Queue', href: '/penjahit/jobs', icon: Scissors }
      ]
    },
    {
      title: 'Laporan',
      items: [
        { label: 'Rekap', href: '/penjahit/reports', icon: BarChart3 },
        { label: 'Riwayat', href: '/penjahit/history', icon: BarChart3 }
      ]
    }
  ],
  finance: [
    {
      title: 'Utama',
      items: [{ label: 'Dashboard', href: '/finance', icon: LayoutDashboard }]
    },
    {
      title: 'Kas & Bank',
      items: [
        { label: 'Kas & Bank', href: '/finance/cash', icon: LandPlot },
        { label: 'Mutasi Kas', href: '/finance/cash/mutation', icon: ArrowLeftRight },
        { label: 'Pemasukan', href: '/finance/cash/income', icon: TrendingUp },
        { label: 'Pengeluaran', href: '/finance/cash/expense', icon: DollarSign },
        { label: 'Transfer Internal Kas', href: '/finance/cash/transfer', icon: ArrowLeftRight }
      ]
    },
    {
      title: 'Hutang & Piutang',
      items: [
        { label: 'Hutang', href: '/finance/hutang', icon: CreditCard },
        { label: 'Piutang', href: '/finance/piutang', icon: ArrowLeftRight },
        { label: 'Cek Pembayaran', href: '/finance/payments', icon: DollarSign },
        { label: 'Marketplace', href: '/owner/marketplace', icon: ShoppingBag },
        { label: 'TikTok Shop', href: '/owner/tiktok', icon: ShoppingBag }
      ]
    },
    {
      title: 'Akuntansi',
      items: [
        { label: 'Akun', href: '/finance/accounts', icon: Book },
        { label: 'Aset', href: '/finance/assets', icon: LandPlot },
        { label: 'Jurnal', href: '/finance/journal', icon: FileText },
        { label: 'Laundry Gaji', href: '/finance/laundry-payroll', icon: WashingMachine },
        { label: 'Rekonsiliasi', href: '/finance/rekonsiliasi', icon: Scale },
        { label: 'Stock Opname', href: '/finance/stock-opname', icon: ClipboardList }
      ]
    },
    {
      title: 'Laporan & Pengaturan',
      items: [
        { label: 'Laporan Keuangan', href: '/finance/laporan', icon: BarChart3 },
        { label: 'Pengaturan', href: '/finance/settings', icon: Settings }
      ]
    }
  ],
  installer: [
    {
      title: 'Utama',
      items: [
        { label: 'Jadwal', href: '/installer', icon: Calendar },
        { label: 'Laporan', href: '/installer/reports', icon: BarChart3 }
      ]
    }
  ],
  surveyor: [
    {
      title: 'Utama',
      items: [
        { label: 'Dashboard', href: '/surveyor', icon: LayoutDashboard },
        { label: 'Survey Baru', href: '/surveyor/survey/new', icon: ClipboardPlus },
        { label: 'Riwayat Survey', href: '/surveyor/history', icon: History }
      ]
    }
  ],
  laundry: [
    {
      title: 'Utama',
      items: [{ label: 'Tugas Laundry', href: '/laundry', icon: WashingMachine }]
    }
  ],
  owner: [
    {
      title: 'Utama',
      items: [
        { label: 'Overview', href: '/owner', icon: Eye },
        { label: 'Pesanan', href: '/admin/orders', icon: ShoppingCart },
        { label: 'Survey', href: '/owner/surveys', icon: ClipboardList },
        { label: 'Pengiriman', href: '/admin/shipping', icon: Truck }
      ]
    },
    {
      title: 'Produk & Material',
      items: [
        { label: 'Material', href: '/owner/materials', icon: Package },
        { label: 'HPP', href: '/owner/hpp', icon: DollarSign },
        { label: 'Supplier', href: '/owner/suppliers', icon: Users },
        { label: 'Riwayat Harga', href: '/owner/suppliers/price-history', icon: TrendingUp },
        { label: 'Stok Gudang', href: '/gudang/stock', icon: Warehouse },
        { label: 'Top Produk', href: '/owner/products', icon: Package }
      ]
    },
    {
      title: 'Sales & Marketplace',
      items: [
        { label: 'Marketplace', href: '/owner/marketplace', icon: ShoppingCart },
        { label: 'TikTok Shop', href: '/owner/tiktok', icon: ShoppingBag }
      ]
    },
    {
      title: 'Organisasi',
      items: [
        { label: 'Staff', href: '/owner/staff', icon: Users },
        { label: 'Laporan Keuangan', href: '/owner/laporan', icon: BarChart3 },
        { label: 'Pengaturan', href: '/owner/settings', icon: Settings }
      ]
    }
  ]
}

/** Flatten grouped nav → list flat (untuk TopNav mobile). */
export function flattenNav(role: string): NavItem[] {
  return (NAV_BY_ROLE[role] ?? []).flatMap((g) => g.items)
}
