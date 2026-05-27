'use client'

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <table>
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i}>
              <div style={{ height: 14, background: '#e5e7eb', borderRadius: 4, width: '80%' }} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c}>
                <div style={{ height: 14, background: '#f3f4f6', borderRadius: 4, width: c === 0 ? '70%' : '50%' }} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="stat-grid">
      {[0, 1, 2].map(i => (
        <div key={i} className="stat-card">
          <div style={{ height: 12, background: '#e5e7eb', borderRadius: 4, width: '50%', marginBottom: 8 }} />
          <div style={{ height: 28, background: '#e5e7eb', borderRadius: 4, width: '70%', marginBottom: 4 }} />
          <div style={{ height: 10, background: '#f3f4f6', borderRadius: 4, width: '40%' }} />
        </div>
      ))}
    </div>
  )
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ height: 14, background: '#e5e7eb', borderRadius: 4, width: '60%', marginBottom: 12 }} />
          <div style={{ height: 20, background: '#e5e7eb', borderRadius: 4, width: '40%', marginBottom: 8 }} />
          <div style={{ height: 12, background: '#f3f4f6', borderRadius: 4, width: '80%' }} />
        </div>
      ))}
    </div>
  )
}