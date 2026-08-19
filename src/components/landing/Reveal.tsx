'use client'

import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  delay?: number
  y?: number
  x?: number
  scale?: number
  className?: string
  style?: React.CSSProperties
  once?: boolean
}

/**
 * Scroll-reveal wrapper landing (sesi 61) — fade/translate/scale saat masuk viewport.
 * Easing premium, `once` default true. Reduced-motion: render polos (tanpa animasi).
 * Zero hex — tidak menyentuh warna.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 28,
  x = 0,
  scale = 0.98,
  className,
  style,
  once = true
}: RevealProps) {
  const reduce = useReducedMotion()

  if (reduce) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y, x, scale }}
      whileInView={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      viewport={{ once, amount: 0.2 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  )
}
