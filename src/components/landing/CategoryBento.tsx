import type { Category } from '@/types'
import { Wind, Lamp, Flower2, Ruler, Home, Hammer, ArrowUpRight } from 'lucide-react'

interface CategoryBentoProps {
  categories: Category[]
  fallbackNames: string[]
}

const ICONS = [Home, Wind, Lamp, Flower2, Ruler, Hammer]
const SUBS = ['Pilihan terlengkap', 'Elegan & ringan', 'Modern minimalis', 'Unik & eksklusif', 'Fungsional & stylish', 'Sesuai permintaan']

/**
 * Kategori → bento asimetris (1 besar + 1 sedang + 4 kecil).
 * Cell pakai foto kategori bila ada, fallback gradient brand token.
 * Zero hex — semua warna dari token CSS.
 */
export default function CategoryBento({ categories, fallbackNames }: CategoryBentoProps) {
  const names = categories.length > 0 ? categories.map((c) => c.name) : fallbackNames
  const imgs = categories.map((c) => c.image_url)

  const cells: { span: string; minH: number }[] = [
    { span: 'bento-cell-lg', minH: 320 },
    { span: 'bento-cell-md', minH: 240 },
    { span: 'bento-cell-sm', minH: 160 },
    { span: 'bento-cell-sm', minH: 160 },
    { span: 'bento-cell-sm', minH: 160 },
    { span: 'bento-cell-sm', minH: 160 }
  ]

  return (
    <div className="bento-grid">
      {names.slice(0, 6).map((name, i) => {
        const cell = cells[i % cells.length]
        const Icon = ICONS[i % ICONS.length]
        return (
          <a key={name} href="#products" className={`bento-cell ${cell.span}`} style={{ minHeight: cell.minH }}>
            {imgs[i] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="bento-cell-img" src={imgs[i]} alt={name} />
            ) : null}
            <div className="bento-cell-shade" />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="bento-cell-icon">
                <Icon size={20} />
              </div>
              <div className="bento-cell-name">{name}</div>
              <div className="bento-cell-sub">{SUBS[i % SUBS.length]}</div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  marginTop: '0.75rem',
                  color: 'var(--landing-on-dark)',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}
              >
                Lihat <ArrowUpRight size={14} />
              </div>
            </div>
          </a>
        )
      })}
    </div>
  )
}
