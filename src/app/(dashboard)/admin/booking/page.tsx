'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Calendar as CalendarIcon, MapPin, Phone, X, ChevronLeft, ChevronRight, User, Clock } from 'lucide-react'

interface InstallBooking {
  id: string
  order_id: string
  customer_id: string
  address: string
  scheduled_date: string
  scheduled_time: string
  type: string
  status: string
  installer_id: string | null
  notes: string | null
  customer?: { name: string; phone: string }
  installer?: { name: string }
}

interface Order {
  id: string
  classification: string
  status: string
  total_amount: number
  customer?: { name: string; phone: string; address: string }
}

interface UserType {
  id: string
  name: string
  role: string
}

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export default function AdminBookingPage() {
  const [bookings, setBookings] = useState<InstallBooking[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [installers, setInstallers] = useState<UserType[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    order_id: '',
    address: '',
    scheduled_date: '',
    scheduled_time: '',
    type: 'pasang',
    installer_id: '',
    notes: '',
  })

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: bookingsData }, { data: ordersData }, { data: installersData }] = await Promise.all([
      supabase.from('install_bookings').select('*, customer:customers(name, phone), installer:users(name)').order('scheduled_date'),
      supabase.from('orders').select('*, customer:customers(name, phone, address)').eq('classification', 'pasang').neq('status', 'done'),
      supabase.from('users').select('id, name, role').eq('role', 'installer'),
    ])
    setBookings(bookingsData ?? [])
    setOrders(ordersData ?? [])
    setInstallers(installersData ?? [])
    setLoading(false)
  }

  async function handleCreateBooking(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const selectedOrder = orders.find(o => o.id === form.order_id)
    let customerId: string | null = null
    if (selectedOrder?.customer?.name) {
      const { data: existing } = await supabase.from('customers').select('id').ilike('name', selectedOrder.customer.name).limit(1).single()
      if (existing) {
        customerId = existing.id
      } else {
        const { data } = await supabase.from('customers').insert({
          name: selectedOrder.customer.name ?? 'Unknown',
          phone: selectedOrder.customer.phone ?? '',
          address: selectedOrder.customer.address ?? '',
        }).select('id').single()
        customerId = data?.id ?? null
      }
    }

    await supabase.from('install_bookings').insert({
      order_id: form.order_id,
      customer_id: customerId,
      address: form.address,
      scheduled_date: form.scheduled_date,
      scheduled_time: form.scheduled_time,
      type: form.type,
      installer_id: form.installer_id,
      notes: form.notes,
      status: 'scheduled',
    })

    setSaving(false)
    setShowForm(false)
    setForm({ order_id: '', address: '', scheduled_date: '', scheduled_time: '', type: 'pasang', installer_id: '', notes: '' })
    loadData()
  }

  function handleOrderSelect(orderId: string) {
    const order = orders.find(o => o.id === orderId)
    if (order) {
      setForm(prev => ({
        ...prev,
        order_id: orderId,
        address: order.customer?.address ?? prev.address,
      }))
    }
  }

  // Calendar logic
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const calCells = Array.from({ length: 42 }, (_, i) => {
    const d = i - firstDay + 1
    if (d < 1 || d > daysInMonth) return null
    return d
  })

  const bookingsByDate: Record<string, InstallBooking[]> = {}
  bookings.forEach(b => {
    if (b.scheduled_date) {
      const key = b.scheduled_date.slice(0, 10)
      if (!bookingsByDate[key]) bookingsByDate[key] = []
      bookingsByDate[key].push(b)
    }
  })

  const upcomingBookings = bookings
    .filter(b => b.status === 'scheduled' || b.status === 'in_progress')
    .sort((a, b) => (a.scheduled_date ?? '') < (b.scheduled_date ?? '') ? -1 : 1)

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

  function getWhatsAppLink(phone: string, name: string, date: string, time: string) {
    const msg = `Halo ${name}, remind bahwa pemasangan terjadwal pada:\n📅 ${date}\n⏰ ${time}\nMohon memastikan area siap untuk pemasangan. Terima kasih!`
    return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Booking & Pemasangan</h1>
          <p className="page-subtitle">Kalender jadwal pemasangan untuk pelanggan "Pasang"</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}
        >
          <Plus size={16} /> Tambah Booking
        </button>
      </div>

      {/* Calendar */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1.5rem' }}>
        {/* Calendar Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.375rem', cursor: 'pointer' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: '700', fontSize: '1rem', color: '#1f2937' }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.375rem', cursor: 'pointer' }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
          {DAYS.map(d => (
            <div key={d} style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {calCells.map((day, i) => {
            if (!day) return <div key={i} style={{ minHeight: 80, borderRight: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }} />
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayBookings = bookingsByDate[dateStr] ?? []
            const isToday = dateStr === new Date().toISOString().slice(0, 10)
            return (
              <div
                key={i}
                style={{
                  minHeight: 80,
                  borderRight: '1px solid #f3f4f6',
                  borderBottom: '1px solid #f3f4f6',
                  padding: '0.375rem',
                  background: isToday ? '#fff7ed' : '#fff',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: isToday ? '700' : '400', color: isToday ? '#cc7030' : '#9ca3af', marginBottom: '0.25rem' }}>
                  {day}
                </div>
                {dayBookings.slice(0, 2).map(b => (
                  <div
                    key={b.id}
                    style={{
                      fontSize: '0.65rem',
                      padding: '0.125rem 0.375rem',
                      borderRadius: '0.25rem',
                      background: b.status === 'done' ? '#d1fae5' : b.status === 'in_progress' ? '#fef3c7' : '#e0e7ff',
                      color: b.status === 'done' ? '#065f46' : b.status === 'in_progress' ? '#92400e' : '#3730a3',
                      marginBottom: '1px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {b.customer?.name ?? 'Book'} • {b.type === 'pasang' ? '📍' : '📦'} {b.scheduled_time ?? ''}
                  </div>
                ))}
                {dayBookings.length > 2 && (
                  <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>+{dayBookings.length - 2} more</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>Upcoming Bookings ({upcomingBookings.length})</h2>
        {upcomingBookings.length === 0 ? (
          <div className="data-table" style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
            <CalendarIcon size={28} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Tidak ada booking mendatang</p>
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Pelanggan</th>
                  <th>Alamat</th>
                  <th>Tipe</th>
                  <th>Installer</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {upcomingBookings.map(b => (
                  <tr key={b.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>{b.scheduled_date}</div>
                      {b.scheduled_time && <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{b.scheduled_time}</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{b.customer?.name ?? '—'}</div>
                      {b.customer?.phone && (
                        <a href={`https://wa.me/${b.customer.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#16a34a', textDecoration: 'none' }}>
                          💬 {b.customer.phone}
                        </a>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#6b7280', maxWidth: 180 }}>
                      {b.address || '—'}
                    </td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: '600',
                        background: b.type === 'pasang' ? '#e0e7ff' : '#f0fdf4',
                        color: b.type === 'pasang' ? '#3730a3' : '#166534',
                      }}>
                        {b.type === 'pasang' ? '📍 Pasang' : '📦 Kirim'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{b.installer?.name ?? '—'}</td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: '600',
                        background: b.status === 'in_progress' ? '#fef3c7' : '#e0e7ff',
                        color: b.status === 'in_progress' ? '#92400e' : '#3730a3',
                      }}>
                        {b.status === 'scheduled' ? 'Terjadwal' : b.status === 'in_progress' ? 'Dikerjakan' : b.status}
                      </span>
                    </td>
                    <td>
                      {b.customer?.phone && (
                        <a
                          href={getWhatsAppLink(b.customer.phone, b.customer.name ?? '', b.scheduled_date, b.scheduled_time ?? '')}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#16a34a', fontSize: '0.78rem', fontWeight: '600', textDecoration: 'none' }}
                        >
                          💬 Reminder
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Booking Modal */}
      {showForm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}
        >
          <div style={{ background: '#fff', borderRadius: '0.875rem', padding: '2rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Tambah Booking</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateBooking} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Pilih Order (Pasang) *</label>
                <select
                  required
                  value={form.order_id}
                  onChange={(e) => handleOrderSelect(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
                >
                  <option value="">-- Pilih Order --</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.customer?.name ?? 'Order'} - {formatRp(o.total_amount)} ({o.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Alamat Pemasangan *</label>
                <input
                  required
                  type="text"
                  placeholder="Jl. ... No. ..."
                  value={form.address}
                  onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Tanggal *</label>
                  <input
                    required
                    type="date"
                    value={form.scheduled_date}
                    onChange={(e) => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Waktu</label>
                  <input
                    type="time"
                    value={form.scheduled_time}
                    onChange={(e) => setForm(f => ({ ...f, scheduled_time: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Tipe</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
                >
                  <option value="pasang">📍 Pasang</option>
                  <option value="survey">🔍 Survey</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Installer *</label>
                <select
                  required
                  value={form.installer_id}
                  onChange={(e) => setForm(f => ({ ...f, installer_id: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
                >
                  <option value="">-- Pilih Installer --</option>
                  {installers.map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Catatan</label>
                <textarea
                  placeholder="Catatan tambahan..."
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: '#fff', cursor: 'pointer', fontWeight: '600' }}>Batal</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.75rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                  {saving ? 'Menyimpan...' : 'Simpan Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}