import Link from 'next/link'
import { Package, Tag, ImageIcon, Plus } from 'lucide-react'

const CATALOG_MODULES = [
  {
    title: 'Produk',
    desc: 'CRUD produk — nama, SKU, harga, stok, foto',
    href: '/admin/catalog/products',
    icon: <Package size={22} />,
    color: 'orange',
  },
  {
    title: 'Kategori',
    desc: 'Kelola kategori produk dengan slug',
    href: '/admin/catalog/categories',
    icon: <Tag size={22} />,
    color: 'blue',
  },
  {
    title: 'Banner & Hero',
    desc: 'Upload dan atur banner landing page',
    href: '/admin/catalog/banners',
    icon: <ImageIcon size={22} />,
    color: 'green',
  },
]

export default function CatalogPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Katalog</h1>
        <p className="page-subtitle">Kelola produk, kategori, dan tampilan landing page</p>
      </div>
      <div className="module-grid">
        {CATALOG_MODULES.map((mod) => (
          <Link key={mod.href} href={mod.href} className="module-card">
            <div className={`module-card-icon ${mod.color}`}>{mod.icon}</div>
            <div className="module-card-body">
              <div className="module-card-title">{mod.title}</div>
              <div className="module-card-desc">{mod.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
