'use client'

/**
 * MobileCards — pola NN/g "stacked cards" untuk list di mobile.
 * Desktop: list dirender sebagai TABLE (`.desktop-only` di halaman).
 * Mobile (≤768px): list dirender sebagai CARD bertumpuk (komponen ini).
 *
 * Best practice (riset 2026-08-07):
 * - NN/g Mobile Tables: row → card, kolom jadi label-value (stackable table)
 * - Toptal: stacked cards biar data bisa di-scan vertikal tanpa scroll horizontal
 * - Material: touch target aksi ≥44-48px
 *
 * Pemakaian:
 *   <div className="mobile-only"><MobileCards items={rows} renderCard={(r) => (
 *     <div className="mobile-card">…konten…</div>
 *   )} empty="Belum ada data" /></div>
 *   <div className="desktop-only">…tabel existing…</div>
 */
export default function MobileCards<T>({
  items,
  renderCard,
  empty = 'Belum ada data',
  keyOf
}: {
  items: T[]
  renderCard: (item: T) => React.ReactNode
  empty?: string
  keyOf?: (item: T) => string
}) {
  if (!items || items.length === 0) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--neutral-400)',
          fontSize: '0.85rem'
        }}
      >
        {empty}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {items.map((item, idx) => (
        <div key={keyOf ? keyOf(item) : idx}>{renderCard(item)}</div>
      ))}
    </div>
  )
}
