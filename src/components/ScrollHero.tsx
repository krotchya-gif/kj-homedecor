'use client'

import { useEffect, useRef, useState } from 'react'
import HeroParticles from './landing/HeroParticles'
import { ChevronRight, MessageCircle } from 'lucide-react'

interface ScrollHeroProps {
  videoUrl?: string | null
  title?: string
  subtitle?: string
  ctaText?: string
  ctaLink?: string
  whatsappNumber?: string
  whatsappMessage?: string
}

export default function ScrollHero({
  videoUrl,
  title,
  subtitle,
  ctaText,
  ctaLink = '#products',
  whatsappNumber = '6281234567890',
  whatsappMessage = 'Halo KJ Homedecor, saya ingin konsultasi gorden'
}: ScrollHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoError, setVideoError] = useState(false)
  const videoSrc = videoUrl || '/kj.mp4'

  // Pause video when tab is hidden to save battery/data
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        video.pause()
      } else {
        video.play().catch(() => {})
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return (
    <section
      style={{
        position: 'relative',
        height: '100vh',
        minHeight: 600,
        overflow: 'hidden'
      }}
    >
      {/* Video Background */}
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        muted
        loop
        playsInline
        onError={() => setVideoError(true)}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0
        }}
      />

      {/* Fallback background when video fails or no video */}
      {(videoError || !videoUrl) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(160deg, #2d1005 0%, #4a1f0a 50%, #7a3210 100%)',
            zIndex: 0
          }}
        />
      )}

      {/* Gradient Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(160deg, rgba(15,5,0,0.75) 0%, rgba(45,16,5,0.6) 50%, rgba(90,35,14,0.65) 100%)',
          zIndex: 1
        }}
      />

      {/* Particles */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
        <HeroParticles />
      </div>

      {/* Hero Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 3,
          textAlign: 'center',
          color: '#fff',
          maxWidth: 860,
          margin: '0 auto',
          padding: '5rem 1rem 6rem',
          paddingTop: 'calc(68px + 5rem)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(221,192,132,0.15)',
            border: '1px solid rgba(221,192,132,0.35)',
            color: '#EDD4B8',
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '0.5rem 1.25rem',
            borderRadius: 999,
            marginBottom: '2rem',
            backdropFilter: 'blur(12px)',
            animation: 'fadeUp 0.6s 0.1s ease both'
          }}
        >
          Home Decor Premium Indonesia
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: 'clamp(2rem, 7vw, 4rem)',
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: '1rem',
            color: '#fff',
            animation: 'fadeUp 0.7s 0.2s ease both',
            textShadow: '0 2px 40px rgba(0,0,0,0.3)'
          }}
        >
          {title?.split('\n').map((line, i, arr) => (
            <span key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </span>
          )) ?? (
            <>
              Percantik Ruanganmu dengan{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #f4a857 0%, #ffd6a5 40%, #f4a857 80%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Premium
              </span>
            </>
          )}
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle" style={{ animation: 'fadeUp 0.7s 0.35s ease both' }}>
          {subtitle ??
            'Spesialis gorden, curtain, dan roman blind custom berkualitas tinggi.\nPemasangan profesional ke seluruh Jabodetabek.'}
        </p>

        {/* CTA */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            animation: 'fadeUp 0.7s 0.5s ease both',
            marginTop: '2.5rem'
          }}
        >
          <a
            href={ctaLink}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background:
                'linear-gradient(135deg, var(--landing-primary, #DDC0B4) 0%, var(--landing-secondary, #C9A98C) 100%)',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 700,
              padding: '1rem 2.25rem',
              borderRadius: '3rem',
              textDecoration: 'none',
              boxShadow: '0 8px 28px rgba(221,192,132,0.4)'
            }}
          >
            {ctaText ?? 'Lihat Katalog'} <ChevronRight size={18} />
          </a>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 600,
              padding: '1rem 2.25rem',
              borderRadius: '3rem',
              border: '1px solid rgba(255,255,255,0.3)',
              backdropFilter: 'blur(8px)',
              textDecoration: 'none'
            }}
          >
            <MessageCircle size={18} /> Konsultasi Gratis
          </a>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            gap: '2.5rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: '3.5rem',
            paddingTop: '3rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            animation: 'fadeUp 0.7s 0.7s ease both'
          }}
        >
          {[
            { n: 500, suf: '+', label: 'Pelanggan Puas' },
            { n: 8, suf: '+', label: 'Tahun Pengalaman' },
            { n: 100, suf: '%', label: 'Garansi Kualitas' }
          ].map((s) => (
            <div key={s.label}>
              <div
                style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', fontWeight: 700, color: '#DDC0B4' }}
              >
                {s.n}
                {s.suf}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.25rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: '2.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            animation: 'fadeUp 0.7s 0.9s ease both'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              animation: 'bounceDown 1.8s ease-in-out infinite',
              animationDelay: '1.2s'
            }}
          >
            <div style={{ width: 2, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.4)' }} />
            <div style={{ width: 2, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.4)' }} />
            <div style={{ width: 2, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.4)' }} />
          </div>
        </div>
      </div>
    </section>
  )
}
