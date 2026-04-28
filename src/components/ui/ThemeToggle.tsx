'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div style={{ width: 36, height: 36 }} />
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      style={{
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'none',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        color: '#6b7280',
        transition: 'all 0.15s',
      }}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6'
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#d1d5db'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'none'
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'
      }}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
