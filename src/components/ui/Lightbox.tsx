'use client'

import * as React from 'react'
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LightboxProps {
  photos: string[]
  currentIndex: number
  onClose: () => void
  onNext?: () => void
  onPrev?: () => void
}

export function Lightbox({ photos, currentIndex, onClose, onNext, onPrev }: LightboxProps) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && onNext) onNext()
      if (e.key === 'ArrowLeft' && onPrev) onPrev()
    },
    [onClose, onNext, onPrev]
  )

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Prevent body scroll
  React.useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90" onClick={handleBackdropClick}>
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
        onClick={onClose}
      >
        <XIcon className="size-5" />
        <span className="sr-only">Close</span>
      </Button>

      {/* Prev button */}
      {onPrev && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation()
            onPrev()
          }}
        >
          <ChevronLeftIcon className="size-6" />
          <span className="sr-only">Previous</span>
        </Button>
      )}

      {/* Next button */}
      {onNext && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation()
            onNext()
          }}
        >
          <ChevronRightIcon className="size-6" />
          <span className="sr-only">Next</span>
        </Button>
      )}

      {/* Image */}
      <img
        src={photos[currentIndex]}
        alt={`Photo ${currentIndex + 1}`}
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  )
}

interface LightboxGalleryProps {
  photos: string[]
  onPhotoClick?: (index: number) => void
  columns?: 2 | 3 | 4
  thumbSize?: 'sm' | 'md' | 'lg'
}

export function LightboxGallery({ photos, onPhotoClick, columns = 4, thumbSize = 'md' }: LightboxGalleryProps) {
  const visiblePhotos = photos.slice(0, 4)
  const extraCount = photos.length - 4

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  }

  return (
    <div className="flex flex-wrap gap-1">
      {visiblePhotos.map((photo, i) => (
        <button
          key={i}
          className={`relative ${sizeClasses[thumbSize]} overflow-hidden rounded border bg-muted hover:opacity-80 transition-opacity flex-shrink-0`}
          onClick={() => onPhotoClick?.(i)}
        >
          <img src={photo} alt={`Photo ${i + 1}`} className="size-full object-cover" />
          {i === 3 && extraCount > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-medium text-xs">
              +{extraCount}
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
