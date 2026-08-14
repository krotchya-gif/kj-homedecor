'use client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Truck, Package, Search, Check, X, ExternalLink, Printer, Upload, Camera } from 'lucide-react'
import Link from 'next/link'
import type { Order } from '@/types'
import { STATUS_LABELS } from '@/types'
import { useToast } from '@/components/ui/Toast'

const STATUS_COLORS: Record<string, string> = {
  ready: 'badge-ready',
  packed: 'badge-packed',
  shipped: 'badge-shipped'
}

const COURIERS = [
  { value: 'jne', label: 'JNE' },
  { value: 'jnt', label: 'J&T Express' },
  { value: 'sicepat', label: 'SiCepat' },
  { value: 'anteraja', label: 'AnterAja' },
  { value: 'ninja', label: 'Ninja Express' },
  { value: 'pos', label: 'POS Indonesia' },
  { value: 'wahana', label: 'Wahana' },
  { value: '_internal', label: 'Antar Sendiri' }
]

export default function AdminShippingPage() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'ready' | 'packed' | 'shipped'>('ready')
  const [showResiModal, setShowResiModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [resiForm, setResiForm] = useState({ courier: '', tracking_number: '' })
  const [saving, setSaving] = useState(false)
  // foto bukti shipped (required per PHOTO_REQUIRED_STAGES)
  const [shippedPhoto, setShippedPhoto] = useState<string | null>(null)
  const [uploadingShippedPhoto, setUploadingShippedPhoto] = useState(false)

  // upload foto untuk resi
  async function handleShippedPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedOrder) return
    setUploadingShippedPhoto(true)
    try {
      const { uploadToLocal } = await import('@/lib/upload')
      const result = await uploadToLocal(file, 'order_progress', { compress: true, maxSizeMB: 1 })
      setShippedPhoto(result.url)
    } catch (err) {
      console.error('Upload failed:', err)
      toast('error', '⚠️ Gagal upload foto: ' + (err as Error).message)
    } finally {
      setUploadingShippedPhoto(false)
    }
  }

  const supabase = createClient()

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*, customer:customers(name, phone)')
      .eq('classification', 'kirim')
      .in('status', ['ready', 'packed', 'shipped'])
      .order('updated_at', { ascending: false })
    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }

  async function handleMarkPacked(orderId: string) {
    // 2026-08-14 (audit): pakai API route /api/orders/[id] — server-side
    // transition check + payment gate + order_logs (bukan direct update client).
    const packRes = await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'packed', packed_at: new Date().toISOString() })
    })
    const packJson = await packRes.json().catch(() => null)
    if (!packRes.ok) {
      toast('error', 'Gagal mark packed: ' + (packJson?.error?.message ?? `HTTP ${packRes.status}`))
      return
    }
    // Optimistic update
    setOrders((curr) => curr.map((o) => (o.id === orderId ? { ...o, status: 'packed', packed_at: new Date().toISOString() } : o)))
    toast('success', 'Order ditandai Dikemas (packed)')
  }

  async function handleSaveResi() {
    if (!selectedOrder || !resiForm.courier || !resiForm.tracking_number) return
    // foto bukti WAJIB untuk 'shipped' (per PHOTO_REQUIRED_STAGES)
    if (!shippedPhoto) {
      toast('info', '⚠️ Wajib upload foto bukti pengiriman untuk stage "shipped".')
      return
    }
    setSaving(true)
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      // pakai API route (server-side enforcement: role check, transition check)
      const courierLabel = COURIERS.find((c) => c.value === resiForm.courier)?.label ?? resiForm.courier
      const apiRes = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'shipped',
          courier: resiForm.courier,
          tracking_number: resiForm.tracking_number,
          shipped_at: new Date().toISOString(),
          shipped_by: user?.id ?? null,
          photo_urls: [shippedPhoto], // foto bukti
          notes: `Shipped via ${courierLabel}, Resi: ${resiForm.tracking_number}`
        })
      })
      const apiJson = await apiRes.json().catch(() => null)
      if (!apiRes.ok || !apiJson) {
        toast('error', '⚠️ ' + (apiJson?.error?.message ?? `Gagal update order (HTTP ${apiRes.status})`))
        return
      }

      setShowResiModal(false)
      setSelectedOrder(null)
      setResiForm({ courier: '', tracking_number: '' })
      setShippedPhoto(null) // reset foto
      // Optimistic update: status order di list langsung berubah
      setOrders((curr) =>
        curr.map((o) =>
          o.id === apiJson.data?.id || o.id === selectedOrder.id
            ? { ...o, status: 'shipped', courier: resiForm.courier, tracking_number: resiForm.tracking_number }
            : o
        )
      )
      toast('success', 'Order ditandai Terkirim (shipped)')
    } catch (err) {
      console.error('Simpan resi gagal:', err)
      toast('error', '⚠️ Gagal menyimpan resi: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false) // PASTI di-reset walau fetch gagal/throw — cegah tombol stuck "Menyimpan..."
    }
  }

  function openResiModal(order: Order) {
    setSelectedOrder(order)
    // Handle backwards compat: if courier is stored as label, find the value
    const courierValue =
      COURIERS.find((c) => c.value === order.courier)?.value ??
      COURIERS.find((c) => c.label === order.courier)?.value ??
      order.courier ??
      ''
    setResiForm({ courier: courierValue, tracking_number: order.tracking_number || '' })
    setShowResiModal(true)
  }

  const filtered = orders.filter((o) => {
    const matchSearch =
      !search ||
      (o.customer as { name: string })?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (o.tracking_number || '').includes(search) ||
      o.id.includes(search)
    const matchFilter = o.status === filter
    return matchSearch && matchFilter
  })

  const counts = {
    ready: orders.filter((o) => o.status === 'ready').length,
    packed: orders.filter((o) => o.status === 'packed').length,
    shipped: orders.filter((o) => o.status === 'shipped').length
  }

  return (
    <div>
      <PageHeader title="Pengiriman" subtitle="Kelola pesanan yang siap dikemas dan dikirim" />

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(
          [
            { key: 'ready', label: 'Siap Kirim', icon: <Package size={14} /> },
            { key: 'packed', label: 'Dikemas', icon: <Check size={14} /> },
            { key: 'shipped', label: 'Terkirim', icon: <Truck size={14} /> }
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '0.5rem 1rem',
              border: `1px solid ${filter === tab.key ? '#cc7030' : 'var(--neutral-200)'}`,
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              background: filter === tab.key ? '#cc7030' : '#fff',
              color: filter === tab.key ? '#fff' : 'var(--neutral-600)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem'
            }}
          >
            {tab.icon} {tab.label}
            <span
              style={{
                padding: '0.125rem 0.5rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                background: filter === tab.key ? 'rgba(255,255,255,0.2)' : 'var(--neutral-100)'
              }}
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <Search
          size={15}
          style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }}
        />
        <input
          type="text"
          placeholder="Cari nama, resi, atau ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem 1rem 0.75rem 2.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            outline: 'none'
          }}
        />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="section-card">
          <Truck size={40} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
          <p>Tidak ada pesanan</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {filtered.map((order) => (
            <div
              key={order.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid #e5e7eb',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--neutral-600)' }}>
                    {order.order_number || `#${order.id.slice(0, 8)}`}
                  </span>
                  <span
                    className={STATUS_COLORS[order.status]}
                    style={{ padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
                <div style={{ fontWeight: '600', color: 'var(--neutral-800)', marginBottom: '0.25rem' }}>
                  {(order.customer as { name: string })?.name ?? '—'}
                </div>
                {(order.customer as { phone: string })?.phone && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', marginBottom: '0.25rem' }}>
                    📱 {(order.customer as { phone: string })?.phone}
                  </div>
                )}
                {order.tracking_number && (
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--neutral-600)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem'
                    }}
                  >
                    <Truck size={13} /> {COURIERS.find((c) => c.value === order.courier)?.label ?? order.courier} —{' '}
                    <span style={{ fontFamily: 'monospace' }}>{order.tracking_number}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                {order.status === 'ready' && (
                  <button
                    onClick={() => handleMarkPacked(order.id)}
                    title="Tandai pesanan dikemas → lanjut ke tahap Input Resi"
                    style={{
                      padding: '0.5rem 0.875rem',
                      background: 'var(--surface)',
                      color: '#166534',
                      border: '1px solid #16a34a',
                      borderRadius: '0.5rem',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem'
                    }}
                  >
                    <Check size={14} /> Dikemas
                  </button>
                )}
                {order.status === 'packed' && (
                  <button
                    onClick={() => openResiModal(order)}
                    title="Isi kurir & nomor resi, lalu tandai pesanan terkirim"
                    style={{
                      padding: '0.5rem 0.875rem',
                      background: '#cc7030',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem'
                    }}
                  >
                    <Truck size={14} /> Input Resi
                  </button>
                )}
                <Link
                  href={`/admin/orders/${order.id}`}
                  style={{
                    padding: '0.5rem 0.875rem',
                    background: 'var(--surface)',
                    color: 'var(--neutral-700)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    textDecoration: 'none'
                  }}
                >
                  Detail <ExternalLink size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resi Modal */}
      <Modal
        open={showResiModal && !!selectedOrder}
        onClose={() => setShowResiModal(false)}
        maxWidth={420}
        padding="2rem"
      >
        {selectedOrder && (
          <>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}
            >
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Input Resi Pengiriman</h2>
              <button
                onClick={() => setShowResiModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'var(--neutral-100)', borderRadius: '0.5rem' }}>
              <div style={{ fontWeight: '600', color: 'var(--neutral-800)' }}>
                {(selectedOrder.customer as { name: string })?.name}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--neutral-600)' }}>#{selectedOrder.id.slice(0, 8)}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: 'var(--neutral-700)',
                    marginBottom: '0.3rem'
                  }}
                >
                  Kurir *
                </label>
                <select
                  value={resiForm.courier}
                  onChange={(e) => setResiForm((f) => ({ ...f, courier: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    background: 'var(--surface)'
                  }}
                >
                  <option value="">-- Pilih Kurir --</option>
                  {COURIERS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: 'var(--neutral-700)',
                    marginBottom: '0.3rem'
                  }}
                >
                  Nomor Resi *
                </label>
                <input
                  type="text"
                  value={resiForm.tracking_number}
                  onChange={(e) => setResiForm((f) => ({ ...f, tracking_number: e.target.value }))}
                  placeholder="cth: JNE1234567890"
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              {/* Foto bukti shipped WAJIB (PHOTO_REQUIRED_STAGES) */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: 'var(--neutral-700)',
                    marginBottom: '0.3rem'
                  }}
                >
                  Foto Bukti Pengiriman <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {shippedPhoto ? (
                    <div style={{ position: 'relative' }}>
                      <img
                        src={shippedPhoto}
                        alt="Foto bukti"
                        style={{
                          width: 100,
                          height: 100,
                          objectFit: 'cover',
                          borderRadius: '0.5rem',
                          border: '1px solid #d1d5db'
                        }}
                      />
                      <button
                        onClick={() => setShippedPhoto(null)}
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: 20,
                          height: 20,
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 100,
                        height: 100,
                        border: '2px dashed #d1d5db',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        background: 'var(--neutral-100)',
                        gap: '0.25rem'
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleShippedPhotoUpload}
                        disabled={uploadingShippedPhoto}
                        style={{ display: 'none' }}
                      />
                      {uploadingShippedPhoto ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--neutral-600)' }}>Upload...</span>
                      ) : (
                        <>
                          <Camera size={18} style={{ color: 'var(--neutral-400)' }} />
                          <span style={{ fontSize: '0.65rem', color: 'var(--neutral-400)' }}>Wajib</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => {
                    setShowResiModal(false)
                    setShippedPhoto(null)
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    background: 'var(--surface)',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveResi}
                  disabled={saving || !resiForm.courier || !resiForm.tracking_number || !shippedPhoto}
                  title="Simpan resi, unggah foto bukti, dan tandai pesanan TERKIRIM"
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#cc7030',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {saving ? 'Menyimpan...' : 'Simpan & Kirim'}
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
