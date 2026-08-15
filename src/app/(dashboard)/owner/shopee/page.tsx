'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { formatRp } from '@/lib/utils'

interface ShopeeSettings {
  id: string
  partner_id: string
  partner_key: string
  shop_id: string | null
  shop_name: string | null
  seller_name: string | null
  is_active: boolean
}

interface ShopeeOrder {
  id: string
  order_sn: string
  order_status: string | null
  payment_status: string | null
  total_amount: number
  escrow_amount: number
  commission_fee: number
  transaction_fee: number
  service_fee: number
  buyer_name: string | null
  is_synced: boolean
}

const STATUS_LABEL: Record<string, string> = {
  UNPAID: 'Belum Bayar',
  READY_TO_SHIP: 'Siap Kirim',
  PROCESSED: 'Diproses',
  SHIPPED: 'Terkirim',
  COMPLETED: 'Selesai',
  CANCELLED: 'Batal'
}

export default function OwnerShopeePage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<ShopeeSettings | null>(null)
  const [orders, setOrders] = useState<ShopeeOrder[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [form, setForm] = useState({ partner_id: '', partner_key: '', shop_name: '' })
  const supabase = createClient()

  async function loadAll() {
    const { data: settingsData } = await supabase.from('shopee_shop_settings').select('*').limit(1).maybeSingle()
    setSettings((settingsData as ShopeeSettings | null) ?? null)
    if (settingsData) setForm({ partner_id: settingsData.partner_id, partner_key: settingsData.partner_key, shop_name: settingsData.shop_name ?? '' })
    const { data: ordersData } = await supabase
      .from('shopee_shop_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setOrders((ordersData as ShopeeOrder[]) ?? [])
  }

  useEffect(() => {
    loadAll()
    const qs = new URLSearchParams(window.location.search)
    if (qs.get('success') === 'connected') toast('success', 'Shopee berhasil terhubung!')
    else if (qs.get('error')) toast('error', 'Gagal terhubung: ' + qs.get('error'))
    if (qs.get('success') || qs.get('error')) window.history.replaceState({}, '', '/owner/shopee')
  }, [])

  async function saveCredentials(e: React.FormEvent) {
    e.preventDefault()
    setBusy('save')
    const res = await fetch('/api/shopee/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const json = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) {
      toast('error', json.error ?? 'Gagal simpan kredensial')
      return
    }
    toast('success', json.message ?? 'Kredensial disimpan')
    loadAll()
  }

  async function authorize() {
    setBusy('auth')
    const res = await fetch('/api/shopee/auth/reauthorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop_id: settings?.id })
    })
    const json = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok || !json.oauth_url) {
      toast('error', json.error ?? 'Gagal buat link authorize')
      return
    }
    window.location.href = json.oauth_url
  }

  async function runSync(action: string) {
    setBusy(action)
    try {
      const res = await fetch(`/api/shopee/${action}`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast('error', json.error ?? `Gagal ${action}`)
      } else {
        toast('success', json.message ?? `${action} selesai`)
        loadAll()
      }
    } catch (err) {
      toast('error', String(err))
    } finally {
      setBusy(null)
    }
  }

  async function prosesEscrow(orderSn: string) {
    setBusy(`escrow:${orderSn}`)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.rpc('process_shopee_escrow_atomic', { p_order_sn: orderSn, p_actor: user?.id ?? null })
    setBusy(null)
    if (error) {
      toast('error', 'Gagal proses escrow: ' + error.message)
      return
    }
    toast('success', `Escrow ${orderSn} dicatat ke pembukuan`)
    loadAll()
  }

  const pendingEscrow = orders.filter((o) => o.escrow_amount > 0 && !o.is_synced)
  const escrowTotal = pendingEscrow.reduce((s, o) => s + o.escrow_amount, 0)

  return (
    <div>
      <PageHeader title="Shopee Seller" subtitle="Hubungkan toko Shopee — sync order & escrow settlement" />

      {/* Kredensial & koneksi */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--neutral-200)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.75rem' }}>
          Koneksi Shopee Open Platform {settings?.is_active ? '✅ Terhubung' : '— Belum terhubung'}
        </h2>
        {settings?.shop_id && (
          <p style={{ fontSize: '0.85rem', color: 'var(--neutral-600)', marginBottom: '0.75rem' }}>
            Shop ID: <strong>{settings.shop_id}</strong> · {settings.shop_name ?? settings.seller_name ?? '—'}
          </p>
        )}
        <form onSubmit={saveCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 420 }}>
          <input
            required
            placeholder="Partner ID (dari Shopee Open Platform)"
            value={form.partner_id}
            onChange={(e) => setForm((f) => ({ ...f, partner_id: e.target.value }))}
            style={{ padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
          />
          <div style={{ position: 'relative' }}>
            <input
              required
              type={showKey ? 'text' : 'password'}
              placeholder="Partner Key (rahasia)"
              value={form.partner_key}
              onChange={(e) => setForm((f) => ({ ...f, partner_key: e.target.value }))}
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
            />
            <button type="button" onClick={() => setShowKey((v) => !v)} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--neutral-600)' }}>
              {showKey ? 'Sembunyi' : 'Lihat'}
            </button>
          </div>
          <input
            placeholder="Nama toko (opsional)"
            value={form.shop_name}
            onChange={(e) => setForm((f) => ({ ...f, shop_name: e.target.value }))}
            style={{ padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
          />
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" disabled={!!busy} style={{ flex: 1, padding: '0.625rem', background: 'var(--neutral-900)', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: busy ? 'not-allowed' : 'pointer' }}>
              {busy === 'save' ? 'Menyimpan...' : 'Simpan Kredensial'}
            </button>
            <button type="button" onClick={authorize} disabled={!!busy} style={{ flex: 1, padding: '0.625rem', background: '#ee4d2d', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: busy ? 'not-allowed' : 'pointer' }}>
              {busy === 'auth' ? 'Membuat link...' : settings?.is_active ? 'Re-authorize' : 'Authorize Toko'}
            </button>
          </div>
        </form>
        <p style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginTop: '0.75rem' }}>
          Belum punya kredensial? Daftar di <strong>open.shopee.com</strong> → buat aplikasi → redirect URL:{' '}
          <code style={{ background: 'var(--neutral-100)', padding: '0.1rem 0.3rem', borderRadius: '0.25rem' }}>
            https://kjhomedecor.com/api/shopee/auth
          </code>{' '}
          → bind toko.
        </p>
      </div>

      {/* Aksi sinkronisasi */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button onClick={() => runSync('sync-orders')} disabled={!!busy} style={{ padding: '0.625rem 1.25rem', background: '#ee4d2d', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: busy ? 'not-allowed' : 'pointer' }}>
          {busy === 'sync-orders' ? 'Menyinkronkan...' : '🔄 Sync Orders'}
        </button>
        <button onClick={() => runSync('sync-escrow')} disabled={!!busy} style={{ padding: '0.625rem 1.25rem', background: 'var(--neutral-100)', color: 'var(--neutral-700)', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: busy ? 'not-allowed' : 'pointer' }}>
          {busy === 'sync-escrow' ? 'Menyinkronkan...' : '💰 Sync Escrow'}
        </button>
        <button onClick={() => runSync('sync-to-main-orders')} disabled={!!busy} style={{ padding: '0.625rem 1.25rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: busy ? 'not-allowed' : 'pointer' }}>
          {busy === 'sync-to-main-orders' ? 'Memproses...' : '📦 Link ke Main Orders'}
        </button>
      </div>

      {/* Escrow menunggu pencatatan */}
      {pendingEscrow.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            💰 {pendingEscrow.length} escrow siap dicatat ke pembukuan — total {formatRp(escrowTotal)}
          </h3>
          {pendingEscrow.slice(0, 20).map((o) => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid #fef3c7' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{o.order_sn}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{formatRp(o.escrow_amount)}</span>
              <button
                onClick={() => prosesEscrow(o.order_sn)}
                disabled={busy === `escrow:${o.order_sn}`}
                style={{ padding: '0.25rem 0.75rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
              >
                {busy === `escrow:${o.order_sn}` ? 'Memproses...' : 'Catat'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Daftar order */}
      <div className="data-table">
        {orders.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada order — klik "Sync Orders"</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order SN</th>
                <th>Pembeli</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Escrow</th>
                <th>Fee</th>
                <th>Jurnal</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'monospace' }}>{o.order_sn}</td>
                  <td style={{ fontWeight: '500' }}>{o.buyer_name ?? '—'}</td>
                  <td>{STATUS_LABEL[o.order_status ?? ''] ?? o.order_status ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>{formatRp(o.total_amount ?? 0)}</td>
                  <td style={{ textAlign: 'right', color: '#cc7030', fontWeight: '600' }}>{o.escrow_amount > 0 ? formatRp(o.escrow_amount) : '—'}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--neutral-600)' }}>
                    {o.commission_fee + o.transaction_fee + o.service_fee > 0
                      ? `Komisi ${formatRp(o.commission_fee)} · Txn ${formatRp(o.transaction_fee)} · Srv ${formatRp(o.service_fee)}`
                      : '—'}
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
