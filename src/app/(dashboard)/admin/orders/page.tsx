'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, ShoppingCart, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Order } from '@/types'
import { SOURCE_LABELS, STATUS_LABELS } from '@/types'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'

const PAGE_SIZE = 20
const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

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

const STATUS_COLORS: Record<string, string> = {
  new: 'badge-new',
  sorted: 'badge-sorted',
  payment_ok: 'badge-payment',
  production: 'badge-prod',
  ready: 'badge-ready',
  packed: 'badge-packed',
  shipped: 'badge-shipped',
  done: 'badge-done'
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [form, setForm] = useState({
    source: 'offline',
    classification: 'kirim',
    total_amount: '',
    dp_amount: '',
    notes: '',
    customer_name: '',
    customer_phone: '',
    customer_address: ''
  })
  const [customers, setCustomers] = useState<any[]>([])
  const [searchCustomer, setSearchCustomer] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  const supabase = createClient()

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('id, name, phone, address').order('name')
    setCustomers(data ?? [])
  }

  function filteredCustomers(search: string) {
    return customers
      .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search)))
      .slice(0, 10)
  }

  async function fetchOrders() {
    setLoading(true)
    const from = (currentPage - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const [ordersResult, countResult] = await Promise.all([
      supabase
        .from('orders')
        .select('*, customer:customers(name, phone)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to),
      supabase.from('orders').select('id', { count: 'exact', head: true })
    ])

    setOrders((ordersResult.data as Order[]) ?? [])
    setTotalCount(countResult.count ?? 0)
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
  }, [currentPage])
  useEffect(() => {
    if (showForm) fetchCustomers()
  }, [showForm])

  const filtered = orders.filter((o) => {
    const matchSearch =
      !search ||
      (o.customer as { name: string } | null)?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.id.includes(search) ||
      (o.tracking_number || '').includes(search)
    let matchStatus = true
    if (filterStatus === 'ready_to_pack') matchStatus = o.status === 'ready' && o.classification === 'kirim'
    else if (filterStatus === 'ready_to_ship') matchStatus = o.status === 'packed'
    else if (filterStatus) matchStatus = o.status === filterStatus
    return matchSearch && matchStatus
  })

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    // Create or find existing customer
    let customerId: string | null = selectedCustomerId
    let customerWasCreated = false
    if (!customerId && form.customer_name.trim()) {
      const nameTrimmed = form.customer_name.trim()
      // Look up existing customer by phone (if provided) or name
      const { data: existingCust } = await supabase
        .from('customers')
        .select('id')
        .eq(form.customer_phone ? 'phone' : 'name', form.customer_phone ?? nameTrimmed)
        .maybeSingle()

      if (existingCust) {
        customerId = existingCust.id
        // Update customer info if edited
        await supabase
          .from('customers')
          .update({
            name: nameTrimmed,
            phone: form.customer_phone?.trim() || null,
            address: form.customer_address?.trim() || null
          })
          .eq('id', customerId)
      } else {
        const { data: cust } = await supabase
          .from('customers')
          .insert({
            name: nameTrimmed,
            phone: form.customer_phone?.trim() || null,
            address: form.customer_address?.trim() || null
          })
          .select('id')
          .single()
        customerId = cust?.id ?? null
        customerWasCreated = !!customerId
      }
    } else if (customerId) {
      // Update selected customer info if edited
      await supabase
        .from('customers')
        .update({
          name: form.customer_name.trim() || undefined,
          phone: form.customer_phone?.trim() || undefined,
          address: form.customer_address?.trim() || undefined
        })
        .eq('id', customerId)
    }

    const dpAmt = Number(form.dp_amount) || 0
    const totalAmt = Number(form.total_amount) || 0
    const paymentStatus = dpAmt >= totalAmt && totalAmt > 0 ? 'paid' : dpAmt > 0 ? 'partial' : 'pending'

    // Insert order
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        source: form.source,
        classification: form.classification,
        customer_id: customerId,
        total_amount: totalAmt,
        dp_amount: dpAmt,
        lunas_amount: paymentStatus === 'paid' ? totalAmt - dpAmt : 0,
        payment_status: paymentStatus,
        notes: form.notes || null
      })
      .select('id')
      .single()

    if (orderError || !newOrder) {
      // Rollback: delete orphaned customer if it was just created
      if (customerId && customerWasCreated) {
        await supabase.from('customers').delete().eq('id', customerId)
      }
      setSaving(false)
      alert(orderError?.message ?? 'Gagal membuat pesanan')
      return
    }

    // Auto-create verified payment for marketplace orders that are fully paid
    const marketplaceSources = ['shopee', 'tokopedia', 'tiktok']
    if (newOrder && marketplaceSources.includes(form.source) && dpAmt >= totalAmt && totalAmt > 0) {
      await supabase.from('payments').insert({
        order_id: newOrder.id,
        type: dpAmt === totalAmt ? 'lunas' : 'dp',
        amount: dpAmt === totalAmt ? totalAmt : dpAmt,
        date: new Date().toISOString(),
        notes: `Auto-verified: Order dari ${form.source}`
      })
    }

    setSaving(false)
    setShowForm(false)
    fetchOrders()
  }

  return (
    <div>
      <PageHeader title="Pesanan" subtitle="Inbox semua pesanan — Kirim & Pasang" />

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af'
            }}
          />
          <input
            type="text"
            placeholder="Cari nama pelanggan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 1rem 0.625rem 2.25rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '0.625rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            outline: 'none',
            background: '#fff'
          }}
        >
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
          <option value="ready_to_pack">Siap Dikemas</option>
          <option value="ready_to_ship">Siap Kirim</option>
        </select>
        <button
          onClick={() => {
            setForm({
              source: 'offline',
              classification: 'kirim',
              total_amount: '',
              dp_amount: '',
              notes: '',
              customer_name: '',
              customer_phone: '',
              customer_address: ''
            })
            setSelectedCustomerId(null)
            setSearchCustomer('')
            setShowForm(true)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.625rem 1.25rem',
            background: '#cc7030',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: '600',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          <Plus size={16} /> Buat Pesanan
        </button>
      </div>

      {/* Table */}
      <div className="data-table">
        {loading ? (
          <div style={{ padding: '1.5rem' }}>
            <TableSkeleton rows={8} cols={8} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="📦"
            title="Belum ada pesanan"
            description="Pesanan baru akan muncul di sini setelah dibuat."
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>No. Pesanan</th>
                <th>Pelanggan</th>
                <th>Sumber</th>
                <th>Jenis</th>
                <th>Total</th>
                <th>Status</th>
                <th>Resi</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} style={{ cursor: 'pointer' }}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#6b7280', fontWeight: '600' }}>
                    {o.order_number || o.id.slice(0, 8)}
                  </td>
                  <td style={{ fontWeight: '500' }}>{(o.customer as { name: string } | null)?.name ?? '—'}</td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{SOURCE_LABELS[o.source]}</span>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '0.15rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: o.classification === 'pasang' ? '#e0e7ff' : '#f0fdf4',
                        color: o.classification === 'pasang' ? '#3730a3' : '#166534'
                      }}
                    >
                      {o.classification === 'pasang' ? '📍 Pasang' : '📦 Kirim'}
                    </span>
                  </td>
                  <td style={{ fontWeight: '600', color: '#cc7030' }}>{formatRp(o.total_amount)}</td>
                  <td>
                    <span
                      className={STATUS_COLORS[o.status]}
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}
                    >
                      {STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td>
                    {o.tracking_number ? (
                      <div style={{ fontSize: '0.75rem' }}>
                        <div style={{ fontWeight: '600', color: '#374151' }}>
                          {COURIERS.find((c) => c.value === o.courier)?.label ??
                            COURIERS.find((c) => c.label === o.courier)?.label ??
                            o.courier ??
                            '—'}
                        </div>
                        <div style={{ color: '#6b7280', fontFamily: 'monospace' }}>{o.tracking_number}</div>
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      style={{
                        color: '#cc7030',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        textDecoration: 'none'
                      }}
                    >
                      Detail <ExternalLink size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '1rem',
            padding: '0.75rem 0',
            borderTop: '1px solid #e5e7eb'
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            Halaman {currentPage} dari {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))} — {totalCount} pesanan
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                background: '#fff',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                color: currentPage === 1 ? '#9ca3af' : '#374151'
              }}
            >
              <ChevronLeft size={14} /> Sebelumnya
            </button>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                background: '#fff',
                cursor: currentPage >= Math.ceil(totalCount / PAGE_SIZE) ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                color: currentPage >= Math.ceil(totalCount / PAGE_SIZE) ? '#9ca3af' : '#374151'
              }}
            >
              Selanjutnya <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForm(false)
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '0.875rem',
              padding: '2rem',
              width: '100%',
              maxWidth: 520,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)'
            }}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Buat Pesanan Baru</h2>
            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Customer */}
              <div className="form-section">
                <div className="form-section-title">Data Pelanggan</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.3rem'
                      }}
                    >
                      Pilih / Tambah Pelanggan
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Ketik nama atau no HP untuk cari..."
                        value={searchCustomer}
                        onChange={(e) => {
                          setSearchCustomer(e.target.value)
                          if (!e.target.value) {
                            setSelectedCustomerId(null)
                            setForm((f) => ({ ...f, customer_name: '', customer_phone: '', customer_address: '' }))
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '0.625rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          outline: 'none',
                          background: '#fff'
                        }}
                      />
                      {searchCustomer && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 50,
                            background: '#fff',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            maxHeight: 200,
                            overflowY: 'auto'
                          }}
                        >
                          {filteredCustomers(searchCustomer).length === 0 && (
                            <div style={{ padding: '0.75rem', color: '#9ca3af', fontSize: '0.8rem' }}>
                              Ketik untuk cari atau buat pelanggan baru
                            </div>
                          )}
                          {filteredCustomers(searchCustomer).map((c) => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSelectedCustomerId(c.id)
                                setSearchCustomer('')
                                setForm((f) => ({
                                  ...f,
                                  customer_name: c.name,
                                  customer_phone: c.phone || '',
                                  customer_address: c.address || ''
                                }))
                              }}
                              style={{
                                padding: '0.625rem 0.75rem',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f3f4f6',
                                fontSize: '0.85rem',
                                background: selectedCustomerId === c.id ? '#fef3c7' : 'transparent'
                              }}
                            >
                              <div style={{ fontWeight: 500 }}>{c.name}</div>
                              <div style={{ color: '#9ca3af', fontSize: '0.78rem' }}>
                                {c.phone || '—'}
                                {c.address && ` · ${c.address}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {!searchCustomer &&
                      selectedCustomerId &&
                      (() => {
                        const sel = customers.find((c) => c.id === selectedCustomerId)
                        return sel ? (
                          <div style={{ marginTop: '0.25rem', fontSize: '0.78rem', color: '#16a34a' }}>
                            ✓ {sel.name} — {sel.phone || '—'}
                          </div>
                        ) : null
                      })()}
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.3rem'
                      }}
                    >
                      No. HP
                    </label>
                    <input
                      type="text"
                      placeholder="08xxx"
                      value={form.customer_phone}
                      onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.3rem'
                      }}
                    >
                      Alamat
                    </label>
                    <input
                      type="text"
                      placeholder="Alamat lengkap"
                      value={form.customer_address}
                      onChange={(e) => setForm((f) => ({ ...f, customer_address: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Order details */}
              <div className="form-section">
                <div className="form-section-title">Detail Pesanan</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '0.3rem'
                        }}
                      >
                        Sumber
                      </label>
                      <select
                        value={form.source}
                        onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.625rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          outline: 'none',
                          background: '#fff'
                        }}
                      >
                        <option value="offline">Offline</option>
                        <option value="shopee">Shopee</option>
                        <option value="tokopedia">Tokopedia</option>
                        <option value="tiktok">TikTok</option>
                        <option value="landing_page">Landing Page</option>
                      </select>
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '0.3rem'
                        }}
                      >
                        Jenis *
                      </label>
                      <select
                        value={form.classification}
                        onChange={(e) => setForm((f) => ({ ...f, classification: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.625rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          outline: 'none',
                          background: '#fff'
                        }}
                      >
                        <option value="kirim">📦 Kirim</option>
                        <option value="pasang">📍 Pasang</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '0.3rem'
                        }}
                      >
                        Total (Rp)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={form.total_amount}
                        onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.625rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '0.3rem'
                        }}
                      >
                        DP (Rp)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={form.dp_amount}
                        onChange={(e) => setForm((f) => ({ ...f, dp_amount: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.625rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.3rem'
                      }}
                    >
                      Catatan
                    </label>
                    <textarea
                      placeholder="Catatan pesanan..."
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#cc7030',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {saving ? 'Menyimpan...' : 'Buat Pesanan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
