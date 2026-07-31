'use client'

// ===== Motion primitives — KJ Homedecor (2026-07-31) =====
// Wrapper tipis di atas `motion` (v12) dengan variants standar & aksesibilitas:
// semua animasi otomatis mati kalau user prefers-reduced-motion.
// Import dari sini, BUKAN langsung dari 'motion/react', supaya konsisten.
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'motion/react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export { motion, AnimatePresence, useReducedMotion }

export const EASE = [0.22, 1, 0.36, 1] as const

/** Fade + slide-up halus — untuk elemen masuk (card, header, row) */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE } }
}

/** Stagger parent — anak-anak pakai variants fadeUp + animation delay otomatis */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } }
}

/** Scale-in ringan — untuk modal/dialog/popover */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: EASE } }
}

/** Reveal satu elemen: fade + slide-up. Semua animasi di-skip saat reduced motion. */
export function MotionReveal({
  children,
  className,
  delay = 0,
  y = 12,
  as = 'div',
  style
}: {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  as?: 'div' | 'section' | 'li'
  style?: React.CSSProperties
}) {
  const reduce = useReducedMotion()
  const Comp = motion[as]
  return (
    <Comp
      initial={reduce ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: EASE }}
      className={className}
      style={style}
    >
      {children}
    </Comp>
  )
}

/** Parent stagger — anak-anak pakai variants="show" (fadeUp). Reduced-motion: langsung tampil. */
export function MotionStagger({
  children,
  className,
  ...rest
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : 'hidden'}
      animate="show"
      variants={stagger}
      className={cn(className)}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/** Item untuk MotionStagger — pakai variants fadeUp */
export function MotionItem({ children, className, ...rest }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeUp} className={cn(className)} {...rest}>
      {children}
    </motion.div>
  )
}
