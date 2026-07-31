'use client'

// ===== StatCard — kartu statistik konsisten + enter/stagger animation =====
// Menggantikan pola inline-style yang di-duplikasi di ~16 halaman dashboard.
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import { EASE } from './Motion'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = '#16a34a',
  iconBg,
  iconColor,
  suffix,
  className,
  delay = 0,
  onClick,
  style
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: LucideIcon
  accent?: string
  iconBg?: string
  iconColor?: string
  suffix?: ReactNode
  className?: string
  delay?: number
  onClick?: () => void
  style?: React.CSSProperties
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={cn('stat-card', onClick && 'cursor-pointer', className)}
      style={{ borderLeft: `4px solid ${accent}`, ...style }}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: 0.28, delay, ease: EASE }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div className="stat-card-label">{label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem', flexWrap: 'wrap' }}>
            <div className="stat-card-value" style={{ color: accent }}>
              {value}
            </div>
            {suffix && <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{suffix}</span>}
          </div>
          {sub && (
            <div className="stat-card-sub" style={{ fontWeight: sub !== undefined ? '600' : undefined }}>
              {sub}
            </div>
          )}
        </div>
        {Icon && (
          <div
            style={{ background: iconBg ?? `${accent}1a`, borderRadius: '0.5rem', padding: '0.5rem', flexShrink: 0 }}
          >
            <Icon size={20} style={{ color: iconColor ?? accent }} />
          </div>
        )}
      </div>
    </motion.div>
  )
}
