'use client'
import type { OrderLog } from '@/lib/order-detail'

// Riwayat aktivitas order (read-only) — di-extract dari monolitik page order detail.
export default function OrderActivityLog({ logs }: { logs: OrderLog[] }) {
  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--neutral-700)' }}>Riwayat Aktivitas</h2>
        <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>
          Semua aksi dicatat &bull; Admin bisa pantau
        </span>
      </div>
      {logs.length === 0 ? (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--neutral-400)',
            background: 'var(--neutral-100)',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            fontSize: '0.875rem'
          }}
        >
          Belum ada aktivitas tercatat
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {logs.map((log: OrderLog) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  gap: '0.875rem',
                  padding: '0.875rem 1.25rem',
                  borderBottom: '1px solid #f3f4f6',
                  alignItems: 'flex-start'
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <span style={{ fontSize: '0.65rem' }}>🔔</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.82rem', color: 'var(--neutral-700)' }}>
                      {log.action.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    {log.staff && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--neutral-600)',
                          background: 'var(--neutral-100)',
                          padding: '0.1rem 0.5rem',
                          borderRadius: '999px'
                        }}
                      >
                        👤 {log.staff.name}
                      </span>
                    )}
                  </div>
                  {log.notes && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--neutral-600)', marginBottom: '0.25rem' }}>{log.notes}</div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>
                    {new Date(log.created_at).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
