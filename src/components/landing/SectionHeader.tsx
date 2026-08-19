'use client'

import type { ReactNode } from 'react'
import Reveal from './Reveal'

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
 * Scroll reveal: label -> title -> subtitle staggered + garis aksen scaleX.
 */
export default function SectionHeader({ label, title, subtitle, align = 'left', children }: SectionHeaderProps) {
  const accentLine: React.CSSProperties = {
    width: 56,
    height: 2,
    background: 'var(--landing-accent)',
    marginTop: '1.25rem',
    transformOrigin: 'left center'
  }

  return (
    <div
      style={{
        maxWidth: 720,
        marginBottom: '3rem',
        marginInline: align === 'center' ? 'auto' : undefined,
        textAlign: align
      }}
    >
      {label ? (
        <Reveal delay={0}>
          <div className="landing-section-label">{label}</div>
        </Reveal>
      ) : null}
      <Reveal delay={0.08}>
        <h2 className="landing-section-title">{title}</h2>
      </Reveal>
      {subtitle ? (
        <Reveal delay={0.16}>
          <p className="landing-section-subtitle" style={{ marginTop: '0.75rem' }}>
            {subtitle}
          </p>
        </Reveal>
      ) : null}
      <Reveal delay={0.24}>
        <div style={align === 'center' ? { ...accentLine, marginInline: 'auto' } : accentLine} />
      </Reveal>
      {children ? <Reveal delay={0.28}>{children}</Reveal> : null}
    </div>
  )
}
