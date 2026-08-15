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
  total_amount: number
  escrow_amount: number
  commission_fee: number
  transaction_fee: number
  service_fee: number
  shipping_amount: number
  is_synced: boolean
  escrow_release_time: string | null
}

export default function FinanceShopeePage() {
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
      .gt('escrow_amount', 0)
      .order('created_at', { ascending: false })
      .limit(200)
    setOrders((data as ShopeeOrder[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  async function runSync() {
    setBusy('sync')
    const res = await fetch('/api/shopee/sync-escrow', { method: 'POST' })
    const json = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) {
      toast('error', json.error ?? 'Gagal sync escrow')
      return
    }
    toast('success', json.message ?? 'Escrow disinkronkan')
    fetchOrders()
  }

  async function catatEscrow(orderSn: string) {
    setBusy(`escrow:${orderSn}`)
    const {
      data: { user }
    } = await supabase.auth.getUser()
    const { error } = await supabase.rpc('process_shopee_escrow_atomic', {
      p_order_sn: orderSn,
      p_actor: user?.id ?? null
    })
    setBusy(null)
    if (error) {
      toast('error', 'Gagal catat escrow: ' + error.message)
      return
    }
    toast('success', `Escrow ${orderSn} dicatat (Dr E Wallet Shopee / Cr Piutang + fee)`)
    fetchOrders()
  }

  const totalEscrow = orders.reduce((s, o) => s + o.escrow_amount, 0)
  const totalUnposted = orders.filter((o) => !o.is_synced).reduce((s, o) => s + o.escrow_amount, 0)

  return (
    <div>
      <PageHeader title="Shopee — Escrow & Settlement" subtitle="Uang masuk escrow Shopee per order — catat ke pembukuan (mirror TikTok settlement)" />

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div style={{ flex: 1, minWidth: 180, background: 'var(--surface)', border: '1px solid var(--neutral-200)', borderRadius: '0.75rem', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>Total Escrow (tampil)</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#16a34a' }}>{formatRp(totalEscrow)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 180, background: 'var(--surface)', border: '1px solid var(--neutral-200)', borderRadius: '0.75rem', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>Belum di-jurnal</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#cc7030' }}>{formatRp(totalUnposted)}</div>
        </div>
        <button
          onClick={runSync}
          disabled={!!busy}
          style={{ alignSelf: 'center', padding: '0.625rem 1.25rem', background: 'var(--neutral-900)', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: busy ? 'not-allowed' : 'pointer' }}
        >
          {busy === 'sync' ? 'Menyinkronkan...' : '🔄 Sync Escrow dari Shopee'}
        </button>
      </div>

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <p>Belum ada escrow — jalankan "Sync Escrow" di /owner/shopee atau tombol di atas</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order SN</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Escrow (net)</th>
                <th style={{ textAlign: 'right' }}>Komisi</th>
                <th style={{ textAlign: 'right' }}>Txn Fee</th>
                <th style={{ textAlign: 'right' }}>Service</th>
                <th style={{ textAlign: 'right' }}>Ongkir</th>
                <th>Rilis</th>
                <th>Jurnal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'monospace' }}>{o.order_sn}</td>
                  <td style={{ textAlign: 'right' }}>{formatRp(o.total_amount ?? 0)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>{formatRp(o.escrow_amount ?? 0)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--neutral-600)' }}>{formatRp(o.commission_fee ?? 0)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--neutral-600)' }}>{formatRp(o.transaction_fee ?? 0)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--neutral-600)' }}>{formatRp(o.service_fee ?? 0)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--neutral-600)' }}>{formatRp(o.shipping_amount ?? 0)}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                    {o.escrow_release_time ? new Date(o.escrow_release_time).toLocaleDateString('id-ID') : '—'}
                  </td>
                  <td>{o.is_synced ? '✅' : '⏳'}</td>
                  <td>
                    {!o.is_synced && (
                      <button
                        onClick={() => catatEscrow(o.order_sn)}
                        disabled={busy === `escrow:${o.order_sn}`}
                        style={{ padding: '0.25rem 0.75rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                      >
                        {busy === `escrow:${o.order_sn}` ? 'Memproses...' : 'Catat'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
