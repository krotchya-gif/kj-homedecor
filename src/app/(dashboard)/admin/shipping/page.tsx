'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Truck, Package, Search, Check, X, ExternalLink, Printer } from 'lucide-react'
import Link from 'next/link'
import type { Order } from '@/types'
import { STATUS_LABELS } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  ready: 'badge-ready',
  packed: 'badge-packed',
  shipped: 'badge-shipped',
}

const COURIERS = [
  { value: 'jne', label: 'JNE' },
  { value: 'jnt', label: 'J&T Express' },
  { value: 'sicepat', label: 'SiCepat' },
  { value: 'anteraja', label: 'AnterAja' },
  { value: 'ninja', label: 'Ninja Express' },
  { value: 'pos', label: 'POS Indonesia' },
  { value: 'wahana', label: 'Wahana' },
  { value: '_internal', label: 'Antar Sendiri' },
]

export default function AdminShippingPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'ready' | 'packed' | 'shipped'>('ready')
  const [showResiModal, setShowResiModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [resiForm, setResiForm] = useState({ courier: '', tracking_number: '' })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => { loadOrders() }, [])

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
    await supabase.from('orders').update({ status: 'packed', packed_at: new Date().toISOString() }).eq('id', orderId)
    await supabase.from('order_logs').insert({ order_id: orderId, action: 'packed', notes: 'Marked as packed from shipping page' })
    loadOrders()
  }

  async function handleSaveResi() {
    if (!selectedOrder || !resiForm.courier || !resiForm.tracking_number) return
    setSaving(true)

    const courierLabel = COURIERS.find(c => c.value === resiForm.courier)?.label ?? resiForm.courier

    await supabase.from('orders').update({
      status: 'shipped',
      courier: courierLabel,
      tracking_number: resiForm.tracking_number,
      shipped_at: new Date().toISOString(),
    }).eq('id', selectedOrder.id)

    await supabase.from('order_logs').insert({
      order_id: selectedOrder.id,
      action: 'shipped',
      notes: `Shipped via ${courierLabel}, Resi: ${resiForm.tracking_number}`,
    })

    setSaving(false)
    setShowResiModal(false)
    setSelectedOrder(null)
    setResiForm({ courier: '', tracking_number: '' })
    loadOrders()
  }

  function openResiModal(order: Order) {
    setSelectedOrder(order)
    setResiForm({ courier: order.courier || '', tracking_number: order.tracking_number || '' })
    setShowResiModal(true)
  }

  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      (o.customer as { name: string })?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (o.tracking_number || '').includes(search) ||
      o.id.includes(search)
    const matchFilter = o.status === filter
    return matchSearch && matchFilter
  })

  const counts = {
    ready: orders.filter(o => o.status === 'ready').length,
    packed: orders.filter(o => o.status === 'packed').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pengiriman</h1>
          <p className="page-subtitle">Kelola pesanan yang siap dikemas dan dikirim</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {([
          { key: 'ready', label: 'Siap Kirim', icon: <Package size={14} /> },
          { key: 'packed', label: 'Dikemas', icon: <Check size={14} /> },
          { key: 'shipped', label: 'Terkirim', icon: <Truck size={14} /> },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '0.5rem 1rem',
              border: `1px solid ${filter === tab.key ? '#cc7030' : '#e5e7eb'}`,
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              background: filter === tab.key ? '#cc7030' : '#fff',
              color: filter === tab.key ? '#fff' : '#6b7280',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            {tab.icon} {tab.label}
            <span style={{
              padding: '0.125rem 0.5rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              background: filter === tab.key ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
            }}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input
          type="text"
          placeholder="Cari nama, resi, atau ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
        />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#9ca3af', background: '#fff', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <Truck size={40} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
          <p>Tidak ada pesanan</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {filtered.map(order => (
            <div key={order.id} style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#6b7280' }}>#{order.id.slice(0, 8)}</span>
                  <span className={STATUS_COLORS[order.status]} style={{ padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600' }}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
                <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                  {(order.customer as { name: string })?.name ?? '—'}
                </div>
                {(order.customer as { phone: string })?.phone && (
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    📱 {(order.customer as { phone: string })?.phone}
                  </div>
                )}
                {order.tracking_number && (
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Truck size={13} /> {order.courier} — <span style={{ fontFamily: 'monospace' }}>{order.tracking_number}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                {order.status === 'ready' && (
                  <button
                    onClick={() => handleMarkPacked(order.id)}
                    style={{
                      padding: '0.5rem 0.875rem',
                      background: '#fff',
                      color: '#166534',
                      border: '1px solid #16a34a',
                      borderRadius: '0.5rem',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    <Check size={14} /> Dikemas
                  </button>
                )}
                {(order.status === 'ready' || order.status === 'packed') && (
                  <button
                    onClick={() => openResiModal(order)}
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
                      gap: '0.375rem',
                    }}
                  >
                    <Truck size={14} /> Input Resi
                  </button>
                )}
                <Link
                  href={`/admin/orders/${order.id}`}
                  style={{
                    padding: '0.5rem 0.875rem',
                    background: '#fff',
                    color: '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    textDecoration: 'none',
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
      {showResiModal && selectedOrder && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setShowResiModal(false) }}
        >
          <div style={{ background: '#fff', borderRadius: '0.875rem', padding: '2rem', width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Input Resi Pengiriman</h2>
              <button onClick={() => setShowResiModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '1.25rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
              <div style={{ fontWeight: '600', color: '#1f2937' }}>{(selectedOrder.customer as { name: string })?.name}</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>#{selectedOrder.id.slice(0, 8)}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Kurir *</label>
                <select
                  value={resiForm.courier}
                  onChange={e => setResiForm(f => ({ ...f, courier: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', background: '#fff' }}
                >
                  <option value="">-- Pilih Kurir --</option>
                  {COURIERS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Nomor Resi *</label>
                <input
                  type="text"
                  value={resiForm.tracking_number}
                  onChange={e => setResiForm(f => ({ ...f, tracking_number: e.target.value }))}
                  placeholder="cth: JNE1234567890"
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={() => setShowResiModal(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: '#fff', cursor: 'pointer', fontWeight: '600' }}>Batal</button>
                <button
                  onClick={handleSaveResi}
                  disabled={saving || !resiForm.courier || !resiForm.tracking_number}
                  style={{ flex: 1, padding: '0.75rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}
                >
                  {saving ? 'Menyimpan...' : 'Simpan & Kirim'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}