'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  images: string[]
  productName: string
}

export default function ProductImageGallery({ images, productName }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  function openLightbox(idx: number) {
    setLightboxIndex(idx)
    setLightboxOpen(true)
  }

  function closeLightbox() {
    setLightboxOpen(false)
  }

  function prevImage() {
    setLightboxIndex(i => (i - 1 + images.length) % images.length)
  }

  function nextImage() {
    setLightboxIndex(i => (i + 1) % images.length)
  }

  return (
    <>
      <div>
        {/* Main Image */}
        <div
          onClick={() => openLightbox(0)}
          style={{ background: '#fff', borderRadius: '0.875rem', overflow: 'hidden', marginBottom: '1rem', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb', cursor: images.length > 0 ? 'zoom-in' : 'default' }}
        >
          {images.length > 0 ? (
            <img src={images[0]} alt={productName} style={{ width: '100%', height: 'auto', objectFit: 'contain', maxHeight: 500 }} />
          ) : (
            <div style={{ color: '#d1d5db', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🪟</div>
              <span style={{ fontSize: '0.85rem' }}>Tidak ada foto</span>
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {images.map((img, i) => (
              <div
                key={i}
                onClick={() => openLightbox(i)}
                style={{ width: 80, height: 80, borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e5e7eb', cursor: 'pointer' }}
              >
                <img src={img} alt={`${productName} ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Overlay */}
      {lightboxOpen && (
        <div
          onClick={closeLightbox}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
          >
            <X size={22} />
          </button>

          {/* Prev */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevImage() }}
              style={{ position: 'absolute', left: '1rem', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Image */}
          <img
            src={images[lightboxIndex]}
            alt={`${productName} ${lightboxIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '0.5rem' }}
          />

          {/* Next */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextImage() }}
              style={{ position: 'absolute', right: '1rem', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* Counter */}
          {images.length > 1 && (
            <div style={{ position: 'absolute', bottom: '1.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
              {lightboxIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  )
}
