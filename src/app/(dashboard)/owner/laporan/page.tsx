'use client'

import Link from 'next/link'
import {
  FileText,
  TrendingUp,
  BookOpen,
  List,
  LandPlot,
  Clock,
  BarChart3,
  DollarSign,
  CreditCard,
  Tag,
  Eye
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

const REPORTS = [
  {
    title: 'Neraca',
    desc: 'Laporan posisi keuangan (Aset, Liabilitas, Ekuitas)',
    href: '/owner/laporan/neraca',
    icon: <FileText size={24} />,
    color: 'orange'
  },
  {
    title: 'Laba Rugi',
    desc: 'Profit & Loss statement',
    href: '/owner/laporan/laba-rugi',
    icon: <TrendingUp size={24} />,
    color: 'green'
  },
  {
    title: 'Buku Besar',
    desc: 'General ledger per akun',
    href: '/owner/laporan/buku-besar',
    icon: <BookOpen size={24} />,
    color: 'blue'
  },
  {
    title: 'Daftar Jurnal',
    desc: 'Journal entries list',
    href: '/owner/laporan/daftar-jurnal',
    icon: <List size={24} />,
    color: 'purple'
  },
  {
    title: 'Mutasi Kas & Bank',
    desc: 'Perubahan saldo kas dan bank',
    href: '/owner/laporan/mutasi-kas',
    icon: <LandPlot size={24} />,
    color: 'teal'
  },
  {
    title: 'Kronologi HPP',
    desc: 'Harga pokok penjualan per periode',
    href: '/owner/laporan/kronologi-hpp',
    icon: <Clock size={24} />,
    color: 'orange'
  },
  {
    title: 'Neraca Saldo',
    desc: 'Daftar aktivitas akun (debit-kredit)',
    href: '/owner/laporan/neraca-saldo',
    icon: <BarChart3 size={24} />,
    color: 'indigo'
  },
  {
    title: 'Performa Per Tag',
    desc: 'Ringkasan laba rugi per tag/marketplace',
    href: '/owner/laporan/performa-tag',
    icon: <Tag size={24} />,
    color: 'pink'
  },
  {
    title: 'Umur Piutang',
    desc: 'Umur piutang per pelanggan',
    href: '/owner/laporan/umur-piutang',
    icon: <DollarSign size={24} />,
    color: 'green'
  },
  {
    title: 'Umur Hutang',
    desc: 'Umur hutang per pemasok',
    href: '/owner/laporan/umur-hutang',
    icon: <CreditCard size={24} />,
    color: 'red'
  }
]

const COLOR_MAP: Record<string, string> = {
  orange: 'bg-orange-50 border-orange-200 text-orange-600',
  green: 'bg-green-50 border-green-200 text-green-600',
  blue: 'bg-blue-50 border-blue-200 text-blue-600',
  purple: 'bg-purple-50 border-purple-200 text-purple-600',
  teal: 'bg-teal-50 border-teal-200 text-teal-600',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-600',
  pink: 'bg-pink-50 border-pink-200 text-pink-600',
  red: 'bg-red-50 border-red-200 text-red-600'
}

export default function LaporanOwnerPage() {
  return (
    <div>
      <PageHeader title="Laporan Keuangan" subtitle="Kelola dan download laporan keuangan perusahaan" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {REPORTS.map((report) => (
          <Link
            key={report.href}
            href={report.href}
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'box-shadow 0.15s'
            }}
            className="hover:shadow-md"
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${COLOR_MAP[report.color]}`}>
                {report.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: '700', fontSize: '0.95rem', color: '#374151', marginBottom: '0.25rem' }}>
                  {report.title}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: 0 }}>{report.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
