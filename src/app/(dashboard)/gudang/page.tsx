import Link from 'next/link'
import { Warehouse, Package, Calendar, BarChart3, AlertTriangle, Layers, Wrench } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { MotionStagger, MotionItem } from '@/components/ui/Motion'

const MODULES = [
  {
    title: 'Proses Pesanan',
    desc: 'Queue produksi dan tracking status',
    href: '/gudang/production',
    icon: <Layers size={20} />,
    color: 'orange'
  },
  {
    title: 'Steam & QC Jahitan',
    desc: 'QC jahitan penjahit + laundry entry',
    href: '/gudang/steam',
    icon: <Warehouse size={20} />,
    color: 'blue'
  },
  {
    title: 'QC Per-Item & Retur',
    desc: 'Ceklist per item + verifikasi retur',
    href: '/gudang/qc',
    icon: <Wrench size={20} />,
    color: 'amber'
  },
  { title: 'Posisi Stok', desc: 'Gudang vs Toko', href: '/gudang/stock', icon: <Package size={20} />, color: 'green' },
  {
    title: 'Monitor Stok',
    desc: 'Low stock alerts & PR',
    href: '/gudang/alerts',
    icon: <AlertTriangle size={20} />,
    color: 'red'
  },
  {
    title: 'Lembur',
    desc: 'Input jam lembur staff',
    href: '/gudang/lembur',
    icon: <Calendar size={20} />,
    color: 'purple'
  },
  {
    title: 'Laporan',
    desc: 'Riwayat pergerakan stok',
    href: '/gudang/reports',
    icon: <BarChart3 size={20} />,
    color: 'teal'
  }
]

export default function GudangDashboard() {
  return (
    <div>
      <PageHeader title="Dashboard Gudang" subtitle="Kelola produksi, stok, laundry/steam, dan lembur" />
      <MotionStagger className="module-grid">
        {MODULES.map((m) => (
          <MotionItem key={m.href}>
            <Link href={m.href} className="module-card">
              <div className={`module-card-icon ${m.color}`}>{m.icon}</div>
              <div className="module-card-body">
                <div className="module-card-title">{m.title}</div>
                <div className="module-card-desc">{m.desc}</div>
              </div>
            </Link>
          </MotionItem>
        ))}
      </MotionStagger>
    </div>
  )
}
