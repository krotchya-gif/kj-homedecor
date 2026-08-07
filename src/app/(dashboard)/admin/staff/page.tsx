'use client'
import { PageHeader } from '@/components/ui/PageHeader'
import MobileCards from '@/components/ui/MobileCards'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  UserPlus,
  Key,
  Loader2,
  AlertTriangle,
  Search,
  Users,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import Pagination from '@/components/ui/Pagination'
import ActionMenu from '@/components/ui/ActionMenu'

const [PAGE_SIZE, setPageSize] = useState(20)

const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Catalog, pesanan, pelanggan', color: '#dc2626' },
  { value: 'gudang', label: 'Gudang', desc: 'Produksi, stok, steam', color: '#2563eb' },
  { value: 'penjahit', label: 'Penjahit', desc: 'Job queue, meter tracking', color: '#16a34a' },
  { value: 'finance', label: 'Finance', desc: 'BOM, HPP, pembayaran', color: '#f59e0b' },
  { value: 'installer', label: 'Installer', desc: 'Jadwal pemasangan', color: '#8b5cf6' },
  { value: 'surveyor', label: 'Surveyor', desc: 'Catat hasil survey di lokasi', color: '#cc7030' },
  { value: 'owner', label: 'Owner', desc: 'Overview semua modul', color: '#0d9488' }
]

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#d1fae5', text: '#065f46' },
  inactive: { bg: '#fef2f2', text: '#991b1b' }
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#dc2626',
  gudang: '#2563eb',
  penjahit: '#16a34a',
  finance: '#f59e0b',
  installer: '#8b5cf6',
  surveyor: '#cc7030',
  owner: '#0d9488'
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
  const { toast } = useToast()
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', role: '', status: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'gudang' })

  const supabase = createClient()

  useEffect(() => {
    fetchStaff()
  }, [])

  async function fetchStaff() {
    setLoading(true)
    const from = (currentPage - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const [dataResult, countResult] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to),
      supabase.from('users').select('id', { count: 'exact', head: true })
    ])
    setStaff((dataResult.data as StaffUser[]) ?? [])
    setTotalCount(countResult.count ?? 0)
    setLoading(false)
  }
  useEffect(() => {
    fetchStaff()
  }, [currentPage])

  const filtered = staff.filter(
    (s) =>
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
        body: JSON.stringify(form)
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Gagal membuat akun')
      // CREATE optimistic: item masuk UI dulu, id asli di-replace dari response
      const tempId = crypto.randomUUID()
      const tempItem = { id: tempId, name: form.name, email: form.email, role: form.role, status: 'active', created_at: new Date().toISOString() } as StaffUser
      setStaff((curr) => [tempItem, ...curr])
      if (json.user?.id) {
        setStaff((curr) => curr.map((s) => (s.id === tempId ? { ...s, id: json.user.id } : s)))
      } else {
        // fallback: kalau response tanpa id, refetch
        fetchStaff()
      }
      setSuccess(`Akun ${form.name} (${form.role}) berhasil dibuat!`)
      toast('success', `Akun ${form.name} (${form.role}) berhasil dibuat!`)
      setForm({ name: '', email: '', password: '', role: 'gudang' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
      toast('error', err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus staff "${name}"?`)) return
    setDeleting(id)
    // Optimistic update: hapus dari UI dulu, rollback kalau server error
    const prev = staff
    setStaff((curr) => curr.filter((s) => s.id !== id))
    const { error } = await supabase.from('users').delete().eq('id', id)

    if (error) { setStaff(prev); setDeleting(null); toast('error', 'Gagal hapus: ' + error.message); return }
    setDeleting(null)
    setSuccess(`Staff "${name}" berhasil dihapus`)
    toast('success', `Staff "${name}" berhasil dihapus`)
  }

  function startEdit(s: StaffUser) {
    setEditingId(s.id)
    setEditForm({ name: s.name, role: s.role, status: s.status })
  }

  async function saveEdit() {
    if (!editingId) return
    setSaving(true)
    // UPDATE optimistic
    const prev = staff
    setStaff((curr) =>
      curr.map((s) => (s.id === editingId ? { ...s, name: editForm.name, role: editForm.role, status: editForm.status } : s))
    )
    const { error } = await supabase
      .from('users')
      .update({
        name: editForm.name,
        role: editForm.role,
        status: editForm.status
      })
      .eq('id', editingId)
    if (error) { setStaff(prev); setSaving(false); toast('error', 'Gagal simpan staff: ' + error.message); return }
    setSaving(false)
    setEditingId(null)
    setSuccess('Data staff berhasil diperbarui')
    toast('success', 'Data staff berhasil diperbarui')
  }

  return (
    <div>
      <PageHeader title="Manajemen Staff" subtitle="Kelola akun staff — hanya Admin yang dapat melakukan ini" />

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
        {/* LEFT — Staff List */}
        <div>
          {/* Header + Search */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid #e5e7eb',
              borderRadius: '0.875rem',
              padding: '1.25rem',
              marginBottom: '1rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap'
              }}
            >
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--neutral-800)', marginBottom: '0.2rem' }}>
                  Daftar Staff
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--neutral-400)' }}>{staff.length} staff terdaftar</p>
              </div>
              <div style={{ position: 'relative', width: 280 }} className="staff-search-wrapper">
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
                  placeholder="Cari nama, email, atau role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 1rem 0.625rem 2.25rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Alerts */}
          {success && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '0.625rem',
                padding: '0.875rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                color: '#166534'
              }}
            >
              <CheckCircle size={16} /> {success}
            </div>
          )}
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.625rem',
                padding: '0.875rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                color: '#991b1b'
              }}
            >
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {/* Table */}
          {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem' }}>
            <TableSkeleton rows={4} cols={3} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="👤" title="Belum ada staff" description="Buat akun staff baru dengan form di atas." />
        ) : (
          <MobileCards
            items={filtered}
            keyOf={(s) => s.id}
            renderCard={(s) => (
              <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Staff</span>
                  <span className="mobile-card-value">{s.name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Email</span>
                  <span className="mobile-card-value" style={{ fontWeight: '400', fontSize: '0.75rem' }}>{s.email}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Role</span>
                  <span className="mobile-card-value">
                    <span style={{ padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', background: `${ROLE_COLORS[s.role] ?? 'var(--neutral-600)'}15`, color: ROLE_COLORS[s.role] ?? 'var(--neutral-600)' }}>
                      {s.role}
                    </span>
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Status</span>
                  <span className="mobile-card-value" style={{ fontWeight: '400' }}>
                    {s.status === 'active' ? '✅ Aktif' : '⛔ Nonaktif'}
                  </span>
                </div>
                <div className="mobile-card-actions">
                  <button onClick={() => startEdit(s)} style={{ background: 'var(--neutral-100)', color: 'var(--neutral-700)', border: 'none', cursor: 'pointer' }}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button onClick={() => handleDelete(s.id, s.name)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={13} /> {deleting === s.id ? '...' : 'Hapus'}
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </div>
      <div className="data-table desktop-only overflow-x-auto">
            {loading ? (
              <div style={{ padding: '1.5rem' }}>
                <TableSkeleton rows={8} cols={6} />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon="👤"
                title="Belum ada staff"
                description="Buat staff baru dengan form di sebelah kanan."
              />
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
                              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                              style={{
                                padding: '0.4rem 0.625rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                fontSize: '0.8rem',
                                width: '100%'
                              }}
                            />
                            <select
                              value={editForm.role}
                              onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                              style={{
                                padding: '0.4rem 0.625rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                fontSize: '0.8rem',
                                width: '100%'
                              }}
                            >
                              {ROLES.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                            <select
                              value={editForm.status}
                              onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                              style={{
                                padding: '0.4rem 0.625rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                fontSize: '0.8rem',
                                width: '100%'
                              }}
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                            <div style={{ display: 'flex', gap: '0.375rem' }}>
                              <button
                                onClick={saveEdit}
                                disabled={saving}
                                style={{
                                  flex: 1,
                                  padding: '0.375rem',
                                  background: '#16a34a',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                Simpan
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                style={{
                                  flex: 1,
                                  padding: '0.375rem',
                                  background: 'var(--neutral-100)',
                                  color: 'var(--neutral-600)',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Normal row */
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: `${ROLE_COLORS[s.role] ?? 'var(--neutral-600)'}15`,
                                color: ROLE_COLORS[s.role] ?? 'var(--neutral-600)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '700',
                                fontSize: '0.8rem',
                                flexShrink: 0
                              }}
                            >
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', color: 'var(--neutral-800)', fontSize: '0.875rem' }}>{s.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>{s.email}</div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.25rem 0.625rem',
                            background: `${ROLE_COLORS[s.role] ?? 'var(--neutral-600)'}15`,
                            color: ROLE_COLORS[s.role] ?? 'var(--neutral-600)',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            textTransform: 'capitalize'
                          }}
                        >
                          {s.role}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '0.25rem 0.625rem',
                            background: STATUS_COLORS[s.status]?.bg ?? 'var(--neutral-100)',
                            color: STATUS_COLORS[s.status]?.text ?? 'var(--neutral-600)',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            textTransform: 'capitalize'
                          }}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--neutral-400)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(s.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td>
                        <ActionMenu
                          items={[
                            { label: 'Edit', icon: <Pencil size={14} />, onClick: () => startEdit(s) },
                            { label: 'Hapus', icon: <Trash2 size={14} />, onClick: () => handleDelete(s.id, s.name), danger: true }
                          ]}
                        />
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
        </div>

        {/* RIGHT — Create Form */}
        <div style={{ position: 'sticky', top: '1.5rem' }} className="staff-form-section">
          <div className="form-section">
            <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={16} /> Buat Akun Staff Baru
            </div>

            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                marginBottom: '1.25rem',
                display: 'flex',
                gap: '0.5rem',
                fontSize: '0.82rem',
                color: '#92400e'
              }}
            >
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Staff tidak bisa mendaftar sendiri. Hanya Admin yang bisa membuat akun.</span>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  Nama Lengkap *
                </label>
                <input
                  required
                  type="text"
                  placeholder="cth: Budi Santoso"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
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
                  Email *
                </label>
                <input
                  required
                  type="email"
                  placeholder="cth: budi@kjhomedecor.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
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
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Key size={13} /> Password *
                  </span>
                </label>
                <input
                  required
                  type="password"
                  placeholder="Min. 8 karakter"
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
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
                    marginBottom: '0.5rem'
                  }}
                >
                  Role *
                </label>
                <div
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}
                  className="role-selector-grid"
                >
                  {ROLES.map((r) => (
                    <label
                      key={r.value}
                      style={{
                        cursor: 'pointer',
                        border: `2px solid ${form.role === r.value ? r.color : 'var(--neutral-200)'}`,
                        borderRadius: '0.5rem',
                        padding: '0.625rem 0.875rem',
                        background: form.role === r.value ? `${r.color}10` : '#fff',
                        transition: 'all 0.15s'
                      }}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r.value}
                        checked={form.role === r.value}
                        onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                        style={{ display: 'none' }}
                      />
                      <div
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: form.role === r.value ? r.color : 'var(--neutral-700)'
                        }}
                      >
                        {r.label}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--neutral-600)', marginTop: '0.1rem' }}>{r.desc}</div>
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '0.875rem',
                  background: saving ? 'var(--neutral-200)' : '#cc7030',
                  color: saving ? 'var(--neutral-400)' : '#fff',
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
                  transition: 'background 0.15s'
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Membuat akun...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} /> Buat Akun
                  </>
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
