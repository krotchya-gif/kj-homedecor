import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { Calendar, CheckCircle2, BarChart3 } from 'lucide-react'

const MODULES = [
  {
    title: 'Jadwal',
    desc: 'Jadwal pemasangan yang ditugaskan',
    href: '/installer/schedule',
    icon: <Calendar size={20} />,
    color: 'blue'
  },
  {
    title: 'Checklist',
    desc: 'Checklist pemasangan per job',
    href: '/installer/checklist',
    icon: <CheckCircle2 size={20} />,
    color: 'green'
  },
  {
    title: 'Laporan',
    desc: 'Riwayat instalasi selesai',
    href: '/installer/reports',
    icon: <BarChart3 size={20} />,
    color: 'orange'
  }
]

export default function InstallerDashboard() {
  return (
    <div>
      <PageHeader title="Dashboard Installer" subtitle="Jadwal pemasangan dan checklist pekerjaan" />
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
