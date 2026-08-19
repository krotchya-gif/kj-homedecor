'use client'

import type { Category } from '@/types'
import { Wind, Lamp, Flower2, Ruler, Home, Hammer, ArrowUpRight } from 'lucide-react'
import Reveal from './Reveal'

interface CategoryBentoProps {
  categories: Category[]
  fallbackNames: string[]
}

const ICONS = [Home, Wind, Lamp, Flower2, Ruler, Hammer]
const SUBS = ['Pilihan terlengkap', 'Elegan & ringan', 'Modern minimalis', 'Unik & eksklusif', 'Fungsional & stylish', 'Sesuai permintaan']

/**
 * Kategori → bento asimetris (1 besar + 1 sedang + 4 kecil).
 * Grid item = Reveal (bawa class span + min-height), isi = <a class="bento-cell">.
 * Scroll reveal: tile staggered fade-up + settle halus.
 * Zero hex — semua warna dari token CSS.
 */
export default function CategoryBento({ categories, fallbackNames }: CategoryBentoProps) {
  const names = categories.length > 0 ? categories.map((c) => c.name) : fallbackNames
  const imgs = categories.map((c) => c.image_url)

  const cells: { span: string }[] = [
    { span: 'bento-cell-lg' },
    { span: 'bento-cell-md' },
    { span: 'bento-cell-sm' },
    { span: 'bento-cell-sm' },
    { span: 'bento-cell-sm' },
    { span: 'bento-cell-sm' }
  ]

  return (
    <div className="bento-grid">
      {names.slice(0, 6).map((name, i) => {
        const cell = cells[i % cells.length]
        const Icon = ICONS[i % ICONS.length]
        return (
          <Reveal key={name} delay={i * 0.07} y={26} scale={0.97} className={cell.span}>
            <a href="#products" className="bento-cell" style={{ minHeight: '100%' }}>
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
          </Reveal>
        )
      })}
    </div>
  )
}
