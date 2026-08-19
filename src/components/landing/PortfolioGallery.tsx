'use client'

import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import type { PortfolioPost } from '@/types'
import { Sparkles } from 'lucide-react'

interface PortfolioGalleryProps {
  posts: PortfolioPost[]
}

/**
 * Portfolio → mozaik rapih 5 gambar: 1 besar (2×2) kiri + 4 kecil (1×1) kanan.
 * Scroll motion: tiap tile scale 0.85→1 saat masuk viewport, opacity memudar
 * saat keluar (image scale & fade) — reduced-motion: statis.
 * Zero hex — warna dari token CSS.
 */
export default function PortfolioGallery({ posts }: PortfolioGalleryProps) {
  const tiles: (PortfolioPost | undefined)[] = Array.from({ length: 5 }, (_, i) => posts[i])

  return (
    <div className="portfolio-gallery">
      {tiles.map((post, i) => (
        <Tile key={post?.id ?? `ph-${i}`} post={post} idx={i} />
      ))}
    </div>
  )
}

function Tile({ post, idx }: { post?: PortfolioPost; idx: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 0.35], [0.85, 1])
  const opacity = useTransform(scrollYProgress, [0.55, 1], [1, 0.2])

  const img = (post?.images as string[])?.[0]
  const placeholder = `linear-gradient(150deg, ${idx % 2 === 0 ? 'var(--landing-primary)' : 'var(--landing-secondary)'}, ${
    idx % 2 === 0 ? 'var(--landing-secondary)' : 'var(--landing-accent)'
  })`

  return (
    <motion.div
      ref={ref}
      className={`portfolio-card ${idx === 0 ? 'portfolio-lg' : 'portfolio-sm'}`}
      style={reduce ? { scale: 1, opacity: 1 } : { scale, opacity }}
    >
      <div className="portfolio-card-media">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={post?.title ?? ''} />
        ) : (
          <div className="portfolio-card-ph" style={{ background: placeholder }}>
            <Sparkles size={idx === 0 ? 56 : 32} style={{ color: 'var(--landing-heading)', opacity: 0.75 }} />
          </div>
        )}
      </div>
      <div className="portfolio-card-overlay">
        <div className="portfolio-card-title">{post?.title ?? `Inspirasi ${idx + 1}`}</div>
        <div className="portfolio-card-date">
          {post
            ? new Date(post.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })
            : 'Karya tim KJ Homedecor'}
        </div>
      </div>
    </motion.div>
  )
}
