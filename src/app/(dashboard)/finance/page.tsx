import Link from 'next/link'
import { Package, DollarSign, Users, BarChart3, Calculator } from 'lucide-react'

const MODULES = [
  { title: 'BOM & Material', desc: 'Bill of materials dan database bahan', href: '/finance/materials', icon: <Package size={20} />, color: 'blue' },
  { title: 'HPP Calculator', desc: 'Hitung HPP dari BOM + markup', href: '/finance/hpp', icon: <Calculator size={20} />, color: 'orange' },
  { title: 'Pembayaran', desc: 'Tracking DP/Lunas dan approval gate', href: '/finance/payments', icon: <DollarSign size={20} />, color: 'green' },
  { title: 'Supplier', desc: 'Database supplier dan PO', href: '/finance/suppliers', icon: <Users size={20} />, color: 'purple' },
  { title: 'Laporan', desc: 'Laporan keuangan dan pengupahan', href: '/finance/reports', icon: <BarChart3 size={20} />, color: 'teal' },
]

export default function FinanceDashboard() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard Finance</h1>
        <p className="page-subtitle">Kelola BOM, HPP, pembayaran, dan laporan keuangan</p>
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
