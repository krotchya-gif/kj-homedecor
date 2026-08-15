'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import MobileCards from '@/components/ui/MobileCards'
import { useToast } from '@/components/ui/Toast'
import { formatRp } from '@/lib/utils'
import { Loader2, Info } from 'lucide-react'

// ============================================================
// FINANCE → SHOPEE (sesi 55) — mirror finance/tiktok:
// settlement (pencairan dana) per order + catat ke pembukuan via RPC atomic.
// Terminologi: escrow (internal) ditampilkan "Settlement / Pencairan Dana".
// ============================================================

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
  created_at: string
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
      toast('error', json.error ?? 'Gagal sync settlement')
      return
    }
    toast('success', json.message ?? 'Settlement disinkronkan')
    fetchOrders()
  }

  async function catatSettlement(orderSn: string) {
    setBusy(`settle:${orderSn}`)
    const {
      data: { user }
    } = await supabase.auth.getUser()
    const { error } = await supabase.rpc('process_shopee_escrow_atomic', {
      p_order_sn: orderSn,
      p_actor: user?.id ?? null
    })
    setBusy(null)
    if (error) {
      toast('error', 'Gagal catat settlement: ' + error.message)
      return
    }
    toast('success', `Settlement ${orderSn} dicatat (Dr E Wallet Shopee / Cr Piutang + fee)`)
    fetchOrders()
  }

  // Settlement per bulan (6 terakhir) — stat card
  const monthlyMap = new Map<string, { total: number; count: number }>()
  for (const o of orders) {
    if (!o.escrow_release_time) continue
    const d = new Date(o.escrow_release_time)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = monthlyMap.get(key) ?? { total: 0, count: 0 }
    cur.total += o.escrow_amount
    cur.count += 1
    monthlyMap.set(key, cur)
  }
  const monthlyStats = [...monthlyMap.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 6)
    .map(([month, v]) => ({
      month: new Date(month + '-01').toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
      total: v.total,
      count: v.count
    }))

  const totalEscrow = orders.reduce((s, o) => s + o.escrow_amount, 0)
  const totalUnposted = orders.filter((o) => !o.is_synced).reduce((s, o) => s + o.escrow_amount, 0)

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: 400 }}>
        <Loader2 size={28} className="spin" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Shopee — Settlement (Pencairan Dana)" subtitle="Uang masuk escrow Shopee per order → catat ke pembukuan (mirror TikTok settlement)" />

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div style={{ flex: 1, minWidth: 180, background: 'var(--surface)', border: '1px solid var(--neutral-200)', borderRadius: '0.75rem', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>Total Settlement (tampil)</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#16a34a' }}>{formatRp(totalEscrow)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 180, background: 'var(--surface)', border: '1px solid var(--neutral-200)', borderRadius: '0.75rem', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>Belum di-jurnal</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#cc7030' }}>{formatRp(totalUnposted)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 180, background: 'var(--surface)', border: '1px solid var(--neutral-200)', borderRadius: '0.75rem', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>Settlement per Bulan</div>
          <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#2563eb' }}>
            {monthlyStats.length > 0 ? formatRp(monthlyStats[0].total) : '—'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--neutral-500)', lineHeight: 1.5 }}>
            {monthlyStats.map((m) => (
              <div key={m.month} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span>{m.month}</span>
                <span style={{ fontWeight: '600' }}>{formatRp(m.total)} ({m.count})</span>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={runSync}
          disabled={!!busy}
          style={{ alignSelf: 'center', padding: '0.625rem 1.25rem', background: 'var(--neutral-900)', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: busy ? 'not-allowed' : 'pointer' }}
        >
          {busy === 'sync' ? 'Menyinkronkan...' : '🔄 Sync Settlement dari Shopee'}
        </button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1.25rem' }}>
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: 'var(--neutral-50)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Info size={14} />
          <span style={{ fontSize: '0.78rem', color: 'var(--neutral-600)' }}>
            Settlement = uang yang ditahan Shopee (escrow), dicairkan setelah order selesai — fee dipotong otomatis, jurnal: Dr E Wallet Shopee / Cr Piutang.
          </span>
        </div>
      </div>

      <div className="data-table">
        {orders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <p>Belum ada settlement — jalankan "Sync Settlement" di /owner/shopee atau tombol di atas</p>
          </div>
        ) : (
          <>
            <div className="mobile-only">
              <MobileCards items={orders} keyOf={(o) => o.id} renderCard={(o) => (
                <div className="mobile-card">
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Order</span>
                    <span className="mobile-card-value" style={{ fontFamily: 'monospace' }}>{o.order_sn}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Net cair</span>
                    <span className="mobile-card-value" style={{ color: '#16a34a' }}>{formatRp(o.escrow_amount ?? 0)}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Jurnal</span>
                    <span className="mobile-card-value">{o.is_synced ? '✅' : '⏳'}</span>
                  </div>
                </div>
              )} />
            </div>
            <table className="desktop-only">
              <thead>
                <tr>
                  <th>Order SN</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Net Cair</th>
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
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{o.order_sn}</td>
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
                          onClick={() => catatSettlement(o.order_sn)}
                          disabled={busy === `settle:${o.order_sn}`}
                          style={{ padding: '0.25rem 0.75rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                        >
                          {busy === `settle:${o.order_sn}` ? 'Memproses...' : 'Catat'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}
