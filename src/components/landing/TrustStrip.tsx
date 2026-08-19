import { Star, Shield, Truck, Clock, CheckCircle } from 'lucide-react'

export interface TrustStat {
  n?: string
  label: string
  icon?: string
}

interface TrustStripProps {
  stats: TrustStat[]
  marketplaces: string[]
}

const ICONS: Record<string, React.ReactNode> = {
  Star: <Star size={16} />,
  Shield: <Shield size={16} />,
  Truck: <Truck size={16} />,
  Clock: <Clock size={16} />,
  CheckCircle: <CheckCircle size={16} />
}

/**
 * Band gelap di bawah hero — statistik/trust badges + strip marketplace.
 * Selalu gelap di kedua mode (token inverse) → teks putih (--landing-on-dark).
 */
export default function TrustStrip({ stats, marketplaces }: TrustStripProps) {
  return (
    <section className="trust-strip" style={{ background: 'var(--landing-inverse-bg)', padding: '2.5rem 1.5rem' }}>
      <div className="landing-section" style={{ maxWidth: 1200 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '2.5rem',
            flexWrap: 'wrap'
          }}
        >
          {stats.map((s) => (
            <div key={s.label} style={{ textAlign: 'left' }}>
              <div className="trust-number" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {s.icon ? (
                  <span style={{ color: 'var(--landing-accent)' }}>{ICONS[s.icon] ?? <Star size={16} />}</span>
                ) : (
                  s.n
                )}
              </div>
              <div className="trust-label">{s.label}</div>
            </div>
          ))}

          {marketplaces.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.75rem',
                flexWrap: 'wrap',
                marginLeft: 'auto'
              }}
            >
              <span className="trust-label" style={{ letterSpacing: '0.12em' }}>
                Juga di
              </span>
              {marketplaces.map((m) => (
                <span key={m} className="trust-brandmark">
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
