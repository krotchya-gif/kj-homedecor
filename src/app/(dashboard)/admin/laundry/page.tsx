'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, WashingMachine, CheckCircle2, Clock, User } from 'lucide-react'
import type { LaundryOrder, LaundryRate, User as UserType } from '@/types'

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e', label: 'Pending' },
  in_progress: { bg: '#dbeafe', text: '#1e40af', label: 'Diproses' },
  done: { bg: '#d1fae5', text: '#065f46', label: 'Selesai' },
}

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function AdminLaundryPage() {
  const [orders, setOrders] = useState<LaundryOrder[]>([])
  const [laundryStaff, setLaundryStaff] = useState<UserType[]>([])
  const [rate, setRate] = useState<LaundryRate | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showRateModal, setShowRateModal] = useState(false)
  const [rateForm, setRateForm] = useState({ rate_per_kg: '' })
  const [rateSaving, setRateSaving] = useState(false)

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    kg: '',
    meter: '',
    description: '',
    assigned_to: '',
  })

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const [ordersRes, staffRes, rateRes] = await Promise.all([
      supabase.from('laundry_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('*').eq('role', 'laundry').eq('status', 'active'),
      supabase.from('laundry_rates').select('*').eq('is_active', true).single(),
    ])
    setOrders((ordersRes.data as LaundryOrder[]) ?? [])
    setLaundryStaff((staffRes.data as UserType[]) ?? [])
    setRate(rateRes.data as LaundryRate | null)
    if (rateRes.data) setRateForm({ rate_per_kg: String((rateRes.data as LaundryRate).rate_per_kg) })
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('laundry_orders').insert({
      customer_name: form.customer_name,
      customer_phone: form.customer_phone || null,
      kg: Number(form.kg) || 0,
      meter: Number(form.meter) || 0,
      description: form.description || null,
      status: 'pending',
      assigned_to: form.assigned_to || null,
      created_by: user?.id ?? null,
    })
    setSaving(false)
    setShowForm(false)
    setForm({ customer_name: '', customer_phone: '', kg: '', meter: '', description: '', assigned_to: '' })
    fetchData()
  }

  async function handleUpdateStatus(id: string, status: 'pending' | 'in_progress' | 'done') {
    const updates: Record<string, unknown> = { status }
    if (status === 'done') updates.completed_at = new Date().toISOString()
    await supabase.from('laundry_orders').update(updates).eq('id', id)
    fetchData()
  }

  async function handleUpdateRate(e: React.FormEvent) {
    e.preventDefault()
    setRateSaving(true)
    if (rate) {
      await supabase.from('laundry_rates').update({
        rate_per_kg: Number(rateForm.rate_per_kg) || 0,
        updated_at: new Date().toISOString(),
      }).eq('id', rate.id)
    }
    setRateSaving(false)
    setShowRateModal(false)
    fetchData()
  }

  const filtered = orders.filter((o) => {
    const matchSearch = !search || o.customer_name.toLowerCase().includes(search.toLowerCase()) || (o.customer_phone || '').includes(search)
    const matchStatus = !filterStatus || o.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Laundry Orders</h1>
          <p className="page-subtitle">Kelola pesanan laundry dari customer</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowRateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer' }}>
            Rate: {rate ? fmt(rate.rate_per_kg) + '/kg' : '...'}
          </button>
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}>
            <Plus size={16} /> Input Laundry
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="Cari nama atau telepon..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.625rem 0.75rem 0.625rem 2.25rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }}>
          <option value="">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">Diproses</option>
          <option value="done">Selesai</option>
        </select>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {(['pending', 'in_progress', 'done'] as const).map(s => {
          const count = orders.filter(o => o.status === s).length
          const c = STATUS_COLORS[s]
          return (
            <div key={s} style={{ background: c.bg, borderRadius: '0.75rem', padding: '1rem 1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: c.text }}>{count}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: c.text, marginTop: '0.25rem' }}>{c.label}</div>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div className="data-table">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <WashingMachine size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada pesanan laundry</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Customer</th>
                <th>Kontak</th>
                <th>Kg</th>
                <th>Description</th>
                <th>Staff</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const sc = STATUS_COLORS[o.status]
                const staff = laundryStaff.find(s => s.id === o.assigned_to)
                return (
                  <tr key={o.id}>
                    <td style={{ color: '#6b7280', fontSize: '0.8rem' }}>{new Date(o.received_at).toLocaleDateString('id-ID')}</td>
                    <td style={{ fontWeight: '500' }}>{o.customer_name}</td>
                    <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>{o.customer_phone || '—'}</td>
                    <td><span style={{ fontWeight: '600' }}>{o.kg}</span> kg</td>
                    <td style={{ color: '#6b7280', fontSize: '0.85rem', maxWidth: 200 }}>{o.description || '—'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{staff ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <User size={12} /> {staff.name}
                      </span>
                    ) : '—'}</td>
                    <td><span style={{ background: sc.bg, color: sc.text, padding: '0.25rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '600' }}>{sc.label}</span></td>
                    <td>
                      {o.status === 'pending' && (
                        <button onClick={() => handleUpdateStatus(o.id, 'in_progress')} style={{ padding: '0.375rem 0.75rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>
                          Proses
                        </button>
                      )}
                      {o.status === 'in_progress' && (
                        <button onClick={() => handleUpdateStatus(o.id, 'done')} style={{ padding: '0.375rem 0.75rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>
                          Selesai
                        </button>
                      )}
                      {o.status === 'done' && (
                        <CheckCircle2 size={18} color="#16a34a" />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Input Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ background: '#fff', borderRadius: '0.875rem', padding: '2rem', width: '100%', maxWidth: 480, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>🧺 Input Pesanan Laundry</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Nama Customer *</label>
                <input required type="text" placeholder="Nama customer" value={form.customer_name}
                  onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Telepon</label>
                <input type="text" placeholder="08xxxxxxxxxx" value={form.customer_phone}
                  onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Berat (kg) *</label>
                  <input required type="number" step="0.01" min="0" placeholder="0" value={form.kg}
                    onChange={e => setForm(f => ({ ...f, kg: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Meter (m)</label>
                  <input type="number" step="0.01" min="0" placeholder="0" value={form.meter}
                    onChange={e => setForm(f => ({ ...f, meter: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Assign Staff</label>
                <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }}>
                  <option value="">Belum assign</option>
                  {laundryStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Keterangan</label>
                <input type="text" placeholder="Gorden 15kg, Vitras 5kg, dll..." value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
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

      {/* Rate Update Modal */}
      {showRateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setShowRateModal(false) }}>
          <div style={{ background: '#fff', borderRadius: '0.875rem', padding: '2rem', width: '100%', maxWidth: 400, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Update Rate Laundry</h2>
            <form onSubmit={handleUpdateRate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Rate per kg (IDR)</label>
                <input required type="number" step="100" min="0" placeholder="5000" value={rateForm.rate_per_kg}
                  onChange={e => setRateForm(f => ({ ...f, rate_per_kg: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowRateModal(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: '#fff', cursor: 'pointer', fontWeight: '600' }}>Batal</button>
                <button type="submit" disabled={rateSaving} style={{ flex: 1, padding: '0.75rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: rateSaving ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                  {rateSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}