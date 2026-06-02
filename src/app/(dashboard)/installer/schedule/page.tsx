'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Calendar, MapPin, CheckCircle2, Clock, AlertTriangle, X, Upload } from 'lucide-react'
import { uploadToLocal } from '@/lib/upload'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  scheduled:  { bg: '#dbeafe', text: '#1e40af' },
  in_progress:{ bg: '#fef3c7', text: '#92400e' },
  revision:   { bg: '#fee2e2', text: '#991b1b' },
  done:       { bg: '#d1fae5', text: '#065f46' },
  cancelled:  { bg: '#f3f4f6', text: '#6b7280' },
}

export default function InstallerSchedulePage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<'upcoming' | 'done'>('upcoming')
  const [showRevision, setShowRevision] = useState(false)
  const [revBooking, setRevBooking]     = useState<any | null>(null)
  const [revReason,  setRevReason]      = useState('')
  const [revPhotos,  setRevPhotos]       = useState<string[]>([])
  const [uploading,  setUploading]       = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('install_bookings')
      .select('*, order:orders(id, customer:customers(name, phone, address)), assigned_to:users(name)')
      .eq('installer_id', user?.id ?? '')
      .order('scheduled_date', { ascending: true })
    setBookings(data ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
    const channel = supabase
      .channel('installer-schedule')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'install_bookings' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const upcoming = bookings.filter(b => b.status !== 'done' && b.status !== 'cancelled')
  const done     = bookings.filter(b => b.status === 'done' || b.status === 'cancelled')
  const list     = tab === 'upcoming' ? upcoming : done

  async function updateStatus(id: string, status: string) {
    // V3: pakai API route (server-side RPC advance_install_booking_status)
    // Auto-cascade ke orders.status (single source of truth)
    const res = await fetch(`/api/install-bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const json = await res.json()
    if (!res.ok) {
      alert('⚠️ Gagal update status: ' + (json.error?.message ?? 'unknown error'))
      return
    }
    // Refresh data
    load()
  }

  function openRevision(booking: any) {
    setRevBooking(booking)
    setRevReason('')
    setRevPhotos([])
    setShowRevision(true)
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    setUploading(true)
    const newUrls: string[] = []
    for (const file of Array.from(files)) {
      const res = await uploadToLocal(file, 'evidence', { compress: true, maxSizeMB: 1 })
      newUrls.push(res.url)
    }
    setRevPhotos(prev => [...prev, ...newUrls])
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removePhoto(idx: number) {
    setRevPhotos(prev => prev.filter((_, i) => i !== idx))
  }

  async function submitRevision() {
    if (!revBooking || !revReason.trim()) {
      alert('Tambahkan alasan revisi minimal 1 kalimat.')
      return
    }
    await supabase.from('install_bookings').update({
      status: 'revision',
      revision_reason: revReason.trim(),
      revision_photos: revPhotos.length > 0 ? revPhotos : null,
    }).eq('id', revBooking.id)

    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('order_logs').insert({
      order_id: revBooking.order_id,
      action: 'install_revision',
      notes: `Installer melaporkan masalah: ${revReason.trim()}`,
      staff_id: user?.id ?? null,
    })

    setShowRevision(false)
    setRevBooking(null)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Jadwal Pemasangan</h1>
        <p className="page-subtitle">Daftar booking pemasangan yang di-assign ke kamu</p>
      </div>

      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem' }}>
        {(['upcoming', 'done'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? '#cc7030' : 'transparent'}`, cursor: 'pointer', fontWeight: tab === t ? '700' : '500', color: tab === t ? '#cc7030' : '#6b7280', fontSize: '0.9rem', marginBottom: '-2px' }}>
            {t === 'upcoming' ? `📅 Mendatang (${upcoming.length})` : `✅ Selesai (${done.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
      ) : list.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
          <Calendar size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
          <p>Tidak ada jadwal {tab === 'upcoming' ? 'mendatang' : 'selesai'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {list.map(b => {
            const cust    = b.order?.customer
            const sc      = STATUS_COLORS[b.status] ?? STATUS_COLORS.scheduled
            const dateStr = b.scheduled_date ? new Date(b.scheduled_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'
            return (
              <div key={b.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem' }}>
                {/* Revision banner */}
                {b.status === 'revision' && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <AlertTriangle size={16} style={{ color: '#dc2626', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.82rem', color: '#991b1b', marginBottom: '0.25rem' }}>Revisi Dibuat</div>
                      <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{b.revision_reason}</div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ ...sc, padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600' }}>
                        {b.status === 'scheduled' ? 'Terjadwal' : b.status === 'in_progress' ? 'Dikerjakan' : b.status === 'revision' ? '🔄 Revisi' : b.status === 'done' ? 'Selesai' : 'Dibatalkan'}
                      </span>
                      <span style={{ background: b.type === 'pasang' ? '#e0e7ff' : '#f0fdf4', color: b.type === 'pasang' ? '#3730a3' : '#166534', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600' }}>
                        {b.type === 'pasang' ? '📍 Pasang' : '📦 Kirim'}
                      </span>
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1f2937', marginBottom: '0.375rem' }}>{cust?.name ?? '—'}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem', color: '#6b7280' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Calendar size={13} /> {dateStr} {b.scheduled_time ? `— ${b.scheduled_time}` : ''}
                      </div>
                      {cust?.address && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <MapPin size={13} /> {cust.address}
                        </div>
                      )}
                      {cust?.phone && (
                        <a href={`https://wa.me/${cust.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.375rem', textDecoration: 'none' }}>
                          💬 WA: {cust.phone}
                        </a>
                      )}
                    </div>
                    {b.notes && <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: '#6b7280', background: '#f9fafb', borderRadius: '0.375rem', padding: '0.5rem 0.75rem' }}>📝 {b.notes}</div>}
                  </div>
                  {tab === 'upcoming' && b.status !== 'revision' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {b.status === 'scheduled' && (
                        <button onClick={() => updateStatus(b.id, 'in_progress')}
                          style={{ padding: '0.5rem 1rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Clock size={13} /> Mulai Pasang
                        </button>
                      )}
                      {b.status === 'in_progress' && (
                        <>
                          <button onClick={() => updateStatus(b.id, 'done')}
                            style={{ padding: '0.5rem 1rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <CheckCircle2 size={13} /> Selesai
                          </button>
                          <button onClick={() => openRevision(b)}
                            style={{ padding: '0.5rem 1rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <AlertTriangle size={13} /> Laporkan Masalah
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Revision modal */}
      {showRevision && revBooking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setShowRevision(false) }}>
          <div style={{ background: '#fff', borderRadius: '0.875rem', padding: '2rem', width: '100%', maxWidth: 520, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>🔄 Laporkan Masalah</h2>
                <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0.25rem 0 0' }}>{revBooking?.order?.customer?.name ?? '—'}</p>
              </div>
              <button onClick={() => setShowRevision(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
                  Alasan / Masalah *
                </label>
                <textarea
                  value={revReason}
                  onChange={e => setRevReason(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Kain tidak cocok ukuran, warna berbeda, blinds patah saat pengepakan..."
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
                  Foto Bukti (opsional)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {revPhotos.map((url, i) => (
                    <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                      <img src={url} style={{ width: 72, height: 72, borderRadius: '0.5rem', objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                      <button onClick={() => removePhoto(i)}
                        style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>
                        ✕
                      </button>
                    </div>
                  ))}
                  <button onClick={() => fileInputRef.current?.click()}
                    style={{ width: 72, height: 72, border: '2px dashed #d1d5db', borderRadius: '0.5rem', background: '#f9fafb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.7rem', textAlign: 'center', flexDirection: 'column', gap: '0.2rem' }}>
                    <Upload size={16} /> Tambah
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} />
                {uploading && <div style={{ fontSize: '0.78rem', color: '#92400e' }}>⌛ Mengupload foto...</div>}
              </div>

              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.8rem', color: '#991b1b' }}>
                ⚠️ Setelah提交, status booking改为 "Revisi" dan Gudang akan diperlukan memperbaiki sebelum jadwal baru dibuatkan.
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setShowRevision(false)}
                  style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: '#fff', cursor: 'pointer', fontWeight: '600' }}>
                  Batal
                </button>
                <button onClick={submitRevision}
                  style={{ flex: 1, padding: '0.75rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                  <AlertTriangle size={15} /> Laporkan Masalah
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
