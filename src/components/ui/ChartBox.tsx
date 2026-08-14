'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * ChartBox (sesi 50): wrapper chart yang MENGUKUR lebarnya sendiri dan
 * meneruskan width eksplisit ke chart recharts — menggantikan
 * `ResponsiveContainer` yang di recharts v3.8.1 bisa render lebar 0 di
 * viewport mobile (chart tidak muncul). ResizeObserver + fallback lebar
 * window agar chart langsung tampil saat mount.
 */

export function useContainerWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(Math.round(el.getBoundingClientRect().width))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    const t = window.setTimeout(update, 250)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
      window.clearTimeout(t)
    }
  }, [])
  return [ref, width]
}

export default function ChartBox({
  height = 220,
  children,
  style
}: {
  height?: number
  children: (width: number) => ReactNode
  style?: React.CSSProperties
}) {
  const [ref, w] = useContainerWidth()
  // Fallback: render langsung dengan lebar estimasi (anti chart kosong saat mount)
  const fallback = typeof window !== 'undefined' ? Math.max(280, window.innerWidth - 48) : 320
  const width = w > 0 ? w : fallback
  return (
    <div ref={ref} style={{ width: '100%', minWidth: 0, height, ...style }}>
      {width > 0 ? children(width) : null}
    </div>
  )
}
