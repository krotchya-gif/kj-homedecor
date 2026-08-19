import type { ReactNode } from 'react'

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
 * Zero hex — warna dari token CSS.
 */
export default function WhyUsEditorial({ items }: WhyUsEditorialProps) {
  return (
    <div>
      {items.map((f, i) => (
        <div key={`whyus-${i}`} className="whyus-row">
          <div className="whyus-num">{String(i + 1).padStart(2, '0')}</div>
          <div className="whyus-icon">{f.icon}</div>
          <div className="whyus-body">
            <div className="whyus-title">{f.title}</div>
            <div className="whyus-desc">{f.desc}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
