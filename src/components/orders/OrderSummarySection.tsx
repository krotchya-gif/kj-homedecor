'use client'
import { Clock } from 'lucide-react'
import { STATUS_LABELS, PAYMENT_STATUS_LABELS, SOURCE_LABELS } from '@/types'
import { PAYMENT_COLORS } from '@/lib/order-detail'
import type { Order } from '@/types'

// Phase 6B-3c (refactor order detail): ringkasan order (Estimasi Selesai + Pelanggan
// + Info Pesanan) diekstrak dari admin/orders/[id]/page.tsx — behavior-preserving.
interface Props {
  order: Order
  statuses: readonly string[]
  statusIdx: number
  customer: { name: string; phone: string; address?: string } | null
  fmt: (n: number) => string
  onAddPayment: () => void
}

export default function OrderSummarySection({ order, statuses, statusIdx, customer, fmt, onAddPayment }: Props) {
  return (
    <>
      {/* Estimasi Selesai */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}
      >
        <Clock size={18} style={{ color: '#cc7030', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--neutral-400)', marginBottom: '0.2rem' }}>ESTIMASI SELESAI</div>
          {order.status === 'done' ? (
            <div style={{ fontWeight: '700', color: '#16a34a' }}>✅ Sudah Selesai</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: '700', color: 'var(--neutral-700)' }}>
                Tahap {statusIdx + 1}/{statuses.length}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>—</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
                Pipeline:{' '}
                {statuses
                  .slice(statusIdx + 1)
                  .map((s) => STATUS_LABELS[s as keyof typeof STATUS_LABELS])
                  .join(' → ')}
              </span>
            </div>
          )}
        </div>
        {order.status !== 'done' && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>Status Saat Ini</div>
            <div style={{ fontWeight: '700', color: '#cc7030' }}>
              {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        {/* Customer info */}
        <div className="form-section">
          <div className="form-section-title">Pelanggan</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: 'var(--neutral-400)' }}>Nama: </span>
              <strong>{customer?.name ?? '—'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--neutral-400)' }}>HP: </span>
              <a
                href={`https://wa.me/${customer?.phone?.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#16a34a', fontWeight: '500' }}
              >
                {customer?.phone ?? '—'}
              </a>
            </div>
            <div>
              <span style={{ color: 'var(--neutral-400)' }}>Alamat: </span>
              {customer?.address ?? '—'}
            </div>
          </div>
        </div>

        {/* Order info */}
        <div className="form-section">
          <div className="form-section-title">Info Pesanan</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--neutral-400)' }}>Sumber</span>
              <span>{SOURCE_LABELS[order.source]}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--neutral-400)' }}>Jenis</span>
              <span style={{ fontWeight: '600' }}>{order.classification === 'pasang' ? '📍 Pasang' : '📦 Kirim'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--neutral-400)' }}>Total</span>
              <span style={{ fontWeight: '700', color: '#cc7030' }}>{fmt(order.total_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--neutral-400)' }}>DP</span>
              <span>{fmt(order.dp_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--neutral-400)' }}>Lunas</span>
              <span>{fmt(order.lunas_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--neutral-400)' }}>Pembayaran</span>
              <span
                style={{
                  ...PAYMENT_COLORS[order.payment_status],
                  padding: '0.15rem 0.6rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}
              >
                {PAYMENT_STATUS_LABELS[order.payment_status]}
              </span>
            </div>
            {order.return_reason && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  background: '#fef2f2',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  gap: '0.5rem'
                }}
              >
                <span style={{ color: 'var(--neutral-400)', flexShrink: 0 }}>
                  {order.status === 'cancelled' ? 'Alasan Batal:' : 'Alasan Return:'}
                </span>
                <span style={{ color: '#991b1b', fontSize: '0.8rem', fontWeight: '600' }}>{order.return_reason}</span>
              </div>
            )}
            <button
              onClick={onAddPayment}
              type="button"
              style={{
                marginTop: '0.25rem',
                padding: '0.375rem 0.75rem',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              title="Catat DP / pelunasan untuk pesanan ini"
            >
              + Tambah Pembayaran
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
