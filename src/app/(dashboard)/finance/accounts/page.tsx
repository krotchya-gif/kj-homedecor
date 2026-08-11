'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import Link from 'next/link'
import { Book, FolderOpen, GitBranch, ArrowLeftRight } from 'lucide-react'

const SUB_MODULES = [
  {
    title: 'Daftar Akun',
    desc: 'Chart of accounts - kode, nama, tipe, saldo',
    href: '/finance/accounts/accounts',
    icon: <Book size={20} />,
    color: 'blue'
  },
  {
    title: 'Kategori',
    desc: 'Kategori akun: asset, liability, equity, revenue, expense',
    href: '/finance/accounts/categories',
    icon: <FolderOpen size={20} />,
    color: 'green'
  },
  {
    title: 'Pemetaan Akun',
    desc: 'Mapping untuk jurnal otomatis per transaksi',
    href: '/finance/accounts/mapping',
    icon: <GitBranch size={20} />,
    color: 'orange'
  },
  {
    title: 'Pemetaan Selisih',
    desc: 'Mapping selisih kurs/selisih harga',
    href: '/finance/accounts/mapping-difference',
    icon: <ArrowLeftRight size={20} />,
    color: 'purple'
  }
]

export default function AccountsPage() {
  return (
    <div>
      <PageHeader title="AKUN" subtitle="Chart of Accounts dan Kategori Akun" />
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
