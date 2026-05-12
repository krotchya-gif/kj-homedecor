'use client'

import Link from 'next/link'
import { FileText, Download, BarChart3, BookOpen, TrendingUp, List } from 'lucide-react'

const SUB_MODULES = [
  { title: 'Jurnal Otomatis', desc: 'Auto journal entries dari transaksi', href: '/finance/journal/auto', icon: <FileText size={20} />, color: 'blue' },
]

const REPORTS = [
  { title: 'Neraca', desc: 'Laporan posisi keuangan', href: '/finance/journal/reports/balance', icon: <BarChart3 size={20} />, color: 'green' },
  { title: 'Buku Besar', desc: 'General ledger', href: '/finance/journal/reports/ledger', icon: <BookOpen size={20} />, color: 'orange' },
  { title: 'Laba Rugi', desc: 'Profit & Loss statement', href: '/finance/journal/reports/profit-loss', icon: <TrendingUp size={20} />, color: 'red' },
  { title: 'Daftar Jurnal', desc: 'Journal entries list', href: '/finance/journal/reports/journal-list', icon: <List size={20} />, color: 'purple' },
]

export default function JournalPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">JURNAL</h1>
        <p className="page-subtitle">Jurnal otomatis dan laporan keuangan</p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jurnal</h2>
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
        <h2 style={{ fontSize: '0.9rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Laporan</h2>
        <div className="module-grid">
          {REPORTS.map((m) => (
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
    </div>
  )
}