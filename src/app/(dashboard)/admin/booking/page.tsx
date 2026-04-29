'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Calendar as CalendarIcon, MapPin, Phone, X, ChevronLeft, ChevronRight, User, Clock, Home, MapPinned, Check, Eye, Edit } from 'lucide-react'

interface InstallBooking {
  id: string
  order_id: string | null
  customer_id: string | null
  address: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  type: string
  status: string
  installer_id: string | null
  notes: string | null
  customer_name: string | null
  customer_phone: string | null
  source: string | null
  created_at: string
  installer?: { name: string }
}

interface UserType {
  id: string
  name: string
  role: string
}

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Menunggu', color: '#92400e', bg: '#fef3c7' },
  scheduled: { label: 'Terjadwal', color: '#3730a3', bg: '#e0e7ff' },
  done: { label: 'Selesai', color: '#065f46', bg: '#d1fae5' },
  cancelled: { label: 'Dibatalkan', color: '#991b1b', bg: '#fee2e2' },
}

const TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  survey: { label: 'Visit Toko', icon: <Home size={12} /> },
  pasang: { label: 'Pemasangan', icon: <MapPinned size={12} /> },
}

export default function AdminBookingPage() {
  const [bookings, setBookings] = useState<InstallBooking[]>([])
  const [installers, setInstallers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [selectedBooking, setSelectedBooking] = useState<InstallBooking | null>(null)

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    address: '',
    scheduled_date: '',
    scheduled_time: '',
    type: 'survey',
    installer_id: '',
    notes: '',
  })

  const [acceptForm, setAcceptForm] = useState({
    scheduled_date: '',
    scheduled_time: '',
    installer_id: '',
  })

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: bookingsData }, { data: installersData }] = await Promise.all([
      supabase.from('install_bookings').select('*, installer:users(name)').order('created_at', { ascending: false }),
      supabase.from('users').select('id, name, role').eq('role', 'installer'),
    ])
    setBookings(bookingsData ?? [])
    setInstallers(installersData ?? [])
    setLoading(false)
  }

  async function handleCreateBooking(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    await supabase.from('install_bookings').insert({
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      address: form.type === 'survey' ? null : form.address,
      scheduled_date: form.scheduled_date || null,
      scheduled_time: form.scheduled_time || null,
      type: form.type,
      installer_id: form.installer_id || null,
      notes: form.notes,
      status: form.scheduled_date && form.installer_id ? 'scheduled' : 'pending',
      source: 'manual',
    })

    setSaving(false)
    setShowForm(false)
    setForm({ customer_name: '', customer_phone: '', address: '', scheduled_date: '', scheduled_time: '', type: 'survey', installer_id: '', notes: '' })
    loadData()
  }

  async function handleAcceptBooking() {
    if (!selectedBooking) return
    setSaving(true)

    await supabase.from('install_bookings').update({
      scheduled_date: acceptForm.scheduled_date,
      scheduled_time: acceptForm.scheduled_time,
      installer_id: acceptForm.installer_id,
      status: 'scheduled',
    }).eq('id', selectedBooking.id)

    setSaving(false)
    setShowAcceptModal(false)
    setSelectedBooking(null)
    setAcceptForm({ scheduled_date: '', scheduled_time: '', installer_id: '' })
    loadData()
  }

  async function handleUpdateStatus(bookingId: string, newStatus: string) {
    await supabase.from('install_bookings').update({ status: newStatus }).eq('id', bookingId)
    loadData()
  }

  function openAcceptModal(booking: InstallBooking) {
    setSelectedBooking(booking)
    setAcceptForm({
      scheduled_date: booking.scheduled_date ?? '',
      scheduled_time: booking.scheduled_time ?? '',
      installer_id: booking.installer_id ?? '',
    })
    setShowAcceptModal(true)
  }

  // Filter bookings by tab
  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'all') return true
    if (activeTab === 'pending') return b.status === 'pending'
    if (activeTab === 'scheduled') return b.status === 'scheduled' || b.status === 'in_progress'
    if (activeTab === 'done') return b.status === 'done'
    return true
  })

  // Stats
  const stats = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    scheduled: bookings.filter(b => b.status === 'scheduled' || b.status === 'in_progress').length,
    done: bookings.filter(b => b.status === 'done').length,
  }

  function getWhatsAppLink(phone: string, name: string) {
    const msg = `Halo ${name}, terima kasih sudah booking di KJ Homedecor. Kami akan segera menghubungi Anda untuk konfirmasi jadwal.`
    return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Booking & Pemasangan</h1>
          <p className="page-subtitle">Kelola semua booking dari customer dan manual</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}
        >
          <Plus size={16} /> Tambah Manual
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'Semua', count: stats.all },
          { key: 'pending', label: 'Menunggu', count: stats.pending },
          { key: 'scheduled', label: 'Terjadwal', count: stats.scheduled },
          { key: 'done', label: 'Selesai', count: stats.done },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.5rem 1rem',
              border: `1px solid ${activeTab === tab.key ? '#cc7030' : '#e5e7eb'}`,
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              background: activeTab === tab.key ? '#cc7030' : '#fff',
              color: activeTab === tab.key ? '#fff' : '#6b7280',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            {tab.label}
            <span style={{
              padding: '0.125rem 0.5rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Booking List */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
      ) : filteredBookings.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#9ca3af', background: '#fff', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <CalendarIcon size={40} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
          <p>Tidak ada booking</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {filteredBookings.map(booking => {
            const statusInfo = STATUS_LABELS[booking.status] ?? { label: booking.status, color: '#6b7280', bg: '#f3f4f6' }
            const typeInfo = TYPE_LABELS[booking.type] ?? { label: booking.type, icon: null }

            return (
              <div
                key={booking.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                }}
              >
                {/* Left info */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                      {booking.customer_name ?? 'Tanpa Nama'}
                    </span>
                    {booking.customer_phone && (
                      <a
                        href={getWhatsAppLink(booking.customer_phone, booking.customer_name ?? '')}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.78rem', color: '#16a34a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        📱 {booking.customer_phone}
                      </a>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                    {/* Type badge */}
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: '600',
                      background: booking.type === 'pasang' ? '#e0e7ff' : '#f0fdf4',
                      color: booking.type === 'pasang' ? '#3730a3' : '#166534',
                    }}>
                      {typeInfo.icon} {typeInfo.label}
                    </span>

                    {/* Status badge */}
                    <span style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: '600',
                      background: statusInfo.bg,
                      color: statusInfo.color,
                    }}>
                      {statusInfo.label}
                    </span>

                    {/* Source badge */}
                    {booking.source && (
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                        dari {booking.source}
                      </span>
                    )}
                  </div>

                  {/* Address */}
                  {booking.address && (
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'flex-start', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <MapPin size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                      {booking.address}
                    </div>
                  )}

                  {/* Schedule */}
                  {booking.scheduled_date && (
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <CalendarIcon size={14} />
                      {booking.scheduled_date} {booking.scheduled_time && `• ${booking.scheduled_time}`}
                      {booking.installer && `• Installer: ${booking.installer.name}`}
                    </div>
                  )}

                  {/* Notes */}
                  {booking.notes && (
                    <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.25rem', fontStyle: 'italic' }}>
                      "{booking.notes}"
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  {booking.status === 'pending' && (
                    <button
                      onClick={() => openAcceptModal(booking)}
                      style={{
                        padding: '0.5rem 0.875rem',
                        background: '#22c55e',
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
                      <Check size={14} /> Accept
                    </button>
                  )}

                  {booking.status === 'scheduled' && (
                    <button
                      onClick={() => handleUpdateStatus(booking.id, 'done')}
                      style={{
                        padding: '0.5rem 0.875rem',
                        background: '#16a34a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      ✓ Selesai
                    </button>
                  )}

                  {booking.status !== 'done' && booking.status !== 'cancelled' && (
                    <button
                      onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                      style={{
                        padding: '0.5rem 0.875rem',
                        background: '#fff',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '0.5rem',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Manual Modal */}
      {showForm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}
        >
          <div style={{ background: '#fff', borderRadius: '0.875rem', padding: '2rem', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Tambah Booking Manual</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Nama Customer *</label>
                  <input required type="text" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>No. WhatsApp *</label>
                  <input required type="tel" value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Jenis Layanan</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[
                    { value: 'survey', label: '🏠 Visit Toko' },
                    { value: 'pasang', label: '📍 Pemasangan' },
                  ].map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: t.value }))}
                      style={{
                        flex: 1,
                        padding: '0.625rem',
                        border: `2px solid ${form.type === t.value ? '#cc7030' : '#e5e7eb'}`,
                        borderRadius: '0.5rem',
                        background: form.type === t.value ? '#fff3e8' : '#fff',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.type === 'pasang' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Alamat</label>
                  <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', resize: 'vertical' }} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Tanggal</label>
                  <input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Jam</label>
                  <input type="time" value={form.scheduled_time} onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Installer</label>
                <select value={form.installer_id} onChange={e => setForm(f => ({ ...f, installer_id: e.target.value }))} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', background: '#fff' }}>
                  <option value="">-- Pilih Installer --</option>
                  {installers.map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Catatan</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: '#fff', cursor: 'pointer', fontWeight: '600' }}>Batal</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.75rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accept/Schedule Modal */}
      {showAcceptModal && selectedBooking && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAcceptModal(false) }}
        >
          <div style={{ background: '#fff', borderRadius: '0.875rem', padding: '2rem', width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Accept & Jadwalkan</h2>
              <button onClick={() => setShowAcceptModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
              <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>{selectedBooking.customer_name}</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                {selectedBooking.customer_phone} • {TYPE_LABELS[selectedBooking.type]?.label}
              </div>
              {selectedBooking.address && (
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>📍 {selectedBooking.address}</div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Tanggal *</label>
                <input
                  required
                  type="date"
                  value={acceptForm.scheduled_date}
                  onChange={e => setAcceptForm(f => ({ ...f, scheduled_date: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Jam</label>
                <input
                  type="time"
                  value={acceptForm.scheduled_time}
                  onChange={e => setAcceptForm(f => ({ ...f, scheduled_time: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Installer *</label>
                <select
                  required
                  value={acceptForm.installer_id}
                  onChange={e => setAcceptForm(f => ({ ...f, installer_id: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', background: '#fff' }}
                >
                  <option value="">-- Pilih Installer --</option>
                  {installers.map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAcceptModal(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: '#fff', cursor: 'pointer', fontWeight: '600' }}>Batal</button>
                <button
                  onClick={handleAcceptBooking}
                  disabled={saving || !acceptForm.scheduled_date || !acceptForm.installer_id}
                  style={{ flex: 1, padding: '0.75rem', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}
                >
                  {saving ? 'Menyimpan...' : 'Accept & Jadwalkan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}