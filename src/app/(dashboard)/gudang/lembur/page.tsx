'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Clock } from 'lucide-react'

export default function GudangLemburPage() {
  const { toast } = useToast()
  const [records, setRecords] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    staff_id: '',
    date: new Date().toISOString().slice(0, 10),
    jam: '',
    keterangan: ''
  })
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const [recRes, staffRes] = await Promise.all([
      supabase.from('lembur_records').select('*, staff:users(name)').order('date', { ascending: false }),
      supabase.from('users').select('id,name,role').order('name')
    ])
    setRecords(recRes.data ?? [])
    setStaff(staffRes.data ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    // CREATE optimistic: id sementara dulu, diganti id asli dari server
    const tempId = crypto.randomUUID()
    const tempItem = {
      id: tempId,
      staff_id: form.staff_id || null,
      date: form.date,
      jam: Number(form.jam),
      keterangan: form.keterangan || null
    }
    setRecords((curr) => [tempItem, ...curr])
    const { data, error } = await supabase
      .from('lembur_records')
      .insert({
        staff_id: form.staff_id || null,
        date: form.date,
        jam: Number(form.jam),
        keterangan: form.keterangan || null
      })
      .select('id')
      .single()
    if (error) {
      setRecords((curr) => curr.filter((r) => r.id !== tempId))
      setSaving(false)
      toast('error', 'Gagal simpan lembur: ' + error.message)
      return
    }
    if (data?.id) {
      setRecords((curr) => curr.map((r) => (r.id === tempId ? { ...r, id: data.id } : r)))
    }
    setSaving(false)
    setShowForm(false)
    setForm({ staff_id: '', date: new Date().toISOString().slice(0, 10), jam: '', keterangan: '' })
    toast('success', 'Lembur berhasil ditambahkan')
  }

  // Group by month for summary
  const totalJam = records.reduce((s, r) => s + (r.jam ?? 0), 0)

  return (
    <div>
      <PageHeader title="Lembur" subtitle="Catat jam lembur staff per hari" />

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="stat-card" style={{ flex: '0 0 auto', minWidth: 180 }}>
          <div className="stat-card-label">Total Jam Lembur</div>
          <div className="stat-card-value">{totalJam} jam</div>
          <div className="stat-card-sub">Semua waktu</div>
        </div>
        <div className="stat-card" style={{ flex: '0 0 auto', minWidth: 180 }}>
          <div className="stat-card-label">Bulan Ini</div>
          <div className="stat-card-value">
            {records
              .filter((r) => r.date?.slice(0, 7) === new Date().toISOString().slice(0, 7))
              .reduce((s, r) => s + (r.jam ?? 0), 0)}{' '}
            jam
          </div>
          <div className="stat-card-sub">
            {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button
          onClick={() => setShowForm(true)}
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
          <Plus size={16} /> Input Lembur
        </button>
      </div>

            {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : records.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={records} keyOf={(r) => r.id} renderCard={(r) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Tanggal</span>
                  <span className="mobile-card-value">{r.date}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Jam</span>
                  <span className="mobile-card-value">{r.jam}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Keterangan</span>
                  <span className="mobile-card-value">{r.keterangan}</span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : records.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <Clock size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada catatan lembur</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Nama Staff</th>
                <th>Jam</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--neutral-600)', fontSize: '0.85rem' }}>
                    {new Date(r.date).toLocaleDateString('id-ID', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td style={{ fontWeight: '500' }}>{r.staff?.name ?? '—'}</td>
                  <td>
                    <span style={{ fontWeight: '700', color: '#cc7030' }}>{r.jam} jam</span>
                  </td>
                  <td style={{ color: 'var(--neutral-600)' }}>{r.keterangan ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} maxWidth={420} padding="2rem" zIndex={200}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Input Lembur</h2>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              Staff *
            </label>
            <select
              required
              value={form.staff_id}
              onChange={(e) => setForm((f) => ({ ...f, staff_id: e.target.value }))}
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
              <option value="">— Pilih Staff —</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
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
                Tanggal
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
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
                Jam Lembur *
              </label>
              <input
                required
                type="number"
                min="0.5"
                step="0.5"
                max="12"
                placeholder="0"
                value={form.jam}
                onChange={(e) => setForm((f) => ({ ...f, jam: e.target.value }))}
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
              Keterangan
            </label>
            <input
              type="text"
              placeholder="Alasan lembur..."
              value={form.keterangan}
              onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
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
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
