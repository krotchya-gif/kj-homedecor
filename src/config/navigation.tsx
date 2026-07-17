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
} from 'lucide-react'
import type { ReactNode } from 'react'

export interface NavItem {
  label: string
  href: string
  icon: ReactNode
}

export const NAV_BY_ROLE: Record<string, NavItem[]> = {
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
    { label: 'SEO', href: '/admin/seo', icon: <Search size={18} /> },
  ],
  gudang: [
    { label: 'Dashboard', href: '/gudang', icon: <LayoutDashboard size={18} /> },
    { label: 'Produksi', href: '/gudang/production', icon: <Warehouse size={18} /> },
    { label: 'Steam & QC Jahitan', href: '/gudang/steam', icon: <Package size={18} /> },
    { label: 'QC Per-Item & Retur', href: '/gudang/qc', icon: <Wrench size={18} /> },
    { label: 'Posisi Stok', href: '/gudang/stock', icon: <Package size={18} /> },
    { label: 'Alerts', href: '/gudang/alerts', icon: <Calendar size={18} /> },
    { label: 'Lembur', href: '/gudang/lembur', icon: <Calendar size={18} /> },
  ],
  penjahit: [
    { label: 'Dashboard', href: '/penjahit', icon: <LayoutDashboard size={18} /> },
    { label: 'Job Queue', href: '/penjahit/jobs', icon: <Scissors size={18} /> },
    { label: 'Rekap', href: '/penjahit/reports', icon: <BarChart3 size={18} /> },
    { label: 'Riwayat', href: '/penjahit/history', icon: <BarChart3 size={18} /> },
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
    { label: 'Laporan Keuangan', href: '/finance/laporan', icon: <BarChart3 size={18} /> },
  ],
  installer: [
    { label: 'Jadwal', href: '/installer', icon: <Calendar size={18} /> },
    { label: 'Laporan', href: '/installer/reports', icon: <BarChart3 size={18} /> },
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
    { label: 'Laporan Keuangan', href: '/owner/laporan', icon: <BarChart3 size={18} /> },
  ],
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  gudang: 'Gudang',
  penjahit: 'Penjahit',
  finance: 'Finance',
  installer: 'Installer',
  owner: 'Owner',
}
