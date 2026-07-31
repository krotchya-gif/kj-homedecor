'use client'

import { useEffect } from 'react'

export default function FontLoader() {
  useEffect(() => {
    // Fallback: if preloaded font didn't apply within 3s, force it
    const timeout = setTimeout(() => {
      document.querySelectorAll('link[media="print"]').forEach((link) => {
        ;(link as HTMLLinkElement).media = 'all'
      })
    }, 3000)
    return () => clearTimeout(timeout)
  }, [])

  return null
}
