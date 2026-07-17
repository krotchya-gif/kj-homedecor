'use client'

import { useState } from 'react'
import { Lightbox } from '@/components/ui/Lightbox'

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
            <img src={images[0]} alt={productName} loading="lazy" style={{ width: '100%', height: 'auto', objectFit: 'contain', maxHeight: 500 }} />
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
                <img src={img} alt={`${productName} ${i + 1}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && (
        <Lightbox
          photos={images}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevImage}
          onNext={nextImage}
        />
      )}
    </>
  )
}
