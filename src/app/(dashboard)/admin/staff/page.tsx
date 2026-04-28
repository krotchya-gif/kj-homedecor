'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { UserPlus, Key, Loader2, AlertTriangle, Search, Users, Pencil, Trash2, X, CheckCircle } from 'lucide-react'

const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Catalog, pesanan, pelanggan', color: '#dc2626' },
  { value: 'gudang', label: 'Gudang', desc: 'Produksi, stok, steam', color: '#2563eb' },
  { value: 'penjahit', label: 'Penjahit', desc: 'Job queue, meter tracking', color: '#16a34a' },
  { value: 'finance', label: 'Finance', desc: 'BOM, HPP, pembayaran', color: '#f59e0b' },
  { value: 'installer', label: 'Installer', desc: 'Jadwal pemasangan', color: '#8b5cf6' },
  { value: 'owner', label: 'Owner', desc: 'Overview semua modul', color: '#0d9488' },
]

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#d1fae5', text: '#065f46' },
  inactive: { bg: '#fef2f2', text: '#991b1b' },
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#dc2626',
  gudang: '#2563eb',
  penjahit: '#16a34a',
  finance: '#f59e0b',
  installer: '#8b5cf6',
  owner: '#0d9488',
}

interface StaffUser {
  id: string
  name: string
  email: string
  role: string
  status: string
  created_at: string
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', role: '', status: '' })

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'gudang' })

  const supabase = createClient()

  useEffect(() => { fetchStaff() }, [])

  async function fetchStaff() {
    setLoading(true)
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    setStaff((data as StaffUser[]) ?? [])
    setLoading(false)
  }

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/create-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Gagal membuat akun')
      setSuccess(`Akun ${form.name} (${form.role}) berhasil dibuat!`)
      setForm({ name: '', email: '', password: '', role: 'gudang' })
      fetchStaff()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus staff "${name}"?`)) return
    setDeleting(id)
    await supabase.from('users').delete().eq('id', id)
    setDeleting(null)
    fetchStaff()
    setSuccess(`Staff "${name}" berhasil dihapus`)
  }

  function startEdit(s: StaffUser) {
    setEditingId(s.id)
    setEditForm({ name: s.name, role: s.role, status: s.status })
  }

  async function saveEdit() {
    if (!editingId) return
    setSaving(true)
    await supabase.from('users').update({
      name: editForm.name,
      role: editForm.role,
      status: editForm.status,
    }).eq('id', editingId)
    setSaving(false)
    setEditingId(null)
    fetchStaff()
    setSuccess('Data staff berhasil diperbarui')
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Manajemen Staff</h1>
        <p className="page-subtitle">Kelola akun staff — hanya Admin yang dapat melakukan ini</p>
      </div>

      {/* Two column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1.5rem', alignItems: 'start' }}>

        {/* LEFT — Staff List */}
        <div>
          {/* Header + Search */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.2rem' }}>Daftar Staff</h2>
                <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{staff.length} staff terdaftar</p>
              </div>
              <div style={{ position: 'relative', width: 280 }}>
                <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder="Cari nama, email, atau role..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem 1rem 0.625rem 2.25rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Alerts */}
          {success && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.625rem', padding: '0.875rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#166534' }}>
              <CheckCircle size={16} /> {success}
            </div>
          )}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.625rem', padding: '0.875rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#991b1b' }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {/* Table */}
          <div className="data-table">
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.5rem' }} />
                <p>Memuat...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
                <Users size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
                <p style={{ fontWeight: '600', color: '#6b7280' }}>Belum ada staff</p>
                <p style={{ fontSize: '0.8rem' }}>Buat staff baru dengan form di sebelah kanan</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Terdaftar</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id}>
                      <td>
                        {editingId === s.id ? (
                          /* Edit row */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                              style={{ padding: '0.4rem 0.625rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.8rem', width: '100%' }}
                            />
                            <select
                              value={editForm.role}
                              onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                              style={{ padding: '0.4rem 0.625rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.8rem', width: '100%' }}
                            >
                              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                            <select
                              value={editForm.status}
                              onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                              style={{ padding: '0.4rem 0.625rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.8rem', width: '100%' }}
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                            <div style={{ display: 'flex', gap: '0.375rem' }}>
                              <button onClick={saveEdit} disabled={saving} style={{ flex: 1, padding: '0.375rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>Simpan</button>
                              <button onClick={() => setEditingId(null)} style={{ flex: 1, padding: '0.375rem', background: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>Batal</button>
                            </div>
                          </div>
                        ) : (
                          /* Normal row */
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${ROLE_COLORS[s.role] ?? '#6b7280'}15`, color: ROLE_COLORS[s.role] ?? '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem', flexShrink: 0 }}>
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.875rem' }}>{s.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{s.email}</div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.625rem', background: `${ROLE_COLORS[s.role] ?? '#6b7280'}15`, color: ROLE_COLORS[s.role] ?? '#6b7280', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize' }}>
                          {s.role}
                        </span>
                      </td>
                      <td>
                        <span style={{ padding: '0.25rem 0.625rem', background: STATUS_COLORS[s.status]?.bg ?? '#f3f4f6', color: STATUS_COLORS[s.status]?.text ?? '#6b7280', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize' }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ color: '#9ca3af', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(s.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => startEdit(s)}
                            style={{ padding: '0.375rem 0.625rem', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.name)}
                            disabled={deleting === s.id}
                            style={{ padding: '0.375rem 0.625rem', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '600', cursor: deleting === s.id ? 'not-allowed' : 'pointer', opacity: deleting === s.id ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Trash2 size={12} /> {deleting === s.id ? '...' : 'Hapus'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT — Create Form */}
        <div style={{ position: 'sticky', top: '1.5rem' }}>
          <div className="form-section">
            <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={16} /> Buat Akun Staff Baru
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', fontSize: '0.82rem', color: '#92400e' }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Staff tidak bisa mendaftar sendiri. Hanya Admin yang bisa membuat akun.</span>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Nama Lengkap *</label>
                <input
                  required
                  type="text"
                  placeholder="cth: Budi Santoso"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Email *</label>
                <input
                  required
                  type="email"
                  placeholder="cth: budi@kjhomedecor.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Key size={13} /> Password *</span>
                </label>
                <input
                  required
                  type="password"
                  placeholder="Min. 8 karakter"
                  minLength={8}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Role *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {ROLES.map((r) => (
                    <label
                      key={r.value}
                      style={{
                        cursor: 'pointer',
                        border: `2px solid ${form.role === r.value ? r.color : '#e5e7eb'}`,
                        borderRadius: '0.5rem',
                        padding: '0.625rem 0.875rem',
                        background: form.role === r.value ? `${r.color}10` : '#fff',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r.value}
                        checked={form.role === r.value}
                        onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                        style={{ display: 'none' }}
                      />
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: form.role === r.value ? r.color : '#374151' }}>{r.label}</div>
                      <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '0.1rem' }}>{r.desc}</div>
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '0.875rem',
                  background: saving ? '#e5e7eb' : '#cc7030',
                  color: saving ? '#9ca3af' : '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                  transition: 'background 0.15s',
                }}
              >
                {saving ? (
                  <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Membuat akun...</>
                ) : (
                  <><UserPlus size={16} /> Buat Akun</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .staff-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
