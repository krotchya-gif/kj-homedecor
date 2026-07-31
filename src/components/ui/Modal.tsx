'use client'

// ===== Modal — backdrop fade + panel scale-in/out (AnimatePresence) =====
// Menggantikan pola inline `position:'fixed'` backdrop yang di-duplikasi di 39 file.
// Exit animation jalan karena komponen SELALU ter-render (`open` prop, bukan conditional).
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

const EASE = [0.22, 1, 0.36, 1] as const

export function Modal({
  open,
  onClose,
  children,
  maxWidth = 580,
  zIndex = 200,
  padding = '1.5rem'
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  maxWidth?: number
  zIndex?: number
  padding?: string
}) {
  const reduce = useReducedMotion()
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="modal-panel"
            style={{
              width: '100%',
              maxWidth,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
