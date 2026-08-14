'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, ShoppingCart, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Order } from '@/types'
import { SOURCE_LABELS, STATUS_LABELS } from '@/types'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import Pagination from '@/components/ui/Pagination'
import MobileCards from '@/components/ui/MobileCards'
import { formatRp } from '@/lib/utils'


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

interface LooseRow {
  id?: string
  code?: string
  name?: string
  type?: string
  balance?: number
  date?: string
  entry_date?: string
  created_at?: string
  description?: string
  notes?: string
  reference_type?: string
  debit?: number
  credit?: number
  total_debit?: number
  total_credit?: number
  total?: number
  amount?: number
  qty?: number
  status?: string
  order_number?: string
  payment_status?: string
  total_amount?: number
  total_price?: number
  supplier_name?: string
  stock_gudang?: number
  min_stock_level?: number
  cost_per_unit?: number
  unit?: string
  bank_name?: string
  account_number?: string
  account_holder?: string
  account?: { code?: string; name?: string } | null
  [k: string]: unknown
}

export default function OrdersPage() {
  const [PAGE_SIZE, setPageSize] = useState(20)
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
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
  const [customers, setCustomers] = useState<{ id: string; name: string; phone?: string | null; address?: string | null }[]>([])
  const [searchCustomer, setSearchCustomer] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [customerOpen, setCustomerOpen] = useState(false)
  const customerBoxRef = useRef<HTMLDivElement>(null)

  // Tutup dropdown customer saat klik di luar area input+dropdown (fix UX 2026-08-10).
  // PENTING: hanya menutup TAMPILAN — teks ketikan (searchCustomer) & form.customer_name
  // TETAP — user tidak kehilangan inputannya.
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (customerBoxRef.current && !customerBoxRef.current.contains(e.target as Node)) {
        setCustomerOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const supabase = createClient()

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('id, name, phone, address').order('name')
    setCustomers((data ?? []) as { id: string; name: string; phone?: string | null; address?: string | null }[])
  }

  function filteredCustomers(search: string) {
    return customers
      .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search)))
      .slice(0, 10)
  }

  async function fetchOrders() {
    setLoading(true)
    const term = search.trim()

    const params = new URLSearchParams({
      search: term,
      status: filterStatus,
      category: filterCategory,
      limit: String(PAGE_SIZE),
      offset: String((currentPage - 1) * PAGE_SIZE)
    })
    const response = await fetch(`/api/orders?${params}`)
    const json = await response.json().catch(() => null)

    if (!response.ok) {
      console.error('Search orders gagal:', json)
      setOrders([])
      setTotalCount(0)
      setLoading(false)
      return
    }

    setOrders((json?.data as Order[]) ?? [])
    setTotalCount(json?.total ?? json?.data?.length ?? 0)
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
  }, [currentPage, filterCategory, filterStatus, search])
  useEffect(() => {
    // Prefetch customers di mount — dropdown pelanggan langsung siap saat modal dibuka
    fetchCustomers()
  }, [])
  useEffect(() => {
    if (showForm) fetchCustomers()
  }, [showForm])
  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data) setCategories(data)
      })
  }, [])

  const filtered = orders.filter((o) => {
    const matchSearch =
      !search ||
      (o.customer as { name: string } | null)?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (o.order_number || '').toLowerCase().includes(search.toLowerCase()) ||
      o.id.includes(search) ||
      (o.tracking_number || '').includes(search)
    let matchStatus = true
    if (filterStatus === 'ready_to_pack') matchStatus = o.status === 'ready' && o.classification === 'kirim'
    else if (filterStatus === 'ready_to_ship') matchStatus = o.status === 'packed'
    else if (filterStatus) matchStatus = o.status === filterStatus

    const itemCats = (o.order_items ?? []).map((i) => i.product?.category?.name).filter((n): n is string => Boolean(n))
    const matchCategory =
      !filterCategory || itemCats.includes(categories.find((c) => c.id === filterCategory)?.name ?? '')
    return matchSearch && matchStatus && matchCategory
  })

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault()

    // ---- Validasi (temuan QA 2026-08-09: form kosong sebelumnya tetap membuat order) ----
    if (!form.customer_name.trim()) {
      toast('error', 'Nama pelanggan wajib diisi.')
      return
    }
    const totalCheck = Number(form.total_amount) || 0
    if (totalCheck <= 0) {
      toast('error', 'Total pesanan harus lebih dari 0.')
      return
    }
    const dpCheck = Number(form.dp_amount) || 0
    if (dpCheck > totalCheck) {
      toast('error', 'DP tidak boleh lebih besar dari total pesanan.')
      return
    }

    setSaving(true)

    // Create or find existing customer
    let customerId: string | null = selectedCustomerId
    let customerWasCreated = false
    if (!customerId && form.customer_name.trim()) {
      const nameTrimmed = form.customer_name.trim()
      const phoneQ = form.customer_phone?.trim() || null
      // Look up existing customer by phone (if provided) or name
      // PENTING: pakai || (bukan ??) utk phone kosong — `'' ?? x` = '' (masih falsy)
      // → .eq('name', '') MATCH customer produksi name kosong → order salah customer (bug 2026-08-10)
      const { data: existingCust } = await supabase
        .from('customers')
        .select('id')
        .eq(phoneQ ? 'phone' : 'name', phoneQ ?? nameTrimmed)
        .maybeSingle()

      if (existingCust) {
        customerId = existingCust.id
        // Update customer info if edited
        const { error: custUpdErr } = await supabase
          .from('customers')
          .update({
            name: nameTrimmed,
            phone: form.customer_phone?.trim() || null,
            address: form.customer_address?.trim() || null
          })
          .eq('id', customerId)
        if (custUpdErr) { console.error('Update customer gagal:', custUpdErr) }
      } else {
        const { data: cust, error: custInsErr } = await supabase
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
        if (custInsErr) { console.error('Insert customer gagal:', custInsErr) }
      }
    } else if (customerId) {
      // Update selected customer info if edited
      const { error: updErr } = await supabase
        .from('customers')
        .update({
          name: form.customer_name.trim() || undefined,
          phone: form.customer_phone?.trim() || undefined,
          address: form.customer_address?.trim() || undefined
        })
        .eq('id', customerId)
      if (updErr) { console.error('Update customer gagal:', updErr) }
    }

    const dpAmt = Number(form.dp_amount) || 0
    const totalAmt = Number(form.total_amount) || 0

    // SESI 52 (#13): konsolidasi ke POST /api/orders (server-side) + add_order_payment_atomic.
    // Alasan: sebelumnya admin/orders insert `orders` langsung dari client + payments insert
    // + createSimpleJournal ×2 (rollback manual di client) → jalur paralel dari POST /api/orders
    // (2 sumber kebenaran, jurnal/status bisa divergen). Sekarang:
    //   1. POST /api/orders  → buat order + jurnal order_created (idempotency per order)
    //   2. DP > 0            → add_order_payment_atomic (payment row + jurnal payment_received
    //      + orders dp/lunas/payment_status dalam SATU transaksi server)
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: form.source,
        classification: form.classification,
        total_amount: totalAmt,
        // dp_amount sengaja TIDAK dikirim: add_order_payment_atomic di bawah yang
        // mencatat DP (payment row + jurnal + dp/lunas/payment_status). Kalau DP
        // ikut di-insert di order dulu, sisa tagihan sudah berkurang → RPC menolak.
        customer_id: customerId,
        notes: form.notes || undefined
      })
    })
    const resJson = await res.json().catch(() => ({ data: null, error: { message: 'Respons tidak valid dari server' } }))

    if (!res.ok || !resJson.data) {
      // Rollback: delete orphaned customer if it was just created
      if (customerId && customerWasCreated) {
        const { error: rollbackErr } = await supabase.from('customers').delete().eq('id', customerId)
        if (rollbackErr) console.error('Rollback delete customer gagal:', rollbackErr)
      }
      setSaving(false)
      toast('error', resJson.error?.message ?? 'Gagal membuat pesanan')
      return
    }
    const newOrder = resJson.data as { id: string }
    let paymentWarning: string | null = null

    // BUG-004 fix (Opsi B): auto-catat pembayaran via RPC atomic (jejak akuntansi).
    // Berlaku SEMUA source (offline/landing_page/marketplace) selama admin input DP > 0.
    // verified_by = admin yang membuat pesanan.
    // ATURAN: auto-record BUKAN approve — klik Approve oleh Finance di /finance/payments
    // tetap wajib (cek bayar). Order belum lunas → Finance yang approve atau input pelunasan.
    if (newOrder && dpAmt > 0 && totalAmt > 0) {
      const {
        data: { user: adminUser }
      } = await supabase.auth.getUser()
      const payType = dpAmt >= totalAmt ? 'lunas' : 'dp'
      const dpRecorded = dpAmt >= totalAmt ? totalAmt : dpAmt
      // SESI 52 (#13): add_order_payment_atomic — payment row + jurnal payment_received +
      // dp_amount/lunas_amount/payment_status + order_logs SATU transaksi + idempotent
      // (key sama dengan jalur lama admin_dp_auto agar tidak dobel-jurnal saat retry).
      const { error: payErr } = await supabase.rpc('add_order_payment_atomic', {
        p_order_id: newOrder.id,
        p_type: payType,
        p_amount: dpRecorded,
        p_actor: adminUser?.id ?? null,
        p_idempotency_key: `admin_dp_auto:${newOrder.id}`
      })
      if (payErr) {
        console.error('Auto-catat pembayaran gagal:', payErr)
        paymentWarning = '⚠️ Order dibuat, TAPI auto-payment gagal: ' + payErr.message
      }
    }

    setSaving(false)
    setShowForm(false)
    fetchOrders()
    toast(paymentWarning ? 'error' : 'success', paymentWarning ?? 'Pesanan berhasil dibuat')
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
              color: 'var(--neutral-400)'
            }}
          />
          <input
            type="text"
            placeholder="Cari nama pelanggan / no. order / resi..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
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
          onChange={(e) => {
            setFilterStatus(e.target.value)
            setCurrentPage(1)
          }}
          style={{
            padding: '0.625rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            outline: 'none',
            background: 'var(--surface)'
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
        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value)
            setCurrentPage(1)
          }}
          style={{
            padding: '0.625rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            outline: 'none',
            background: 'var(--surface)'
          }}
        >
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
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
      {/* Mobile: card list (desktop: tabel di bawah) */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem' }}>
            <TableSkeleton rows={4} cols={3} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="📦"
            title="Belum ada pesanan"
            description="Pesanan baru akan muncul di sini setelah dibuat."
          />
        ) : (
          <MobileCards
            items={filtered}
            keyOf={(o) => o.id}
            renderCard={(o) => (
              <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">No. Pesanan</span>
                  <span className="mobile-card-value" style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                    {o.order_number || o.id.slice(0, 8)}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Pelanggan</span>
                  <span className="mobile-card-value">
                    {(o.customer as { name: string } | null)?.name ?? '—'}
                    {o.classification === 'pasang' ? ' 📍' : ''}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Jenis</span>
                  <span className="mobile-card-value">
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
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Total</span>
                  <span className="mobile-card-value" style={{ color: '#cc7030' }}>
                    {formatRp(o.total_amount)}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Status</span>
                  <span className="mobile-card-value">
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
                  </span>
                </div>
                <div className="mobile-card-actions">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    style={{ background: 'var(--neutral-100)', color: 'var(--neutral-700)', textDecoration: 'none' }}
                  >
                    Detail <ExternalLink size={13} />
                  </Link>
                </div>
              </div>
            )}
          />
        )}
      </div>
      <div className="data-table desktop-only">
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
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--neutral-600)', fontWeight: '600' }}>
                    {o.order_number || o.id.slice(0, 8)}
                  </td>
                  <td style={{ fontWeight: '500' }}>
                    {(o.customer as { name: string } | null)?.name ?? '—'}
                    {(() => {
                      const cats = Array.from(
                        new Set(
                          (o.order_items ?? [])
                            .map((i) => i.product?.category?.name)
                            .filter((n): n is string => Boolean(n))
                        )
                      )
                      if (!cats.length) return null
                      return (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.3rem' }}>
                          {cats.map((c) => (
                            <span
                              key={c}
                              style={{
                                padding: '0.1rem 0.45rem',
                                borderRadius: '999px',
                                fontSize: '0.68rem',
                                fontWeight: '600',
                                background: '#fef3c7',
                                color: '#92400e'
                              }}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )
                    })()}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>{SOURCE_LABELS[o.source]}</span>
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
                        <div style={{ fontWeight: '600', color: 'var(--neutral-700)' }}>
                          {COURIERS.find((c) => c.value === o.courier)?.label ??
                            COURIERS.find((c) => c.label === o.courier)?.label ??
                            o.courier ??
                            '—'}
                        </div>
                        <div style={{ color: 'var(--neutral-600)', fontFamily: 'monospace' }}>{o.tracking_number}</div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--neutral-400)', fontSize: '0.75rem' }}>—</span>
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
        <Pagination
          currentPage={currentPage}
          totalPages={Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
          onPageChange={setCurrentPage}
          pageSize={PAGE_SIZE}
          onPageSizeChange={(s) => {
            setPageSize(s)
            setCurrentPage(1)
          }}
          totalItems={totalCount}
          startIndex={(currentPage - 1) * PAGE_SIZE + 1}
          endIndex={Math.min(currentPage * PAGE_SIZE, totalCount)}
        />
      )}

      {/* Create Order Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} maxWidth={520} padding="2rem" zIndex={200}>
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
                    color: 'var(--neutral-700)',
                    marginBottom: '0.3rem'
                  }}
                >
                  Pilih / Tambah Pelanggan
                </label>
                <div style={{ position: 'relative' }} ref={customerBoxRef}>
                  <input
                    type="text"
                    placeholder="Ketik nama atau no HP untuk cari... (nama baru langsung diketik)"
                    value={searchCustomer}
                    onChange={(e) => {
                      const v = e.target.value
                      setSearchCustomer(v)
                      setCustomerOpen(true) // ketik → buka dropdown (teks TETAP saat tutup)
                      // Ketik = nama baru / custom: batalkan pilihan existing & ikat nama ke form
                      // (fix 2026-08-10: sebelumnya form.customer_name tak pernah terisi saat
                      // mengetik → user tidak bisa langsung submit nama pelanggan baru)
                      setSelectedCustomerId(null)
                      setForm((f) => ({ ...f, customer_name: v }))
                    }}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      background: 'var(--surface)'
                    }}
                  />
                  {customerOpen && searchCustomer && (
                    <div
                      onMouseDown={(e) => {
                        // Jangan tutup dropdown saat klik di dalam (item pilihan)
                        e.stopPropagation()
                      }}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        background: 'var(--surface)',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        maxHeight: 200,
                        overflowY: 'auto'
                      }}
                    >
                      {filteredCustomers(searchCustomer).length === 0 && (
                        <div style={{ padding: '0.75rem', color: 'var(--neutral-400)', fontSize: '0.8rem' }}>
                          Ketik untuk cari atau buat pelanggan baru
                        </div>
                      )}
                      {filteredCustomers(searchCustomer).map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomerId(c.id)
                            setSearchCustomer('')
                            setCustomerOpen(false)
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
                          <div style={{ color: 'var(--neutral-400)', fontSize: '0.78rem' }}>
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
                    color: 'var(--neutral-700)',
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
                    color: 'var(--neutral-700)',
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
                      color: 'var(--neutral-700)',
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
                      background: 'var(--surface)'
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
                      color: 'var(--neutral-700)',
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
                      background: 'var(--surface)'
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
                      color: 'var(--neutral-700)',
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
                      color: 'var(--neutral-700)',
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
                    color: 'var(--neutral-700)',
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
                background: 'var(--surface)',
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
      </Modal>
    </div>
  )
}
