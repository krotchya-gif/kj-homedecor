import type { PortfolioPost } from '@/types'
import { Sparkles } from 'lucide-react'

interface PortfolioGalleryProps {
  posts: PortfolioPost[]
}

/**
 * Portfolio → gallery asimetris: 1 kartu besar (kiri) + 2 kartu kecil (kanan).
 * Zero hex — warna dari token CSS.
 */
export default function PortfolioGallery({ posts }: PortfolioGalleryProps) {
  const items = posts.slice(0, 3)
  const featured = items[0]
  const side = items.slice(1, 3)

  const placeholder = (i: number) =>
    `linear-gradient(150deg, ${i % 2 === 0 ? 'var(--landing-primary)' : 'var(--landing-secondary)'}, ${
      i % 2 === 0 ? 'var(--landing-secondary)' : 'var(--landing-accent)'
    })`

  const Card = ({ post, idx, tall }: { post?: PortfolioPost; idx: number; tall: boolean }) => {
    const img = (post?.images as string[])?.[0]
    return (
      <div className="portfolio-card">
        <div className="portfolio-card-imgwrap" style={{ aspectRatio: tall ? '4 / 3' : '16 / 10' }}>
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={post?.title ?? ''} />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: placeholder(idx),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--landing-on-dark)'
              }}
            >
              <Sparkles size={40} style={{ opacity: 0.8 }} />
            </div>
          )}
        </div>
        <div className="portfolio-card-body">
          <div className="portfolio-card-title" style={{ fontSize: tall ? '1.35rem' : '1.1rem' }}>
            {post?.title ?? `Inspirasi ${idx + 1}`}
          </div>
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
  }

  return (
    <div className="portfolio-gallery">
      <div className="portfolio-featured">
        <Card post={featured} idx={0} tall />
      </div>
      <div className="portfolio-side">
        {[1, 2].map((i) => (
          <Card key={i} post={side[i - 1]} idx={i} tall={false} />
        ))}
      </div>
    </div>
  )
}
