'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

import { AnimatedThemeToggler } from '@/components/ui/AnimatedThemeToggler'

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="w-9 h-9" suppressHydrationWarning />
  }

  return (
    <AnimatedThemeToggler
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      onThemeChange={setTheme}
      variant="circle"
      className="w-9 h-9 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-150"
      title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    />
  )
}
