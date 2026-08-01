'use client'

// ===== SectionCard — card putih konsisten + enter animation =====
// Menggantikan pola inline `background:'#fff', border, borderRadius, padding`
// yang di-duplikasi di ~77 halaman. CSS-only class (dark-mode aware) + motion reveal.
import { MotionReveal } from './Motion'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function SectionCard({
  children,
  className,
  style,
  delay = 0,
  title,
  icon
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  delay?: number
  /** Header card opsional: { title, icon } */
  title?: ReactNode
  icon?: ReactNode
}) {
  return (
    <MotionReveal delay={delay} className={cn('section-card', className)} style={style}>
      {title && (
        <div className="section-card">
          {icon}
          <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>{title}</h3>
        </div>
      )}
      {children}
    </MotionReveal>
  )
}
