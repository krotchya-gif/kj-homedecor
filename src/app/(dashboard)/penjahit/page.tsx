import Link from 'next/link'
import { Scissors, BarChart3, Calendar } from 'lucide-react'

const MODULES = [
  { title: 'Job Queue', desc: 'Daftar pekerjaan yang menunggu', href: '/penjahit/jobs', icon: <Scissors size={20} />, color: 'orange' },
  { title: 'Rekap Bulanan', desc: 'Total meter dan estimasi upah', href: '/penjahit/reports', icon: <BarChart3 size={20} />, color: 'green' },
  { title: 'Riwayat', desc: 'Job yang sudah selesai', href: '/penjahit/history', icon: <Calendar size={20} />, color: 'blue' },
]

export default function PenjahitDashboard() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard Penjahit</h1>
        <p className="page-subtitle">Lihat job queue dan rekap meter pengerjaan bulanan</p>
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
