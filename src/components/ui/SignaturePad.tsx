'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

/**
 * SignaturePad — kanvas tanda tangan digital (mouse + sentuh).
 * onChange dipanggil dengan dataURL PNG (sudah di-resize max 800px).
 * value/onChange controlled agar bisa dipakai di form (prefill saat edit).
 */
interface SignaturePadProps {
  value?: string | null
  onChange?: (dataUrl: string) => void
  height?: number
}

const MAX_WIDTH = 800

export default function SignaturePad({ value, onChange, height = 160 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  // Prefill value (edit mode) — gambar sekali
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !value) return
    const img = new Image()
    img.onload = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // gambar sesuai rasio
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
      setHasInk(true)
    }
    img.src = value
  }, [value])

  // Setup canvas resolution (DPR) sekali
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#1e1e1e'
    }
  }, [])

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    drawing.current = true
    canvasRef.current?.setPointerCapture(e.pointerId)
    const ctx = canvasRef.current?.getContext('2d')
    const { x, y } = getPos(e)
    ctx?.beginPath()
    ctx?.moveTo(x, y)
  }

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    const { x, y } = getPos(e)
    ctx?.lineTo(x, y)
    ctx?.stroke()
  }

  const end = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    drawing.current = false
    canvasRef.current?.releasePointerCapture(e.pointerId)
    emit()
  }

  const emit = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    // cek ada tinta (piksel non-putih)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let ink = false
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) { ink = true; break }
    }
    setHasInk(ink)
    if (!ink) return
    // resize ke MAX_WIDTH kalau lebih lebar
    let out = canvas
    if (w > MAX_WIDTH) {
      const ratio = MAX_WIDTH / w
      out = document.createElement('canvas')
      out.width = MAX_WIDTH
      out.height = Math.round(h * ratio)
      out.getContext('2d')!.drawImage(canvas, 0, 0, out.width, out.height)
    }
    onChange?.(out.toDataURL('image/png'))
  }, [onChange])

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
    onChange?.('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div
        style={{
          border: '1px dashed var(--neutral-300)',
          borderRadius: '0.5rem',
          background: '#fff',
          overflow: 'hidden',
          touchAction: 'none'
        }}
      >
        <canvas
          ref={canvasRef}
          height={height}
          style={{ width: '100%', height, display: 'block', cursor: 'crosshair', touchAction: 'none' }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={() => { if (drawing.current) { drawing.current = false; emit() } }}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={clear}
          style={{
            padding: '0.35rem 0.75rem',
            border: '1px solid var(--neutral-300)',
            borderRadius: '0.5rem',
            background: 'transparent',
            fontSize: '0.8rem',
            cursor: 'pointer',
            color: 'var(--neutral-600)'
          }}
        >
          🗑 Bersihkan
        </button>
        <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>
          {hasInk ? '✓ Tanda tangan terisi' : 'Tanda tangan di atas garis putus-putus'}
        </span>
      </div>
    </div>
  )
}
