'use client'

import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { Sparkles } from 'lucide-react'

interface HeroVisualProps {
  imageUrl?: string
  videoUrl?: string
  alt?: string
}

/**
 * Panel visual hero (kanan) — video (prioritas) / gambar / placeholder warm dengan parallax halus.
 * Jika user mengisi video → video yang tampil; image jadi fallback saat video tidak ada.
 * Semua warna lewat token CSS (zero hex). Reduced-motion: tanpa parallax.
 */
export default function HeroVisual({ imageUrl, videoUrl, alt = 'Interior KJ Homedecor' }: HeroVisualProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, -48])

  const frameStyle: React.CSSProperties = {
    position: 'relative',
    borderRadius: '1.5rem',
    overflow: 'hidden',
    aspectRatio: '4 / 5',
    border: '1px solid var(--landing-border)',
    boxShadow: '0 30px 60px var(--landing-shadow)',
    background: 'linear-gradient(150deg, var(--landing-secondary), var(--landing-primary))'
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <motion.div style={{ ...frameStyle, y: reduce ? 0 : y }}>
        {videoUrl ? (
          <video
            src={videoUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={alt}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              color: 'var(--landing-on-dark)'
            }}
          >
            <Sparkles size={56} style={{ opacity: 0.9 }} />
            <span
              className="hero-title"
              style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', textAlign: 'center', padding: '0 2rem' }}
            >
              Interior Berkualitas
            </span>
          </div>
        )}
        {/* soft sheen */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, var(--landing-shade-strong), transparent 45%)',
            pointerEvents: 'none'
          }}
        />
      </motion.div>
    </div>
  )
}
