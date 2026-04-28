'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CheckCircle2, Circle, Camera, Loader2 } from 'lucide-react'
import { uploadToLocal } from '@/lib/upload'

interface ChecklistItem {
  id: string
  label: string
  completed: boolean
}

interface BookingWithRelations {
  id: string
  order_id: string
  status: string
  type: string
  scheduled_date: string
  scheduled_time: string
  notes: string
  address: string
  order?: {
    id: string
    customer?: { name: string; phone: string; address: string }
  }
}

export default function InstallerChecklistPage() {
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<string>('')
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', label: 'Ukur ulang di lokasi', completed: false },
    { id: '2', label: 'Pasang bracket/genggam', completed: false },
    { id: '3', label: 'Pasang gorden/roman', completed: false },
    { id: '4', label: 'Rapikan& rapikan kiri-kanan', completed: false },
    { id: '5', label: 'Pasang ker HEADER/熟知', completed: false },
    { id: '6', label: 'Pastikan fungsi optimal', completed: false },
    { id: '7', label: 'Bersihkan area kerja', completed: false },
    { id: '8', label: 'Foto hasil jadi', completed: false },
  ])
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadBookings()
  }, [])

  async function loadBookings() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('install_bookings')
      .select('*, order:orders(id, customer:customers(name, phone, address))')
      .eq('installer_id', user?.id ?? '')
      .in('status', ['in_progress', 'scheduled'])
      .order('scheduled_date', { ascending: true })
    setBookings(data ?? [])
    setLoading(false)
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const result = await uploadToLocal(file, 'evidence', { compress: true, maxSizeMB: 1 })
      setPhotos(prev => [...prev, result.url])
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Gagal upload foto')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBooking) return

    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()

    // Save or update checklist
    const { error: checklistError } = await supabase
      .from('install_checklists')
      .upsert({
        booking_id: selectedBooking,
        items: checklist,
        completed_at: new Date().toISOString(),
        photo_evidence: photos,
      }, { onConflict: 'booking_id' })

    if (checklistError) {
      console.error(checklistError)
      alert('Gagal menyimpan checklist')
      setSubmitting(false)
      return
    }

    // Update booking status to done
    await supabase.from('install_bookings').update({
      status: 'done',
      actual_date: new Date().toISOString(),
    }).eq('id', selectedBooking)

    setSaved(true)
    setSubmitting(false)
    setTimeout(() => {
      setSaved(false)
      setSelectedBooking('')
      setChecklist(prev => prev.map(item => ({ ...item, completed: false })))
      setPhotos([])
      loadBookings()
    }, 1500)
  }

  const selectedBookingData = bookings.find(b => b.id === selectedBooking)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Checklist Pemasangan</h1>
        <p className="page-subtitle">Selesaikan checklist untuk setiap pekerjaan pemasangan</p>
      </div>

      {/* Booking Selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
          Pilih Booking
        </label>
        <select
          value={selectedBooking}
          onChange={(e) => setSelectedBooking(e.target.value)}
          style={{ width: '100%', maxWidth: 500, padding: '0.625rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
        >
          <option value="">-- Pilih Booking --</option>
          {bookings.map(b => (
            <option key={b.id} value={b.id}>
              {b.order?.customer?.name ?? 'Customer'} - {b.scheduled_date} ({b.type})
            </option>
          ))}
        </select>
      </div>

      {selectedBooking && (
        <form onSubmit={handleSubmit}>
          {/* Selected Booking Info */}
          {selectedBookingData && (
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                {selectedBookingData.order?.customer?.name ?? '—'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                {selectedBookingData.address || selectedBookingData.order?.customer?.address}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
                📅 {selectedBookingData.scheduled_date} {selectedBookingData.scheduled_time}
              </div>
            </div>
          )}

          {/* Checklist */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>Daftar Checklist</h3>
            </div>
            <div style={{ padding: '0.5rem' }}>
              {checklist.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => setChecklist(prev => prev.map((_, i) => i === index ? { ..._, completed: !_.completed } : _))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.875rem 1rem',
                    cursor: 'pointer',
                    borderBottom: index < checklist.length - 1 ? '1px solid #f3f4f6' : 'none',
                  }}
                >
                  {item.completed ? (
                    <CheckCircle2 size={20} style={{ color: '#22c55e', flexShrink: 0 }} />
                  ) : (
                    <Circle size={20} style={{ color: '#d1d5db', flexShrink: 0 }} />
                  )}
                  <span style={{
                    fontSize: '0.875rem',
                    color: item.completed ? '#6b7280' : '#1f2937',
                    textDecoration: item.completed ? 'line-through' : 'none',
                  }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Photo Evidence */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>Foto Bukti (Minimal 3 foto)</h3>
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {photos.map((url, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={url} alt={`Evidence ${i + 1}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }} />
                    <button
                      type="button"
                      onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', fontSize: '0.7rem', cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {uploading ? (
                  <div style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: '0.5rem' }}>
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#9ca3af' }} />
                  </div>
                ) : (
                  <label style={{ width: 80, height: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', border: '2px dashed #d1d5db', borderRadius: '0.5rem', cursor: 'pointer' }}>
                    <Camera size={20} style={{ color: '#9ca3af' }} />
                    <span style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: '0.25rem' }}>Upload</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
              {photos.length > 0 && (
                <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                  {photos.length} foto uploaded
                </p>
              )}
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => { setSelectedBooking(''); setChecklist(prev => prev.map(item => ({ ...item, completed: false }))); setPhotos([]) }}
              style={{ padding: '0.75rem 1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || photos.length < 3}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: (submitting || photos.length < 3) ? '#d1d5db' : '#22c55e',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: (submitting || photos.length < 3) ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem',
              }}
            >
              {saved ? '✓ Tersimpan!' : submitting ? 'Menyimpan...' : 'Selesaikan Checklist'}
            </button>
          </div>
          {photos.length < 3 && selectedBooking && (
            <p style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '0.5rem' }}>
              Minimal upload 3 foto bukti pemasangan
            </p>
          )}
        </form>
      )}

      {!selectedBooking && !loading && bookings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          <CheckCircle2 size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
          <p>Tidak ada booking aktif untuk dikerjakan</p>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Memuat...</div>
      )}
    </div>
  )
}