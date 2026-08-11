'use client'

import { createContext, useContext, ReactNode } from 'react'
import { Toaster, toast as sonnerToast } from 'sonner'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

// Bungkus Sonner (library third-party, v2) di balik API lama `toast(type, message)`
// supaya 40+ halaman yang pakai useToast() tidak perlu diubah satu-satu.
// Sonner: richColors + theme="system" (ikut dark mode app), posisi bottom-right.
export function ToastProvider({ children }: { children: ReactNode }) {
  const toast = (type: ToastType, message: string) => {
    if (type === 'success') sonnerToast.success(message)
    else if (type === 'error') sonnerToast.error(message)
    else if (type === 'warning') sonnerToast.warning(message)
    else sonnerToast.info(message)
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Toaster
        position="bottom-right"
        theme="system"
        richColors
        closeButton
        visibleToasts={4}
        duration={4000}
        gap={10}
        offset={16}
        toastOptions={{ style: { fontSize: '0.875rem', fontWeight: '600' } }}
      />
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
