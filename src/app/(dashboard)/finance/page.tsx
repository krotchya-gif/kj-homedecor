import Link from 'next/link'
import { DollarSign, BarChart3, WashingMachine } from 'lucide-react'

const MODULES = [
  { title: 'Pembayaran', desc: 'Tracking DP/Lunas dan approval gate', href: '/finance/payments', icon: <DollarSign size={20} />, color: 'green' },
  { title: 'Laporan', desc: 'Laporan keuangan dan pengupahan', href: '/finance/reports', icon: <BarChart3 size={20} />, color: 'teal' },
  { title: 'Laundry Gaji', desc: 'Gaji staff laundry per periode', href: '/finance/laundry-payroll', icon: <WashingMachine size={20} />, color: 'blue' },
]

export default function FinanceDashboard() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard Finance</h1>
        <p className="page-subtitle">Kelola pembayaran, laporan keuangan dan payroll laundry</p>
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
