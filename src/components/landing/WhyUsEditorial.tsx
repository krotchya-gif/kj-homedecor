'use client'

import type { ReactNode } from 'react'
import Reveal from './Reveal'

export interface WhyUsItem {
  title: string
  desc: string
  icon: ReactNode
}

interface WhyUsEditorialProps {
  items: WhyUsItem[]
}

/**
 * Keunggulan → numbered editorial rows (01–04), bukan kartu sejajar.
 * Scroll reveal: row slide-in dari kiri staggered.
 * Zero hex — warna dari token CSS.
 */
export default function WhyUsEditorial({ items }: WhyUsEditorialProps) {
  return (
    <div>
      {items.map((f, i) => (
        <Reveal key={`whyus-${i}`} delay={i * 0.08} x={-24} y={0}>
          <div className="whyus-row">
            <div className="whyus-num">{String(i + 1).padStart(2, '0')}</div>
            <div className="whyus-icon">{f.icon}</div>
            <div className="whyus-body">
              <div className="whyus-title">{f.title}</div>
              <div className="whyus-desc">{f.desc}</div>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  )
}
