'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Calendar, Clock, MapPin, Phone, MessageCircle, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
]

const SERVICE_TYPES = [
  { value: 'survey', label: 'Survey Gratis', desc: 'Tim kami datang untuk mengukur ruangan' },
  { value: 'pasang', label: 'Pasang Gorden', desc: 'Pemasangan gorden oleh tim profesional' },
  { value: 'konsultasi', label: 'Konsultasi', desc: 'Konsultasi desain dan pilihan produk' },
]

export default function BookingPage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    date: '',
    time: '',
    service_type: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Get WhatsApp number from landing settings
      const { data: settings } = await supabase
        .from('landing_settings')
        .select('whatsapp_number, whatsapp_message')
        .eq('id', 'hero')
        .single()

      const whatsappNumber = settings?.whatsapp_number ?? '6281234567890'
      const whatsappMessage = settings?.whatsapp_message ?? 'Halo KJ Homedecor'

      // Insert directly with browser client (no auth required for public booking)
      const { error: insertError } = await supabase
        .from('install_bookings')
        .insert({
          customer_name: form.name,
          customer_phone: form.phone,
          address: form.address,
          scheduled_date: form.date,
          scheduled_time: form.time,
          type: form.service_type,
          notes: form.notes,
          status: 'pending',
        })

      if (insertError) throw new Error('Gagal menyimpan booking')

      setSuccess(true)

      // Open WhatsApp with pre-filled message
      const bookingRef = `BOOKING-${Date.now().toString(36).toUpperCase()}`
      const waMessage = `${whatsappMessage}\n\n📋 Booking Reference: ${bookingRef}\n👤 Nama: ${form.name}\n📅 Tanggal: ${form.date}\n⏰ Jam: ${form.time}\n📍 Alamat: ${form.address}\n🔧 Jenis Layanan: ${SERVICE_TYPES.find(s => s.value === form.service_type)?.label}`
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waMessage)}`, '_blank')
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi atau hubungi via WhatsApp.')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ background: '#fff', borderRadius: '1rem', padding: '2.5rem', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <CheckCircle size={32} style={{ color: '#22c55e' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.75rem' }}>Booking Berhasil!</h1>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Terima kasih sudah booking. WhatsApp akan terbuka untuk konfirmasi. Tim kami akan menghubungi Anda untuk konfirmasi jadwal.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/" style={{ padding: '0.75rem 1.5rem', background: '#cc7030', color: '#fff', borderRadius: '0.5rem', fontWeight: '600', textDecoration: 'none' }}>
              Kembali ke Beranda
            </Link>
            <a href={`https://wa.me/6281234567890`} target="_blank" rel="noopener noreferrer" style={{ padding: '0.75rem 1.5rem', background: '#f3f4f6', color: '#374151', borderRadius: '0.5rem', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <MessageCircle size={16} /> Chat WhatsApp
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {/* Simple Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '1rem 1.5rem' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' }}>← Kembali</Link>
          <span style={{ fontWeight: '600', color: '#1f2937' }}>Buat Janji</span>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>Booking Survey & Pasang</h1>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Isi form di bawah untuk menjadwalkan survey atau pemasangan. Tim kami akan menghubungi Anda untuk konfirmasi.</p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
            <span style={{ color: '#dc2626', fontSize: '0.875rem' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.375rem' }}>Nama Lengkap *</label>
            <input
              required
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Masukkan nama lengkap"
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>

          {/* Phone */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.375rem' }}>No. WhatsApp *</label>
            <input
              required
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="08xxxxxxxxxx"
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>

          {/* Address */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.375rem' }}>Alamat Lengkap *</label>
            <textarea
              required
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Jl. Example No.1, RT/RW, Kota"
              rows={3}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
            />
          </div>

          {/* Service Type */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.375rem' }}>Jenis Layanan *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {SERVICE_TYPES.map(s => (
                <label key={s.value} style={{ display: 'flex', gap: '0.75rem', padding: '1rem', border: `2px solid ${form.service_type === s.value ? '#cc7030' : '#e5e7eb'}`, borderRadius: '0.75rem', cursor: 'pointer', background: form.service_type === s.value ? '#fff3e8' : '#fff' }}>
                  <input type="radio" name="service_type" value={s.value} checked={form.service_type === s.value} onChange={handleChange} style={{ accentColor: '#cc7030', marginTop: 3 }} />
                  <div>
                    <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.9rem' }}>{s.label}</div>
                    <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{s.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.375rem' }}>
              <Calendar size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Tanggal Preferred *
            </label>
            <input
              required
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>

          {/* Time Slot */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.375rem' }}>
              <Clock size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Jam Preferred *
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {TIME_SLOTS.map(time => (
                <label key={time} style={{ padding: '0.5rem 0.875rem', border: `2px solid ${form.time === time ? '#cc7030' : '#e5e7eb'}`, borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: form.time === time ? '600' : '400', color: form.time === time ? '#cc7030' : '#6b7280', background: form.time === time ? '#fff3e8' : '#fff' }}>
                  <input type="radio" name="time" value={time} checked={form.time === time} onChange={handleChange} style={{ display: 'none' }} />
                  {time}
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.375rem' }}>Catatan (opsional)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Contoh: Ada 3 jendela ukuran 120x250, perlu informasi tentang gorden blackout..."
              rows={3}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !form.name || !form.phone || !form.address || !form.date || !form.time || !form.service_type}
            style={{
              padding: '1rem',
              background: (!form.name || !form.phone || !form.address || !form.date || !form.time || !form.service_type) ? '#d1d5db' : '#cc7030',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              fontSize: '1rem',
              cursor: (!form.name || !form.phone || !form.address || !form.date || !form.time || !form.service_type) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {loading ? (
              <>Memproses...</>
            ) : (
              <>
                <Calendar size={18} />
                Booking Sekarang
              </>
            )}
          </button>
        </form>

        {/* Alternative contact */}
        <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#f9fafb', borderRadius: '0.75rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.75rem' }}>lebih sukachat langsung?</p>
          <a
            href="https://wa.me/6281234567890?text=Halo%20KJ%20Homedecor,%20saya%20ingin%20booking%20survey"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#25D366', color: '#fff', borderRadius: '0.5rem', fontWeight: '600', textDecoration: 'none', fontSize: '0.9rem' }}
          >
            <MessageCircle size={18} /> Chat WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
