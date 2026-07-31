'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import Link from 'next/link'
import { FileText, RotateCcw, RefreshCw, DollarSign, Users } from 'lucide-react'

const SUB_MODULES = [
  {
    title: 'Faktur',
    desc: 'Daftar faktur piutang',
    href: '/finance/piutang/faktur',
    icon: <FileText size={20} />,
    color: 'blue'
  },
  {
    title: 'Retur',
    desc: 'Daftar retur piutang',
    href: '/finance/piutang/retur',
    icon: <RotateCcw size={20} />,
    color: 'orange'
  },
  {
    title: 'Proses Retur',
    desc: 'Proses retur piutang',
    href: '/finance/piutang/process',
    icon: <RefreshCw size={20} />,
    color: 'purple'
  },
  {
    title: 'Pembayaran',
    desc: 'Pembayaran piutang',
    href: '/finance/piutang/payment',
    icon: <DollarSign size={20} />,
    color: 'green'
  },
  {
    title: 'Piutang Chanel',
    desc: 'Piutang dari marketplace channel',
    href: '/finance/piutang/channel',
    icon: <Users size={20} />,
    color: 'teal'
  }
]

export default function PiutangPage() {
  return (
    <div>
      <PageHeader title="PIUTANG" subtitle="Accounts Receivable - Faktur, Retur, dan Pembayaran" />
      <div className="module-grid">
        {SUB_MODULES.map((m) => (
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
