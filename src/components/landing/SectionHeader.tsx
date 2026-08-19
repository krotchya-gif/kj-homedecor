import type { ReactNode } from 'react'

interface SectionHeaderProps {
  label?: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
  children?: ReactNode
}

/**
 * Header section landing — token-driven (zero hex).
 * `label` (eyebrow) dipakai hemat: maksimal 1 per 3 section (aturan design-taste).
 */
export default function SectionHeader({ label, title, subtitle, align = 'left', children }: SectionHeaderProps) {
  return (
    <div
      style={{
        maxWidth: 720,
        marginBottom: '3rem',
        marginInline: align === 'center' ? 'auto' : undefined,
        textAlign: align
      }}
    >
      {label ? <div className="landing-section-label">{label}</div> : null}
      <h2 className="landing-section-title">{title}</h2>
      {subtitle ? <p className="landing-section-subtitle" style={{ marginTop: '0.75rem' }}>{subtitle}</p> : null}
      {children}
    </div>
  )
}
