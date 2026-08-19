import type { PortfolioPost } from '@/types'
import { Sparkles } from 'lucide-react'

interface PortfolioGalleryProps {
  posts: PortfolioPost[]
}

/**
 * Portfolio → mozaik rapih 5 gambar: 1 besar (2×2) kiri + 4 kecil (1×1) kanan.
 * Zero hex — warna dari token CSS.
 */
export default function PortfolioGallery({ posts }: PortfolioGalleryProps) {
  const tiles: (PortfolioPost | undefined)[] = Array.from({ length: 5 }, (_, i) => posts[i])

  const placeholder = (i: number) =>
    `linear-gradient(150deg, ${i % 2 === 0 ? 'var(--landing-primary)' : 'var(--landing-secondary)'}, ${
      i % 2 === 0 ? 'var(--landing-secondary)' : 'var(--landing-accent)'
    })`

  return (
    <div className="portfolio-gallery">
      {tiles.map((post, i) => {
        const img = (post?.images as string[])?.[0]
        return (
          <div key={post?.id ?? `ph-${i}`} className={`portfolio-card ${i === 0 ? 'portfolio-lg' : 'portfolio-sm'}`}>
            <div className="portfolio-card-media">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt={post?.title ?? ''} />
              ) : (
                <div className="portfolio-card-ph" style={{ background: placeholder(i) }}>
                  <Sparkles size={i === 0 ? 56 : 32} style={{ color: 'var(--landing-heading)', opacity: 0.75 }} />
                </div>
              )}
            </div>
            <div className="portfolio-card-overlay">
              <div className="portfolio-card-title">{post?.title ?? `Inspirasi ${i + 1}`}</div>
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
          </div>
        )
      })}
    </div>
  )
}
