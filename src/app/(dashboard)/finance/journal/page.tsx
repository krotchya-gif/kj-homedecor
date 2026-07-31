'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import Link from 'next/link'
import { FileText, ExternalLink } from 'lucide-react'

const SUB_MODULES = [
  {
    title: 'Jurnal Otomatis',
    desc: 'Input dan kelola jurnal manual',
    href: '/finance/journal/auto',
    icon: <FileText size={20} />,
    color: 'blue'
  }
]

export default function JournalPage() {
  return (
    <div>
      <PageHeader title="JURNAL" subtitle="Input dan kelola jurnal manual" />

      <div style={{ marginBottom: '2rem' }}>
        <h2
          style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: '#6b7280',
            marginBottom: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Menu
        </h2>
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

      <div>
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}
        >
          <h2
            style={{
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#6b7280',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Laporan Keuangan
          </h2>
          <Link
            href="/finance/laporan"
            className="flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            <ExternalLink size={14} />
            Lihat Semua
          </Link>
        </div>
        <div className="module-grid">
          <Link href="/finance/laporan" className="module-card">
            <div className="module-card-icon green">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="module-card-body">
              <div className="module-card-title">10 Laporan Keuangan</div>
              <div className="module-card-desc">Neraca, Laba Rugi, Buku Besar, Jurnal, dan lainnya</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
