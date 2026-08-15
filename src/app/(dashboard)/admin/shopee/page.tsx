'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { formatRp } from '@/lib/utils'

interface ShopeeOrder {
  id: string
  order_sn: string
  order_status: string | null
  payment_status: string | null
  total_amount: number
  escrow_amount: number
  buyer_name: string | null
  is_synced: boolean
  created_at: string
}

const STATUS_LABEL: Record<string, string> = {
  UNPAID: 'Belum Bayar',
  READY_TO_SHIP: 'Siap Kirim',
  PROCESSED: 'Diproses',
  SHIPPED: 'Terkirim',
  COMPLETED: 'Selesai',
  CANCELLED: 'Batal',
  IN_CANCEL: 'Pembatalan',
  INVOICE_PENDING: 'Menunggu Invoice'
}

export default function AdminShopeePage() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<ShopeeOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const supabase = createClient()

  async function fetchOrders() {
    setLoading(true)
    const { data } = await supabase
      .from('shopee_shop_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    setOrders((data as ShopeeOrder[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  async function runSync(action: string) {
    setBusy(action)
    try {
      const res = await fetch(`/api/shopee/${action}`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast('error', json.error ?? `Gagal ${action}`)
      } else {
        toast('success', json.message ?? `${action} selesai`)
        fetchOrders()
      }
    } catch (err) {
      toast('error', String(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <PageHeader title="Shopee Seller" subtitle="Sync order Shopee → main orders (pembayaran platform otomatis terverifikasi)" />

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => runSync('sync-orders')}
          disabled={!!busy}
          style={{ padding: '0.625rem 1.25rem', background: '#ee4d2d', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: busy ? 'not-allowed' : 'pointer' }}
        >
          {busy === 'sync-orders' ? 'Menyinkronkan...' : '🔄 Sync Orders'}
        </button>
        <button
          onClick={() => runSync('sync-escrow')}
          disabled={!!busy}
          style={{ padding: '0.625rem 1.25rem', background: 'var(--neutral-100)', color: 'var(--neutral-700)', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: busy ? 'not-allowed' : 'pointer' }}
        >
          {busy === 'sync-escrow' ? 'Menyinkronkan...' : '💰 Sync Escrow'}
        </button>
        <button
          onClick={() => runSync('sync-to-main-orders')}
          disabled={!!busy}
          style={{ padding: '0.625rem 1.25rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: busy ? 'not-allowed' : 'pointer' }}
        >
          {busy === 'sync-to-main-orders' ? 'Memproses...' : '📦 Link ke Main Orders'}
        </button>
      </div>

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <p>Belum ada order Shopee — klik "Sync Orders"</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order SN</th>
                <th>Pembeli</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Escrow</th>
                <th>Jurnal</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'monospace' }}>{o.order_sn}</td>
                  <td style={{ fontWeight: '500' }}>{o.buyer_name ?? '—'}</td>
                  <td>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background:
                          o.order_status === 'CANCELLED' ? '#fef2f2' : o.payment_status === 'paid' ? '#d1fae5' : '#fef3c7',
                        color:
                          o.order_status === 'CANCELLED' ? '#dc2626' : o.payment_status === 'paid' ? '#065f46' : '#92400e'
                      }}
                    >
                      {STATUS_LABEL[o.order_status ?? ''] ?? o.order_status ?? '—'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatRp(o.total_amount ?? 0)}</td>
                  <td style={{ textAlign: 'right', color: '#cc7030', fontWeight: '600' }}>
                    {o.escrow_amount > 0 ? formatRp(o.escrow_amount) : '—'}
                  </td>
                  <td>{o.is_synced ? '✅' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
