'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          pointerEvents: 'none'
        }}
      >
        {toasts.map((t) => {
          const icons = {
            success: <CheckCircle2 size={16} />,
            error: <XCircle size={16} />,
            warning: <AlertTriangle size={16} />,
            info: <Info size={16} />
          }
          const colors = {
            success: { bg: '#d1fae5', border: '#059669', text: '#065f46' },
            error: { bg: '#fef2f2', border: '#dc2626', text: '#991b1b' },
            warning: { bg: '#fffbeb', border: '#d97706', text: '#92400e' },
            info: { bg: '#eff6ff', border: '#2563eb', text: '#1e40af' }
          }
          const c = colors[t.type]
          return (
            <div
              key={t.id}
              style={{
                pointerEvents: 'all',
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: '0.5rem',
                padding: '0.75rem 1rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                color: c.text,
                fontSize: '0.875rem',
                fontWeight: '600',
                minWidth: 280,
                maxWidth: 400,
                animation: 'slideIn 0.2s ease-out'
              }}
            >
              <span style={{ color: c.border, flexShrink: 0 }}>{icons[t.type]}</span>
              <span style={{ flex: 1 }}>{t.message}</span>
              <button
                onClick={() => remove(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: c.text,
                  padding: '0.1rem',
                  display: 'flex'
                }}
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
