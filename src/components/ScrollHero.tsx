'use client'

import { motion, useReducedMotion } from 'motion/react'
import HeroVisual from './landing/HeroVisual'
import { ChevronRight, MessageCircle } from 'lucide-react'

interface ScrollHeroProps {
  title?: string
  subtitle?: string
  ctaText?: string
  ctaLink?: string
  whatsappNumber?: string
  whatsappMessage?: string
  heroImageUrl?: string
  heroVideoUrl?: string
}

/**
 * Hero split editorial — kiri teks (theme-adaptive: heading ikut light/dark),
 * kanan visual (foto/video/placeholder + parallax). Zero hex.
 */
export default function ScrollHero({
  title,
  subtitle,
  ctaText = 'Lihat Katalog',
  ctaLink = '#products',
  whatsappNumber = '6281234567890',
  whatsappMessage = 'Halo KJ Homedecor, saya ingin konsultasi gorden',
  heroImageUrl,
  heroVideoUrl
}: ScrollHeroProps) {
  const reduce = useReducedMotion()
  const lines = (title ?? 'Percantik Ruanganmu dengan Gorden Premium').split('\n')

  const item = (delay: number) =>
    reduce
      ? {}
      : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const } }

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        padding: 'calc(68px + 2.5rem) 1.5rem 4rem'
      }}
    >
      <div className="hero-split">
        {/* ===== Left: copy ===== */}
        <div>
          <motion.div {...item(0.05)}>
            <div className="hero-badge">Home Decor Premium Indonesia</div>
          </motion.div>

          <motion.h1 {...item(0.15)} className="hero-title" style={{ marginTop: '1.5rem', marginBottom: '1.25rem' }}>
            {lines.map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </motion.h1>

          <motion.p {...item(0.25)} className="hero-subtitle" style={{ marginBottom: '2.5rem' }}>
            {subtitle ?? 'Spesialis gorden, curtain, dan roman blind custom berkualitas tinggi.\nPemasangan profesional ke seluruh Jabodetabek.'}
          </motion.p>

          <motion.div {...item(0.35)} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a href={ctaLink} className="btn-cta-solid">
              {ctaText} <ChevronRight size={18} />
            </a>
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cta-ghost"
            >
              <MessageCircle size={18} /> Konsultasi Gratis
            </a>
          </motion.div>
        </div>

        {/* ===== Right: visual ===== */}
        <motion.div
          {...(reduce ? {} : { initial: { opacity: 0, scale: 0.97 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] as const } })}
        >
          <HeroVisual imageUrl={heroImageUrl} videoUrl={heroVideoUrl} />
        </motion.div>
      </div>
    </section>
  )
}
