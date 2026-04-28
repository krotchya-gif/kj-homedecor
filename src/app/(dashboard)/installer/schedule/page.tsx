'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Calendar, MapPin, CheckCircle2, Clock } from 'lucide-react'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  scheduled:   { bg: '#dbeafe', text: '#1e40af' },
  in_progress: { bg: '#fef3c7', text: '#92400e' },
  done:        { bg: '#d1fae5', text: '#065f46' },
  cancelled:   { bg: '#fef2f2', text: '#991b1b' },
}

export default function InstallerSchedulePage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<'upcoming' | 'done'>('upcoming')
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
  useEffect(() => { load() }, [])

  const upcoming = bookings.filter(b => b.status !== 'done' && b.status !== 'cancelled')
  const done     = bookings.filter(b => b.status === 'done' || b.status === 'cancelled')
  const list     = tab === 'upcoming' ? upcoming : done

  async function updateStatus(id: string, status: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const booking = bookings.find(b => b.id === id)
    await supabase.from('install_bookings').update({
      status,
      ...(status === 'done' ? { actual_date: new Date().toISOString() } : {}),
    }).eq('id', id)

    // Log install action
    await supabase.from('order_logs').insert({
      order_id: booking?.order_id,
      action: status === 'in_progress' ? 'install_started' : 'install_done',
      notes: status === 'in_progress'
        ? `Instalasi dimulai oleh Installer`
        : `Instalasi selesai oleh Installer`,
      staff_id: user?.id ?? null,
    })
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                      <span style={{ ...sc, padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600' }}>
                        {b.status === 'scheduled' ? 'Terjadwal' : b.status === 'in_progress' ? 'Dikerjakan' : b.status === 'done' ? 'Selesai' : 'Dibatalkan'}
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
                  {tab === 'upcoming' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {b.status === 'scheduled' && (
                        <button onClick={() => updateStatus(b.id, 'in_progress')}
                          style={{ padding: '0.5rem 1rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Clock size={13} /> Mulai Pasang
                        </button>
                      )}
                      {b.status === 'in_progress' && (
                        <button onClick={() => updateStatus(b.id, 'done')}
                          style={{ padding: '0.5rem 1rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <CheckCircle2 size={13} /> Selesai
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
