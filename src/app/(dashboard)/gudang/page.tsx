import Link from 'next/link'
import { Warehouse, Package, Calendar, BarChart3, AlertTriangle, Layers } from 'lucide-react'

const MODULES = [
  { title: 'Proses Pesanan', desc: 'Queue produksi dan tracking status', href: '/gudang/production', icon: <Layers size={20} />, color: 'orange' },
  { title: 'Barang Masuk', desc: 'Laundry & Steam entry', href: '/gudang/steam', icon: <Warehouse size={20} />, color: 'blue' },
  { title: 'Posisi Stok', desc: 'Gudang vs Toko', href: '/gudang/stock', icon: <Package size={20} />, color: 'green' },
  { title: 'Monitor Stok', desc: 'Low stock alerts & PR', href: '/gudang/alerts', icon: <AlertTriangle size={20} />, color: 'red' },
  { title: 'Lembur', desc: 'Input jam lembur staff', href: '/gudang/lembur', icon: <Calendar size={20} />, color: 'purple' },
  { title: 'Laporan', desc: 'Riwayat pergerakan stok', href: '/gudang/reports', icon: <BarChart3 size={20} />, color: 'teal' },
]

export default function GudangDashboard() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard Gudang</h1>
        <p className="page-subtitle">Kelola produksi, stok, laundry/steam, dan lembur</p>
      </div>
      <div className="module-grid">
        {MODULES.map((m) => (
          <Link key={m.href} href={m.href} className="module-card">
            <div className={`module-card-icon ${m.color}`}>{m.icon}</div>
            <div className="module-card-body">
              <div className="module-card-title">{m.title}</div>
              <div className="module-card-desc">{m.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
