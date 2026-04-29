'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Menu, X } from 'lucide-react'
import ThemeToggle from '@/components/ui/ThemeToggle'

interface ScrollNavProps {
  whatsappNumber: string
  whatsappMessage: string
}

export default function ScrollNav({ whatsappNumber, whatsappMessage }: ScrollNavProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinks = [
    { href: '#products', label: 'Produk' },
    { href: '#categories', label: 'Kategori' },
    { href: '#portfolio', label: 'Portofolio' },
    { href: '#contact', label: 'Kontak' },
  ]

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          height: 68,
          display: 'flex',
          alignItems: 'center',
          padding: '0 1.5rem',
          gap: '2rem',
          transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
          background: scrolled
            ? 'rgba(255,255,255,0.94)'
            : 'transparent',
          backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(0,0,0,0.07)' : '1px solid transparent',
          boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.07)' : 'none',
        }}
      >
        {/* Brand */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <img src="/kjlogo.png" alt="KJ Homedecor" style={{ height: '38px', width: 'auto' }} suppressHydrationWarning />
        </Link>

        {/* Desktop links */}
        <div style={{ display: 'flex', gap: '0.25rem', flex: 1 }} className="nav-desktop-links">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{
                padding: '0.4rem 0.875rem',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'all 0.2s',
                color: scrolled ? '#4b4b4b' : 'rgba(255,255,255,0.88)',
              }}
              onMouseEnter={(e) => {
                const t = e.currentTarget
                t.style.background = scrolled ? '#fdf3e8' : 'rgba(255,255,255,0.12)'
                t.style.color = scrolled ? '#b85a22' : '#fff'
              }}
              onMouseLeave={(e) => {
                const t = e.currentTarget
                t.style.background = 'transparent'
                t.style.color = scrolled ? '#4b4b4b' : 'rgba(255,255,255,0.88)'
              }}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <ThemeToggle />
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 1.125rem',
              borderRadius: '2rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.25s',
              background: scrolled
                ? 'linear-gradient(135deg,#cc7030,#b85a22)'
                : 'rgba(255,255,255,0.15)',
              color: '#fff',
              border: scrolled ? 'none' : '1px solid rgba(255,255,255,0.35)',
              backdropFilter: scrolled ? 'none' : 'blur(8px)',
              boxShadow: scrolled ? '0 4px 14px rgba(204,112,48,0.35)' : 'none',
            }}
            onMouseEnter={(e) => {
              const t = e.currentTarget
              t.style.transform = 'translateY(-1px)'
              t.style.boxShadow = scrolled
                ? '0 6px 20px rgba(204,112,48,0.45)'
                : '0 4px 16px rgba(0,0,0,0.15)'
            }}
            onMouseLeave={(e) => {
              const t = e.currentTarget
              t.style.transform = 'translateY(0)'
              t.style.boxShadow = scrolled ? '0 4px 14px rgba(204,112,48,0.35)' : 'none'
            }}
          >
            <MessageCircle size={15} /> WhatsApp
          </a>

          {/* Hamburger (mobile) */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="nav-hamburger"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '0.375rem',
              color: scrolled ? '#374151' : '#fff',
              display: 'none',
            }}
            aria-label="Menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 190,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 280,
          zIndex: 195,
          background: '#fff',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
          transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          padding: '5rem 1.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        {navLinks.map((l) => (
          <a
            key={l.href}
            href={l.href}
            onClick={() => setMenuOpen(false)}
            style={{
              padding: '0.875rem 1rem',
              borderRadius: '0.75rem',
              fontSize: '1rem',
              fontWeight: 500,
              color: '#374151',
              textDecoration: 'none',
              transition: 'all 0.15s',
              display: 'block',
            }}
            onMouseEnter={(e) => {
              const t = e.currentTarget
              t.style.background = '#fdf3e8'
              t.style.color = '#b85a22'
            }}
            onMouseLeave={(e) => {
              const t = e.currentTarget
              t.style.background = 'transparent'
              t.style.color = '#374151'
            }}
          >
            {l.label}
          </a>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.875rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg,#cc7030,#b85a22)',
              color: '#fff',
              fontSize: '0.95rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <MessageCircle size={18} /> Chat WhatsApp
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop-links { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  )
}
