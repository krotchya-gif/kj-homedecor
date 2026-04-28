'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Users, Shield, Loader2, Search } from 'lucide-react'

interface StaffUser {
  id: string
  name: string
  email: string
  role: string
  status: string
  created_at: string
  _count?: { order_logs?: number }
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  gudang: 'Gudang',
  penjahit: 'Penjahit',
  finance: 'Finance',
  installer: 'Installer',
  owner: 'Owner',
}

const STATUS_COLORS: Record<string, string> = {
  active: '#d1fae5',
  inactive: '#fee2e2',
}

export default function OwnerStaffPage() {
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const supabase = createClient()

  useEffect(() => { loadStaff() }, [])

  async function loadStaff() {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('*, order_logs(count)')
      .order('role')

    // @ts-ignore
    const sorted = (data ?? []).sort((a: StaffUser, b: StaffUser) => {
      const roleOrder = ['owner', 'admin', 'finance', 'gudang', 'penjahit', 'installer']
      return roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)
    })

    setStaff(sorted)
    setLoading(false)
  }

  const filtered = staff.filter(s =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.role?.toLowerCase().includes(search.toLowerCase())
  )

  // Stats
  const roleCounts: Record<string, number> = {}
  staff.forEach(s => { roleCounts[s.role] = (roleCounts[s.role] ?? 0) + 1 })

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Manajemen Staff</h1>
        <p className="page-subtitle">Semua akun staff dan peran mereka</p>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Staff</div>
          <div className="stat-card-value">{staff.length}</div>
          <div className="stat-card-sub">Akun aktif</div>
        </div>
        {Object.entries(roleCounts).map(([role, count]) => (
          <div key={role} className="stat-card">
            <div className="stat-card-label">{ROLE_LABELS[role] ?? role}</div>
            <div className="stat-card-value">{count}</div>
            <div className="stat-card-sub">Staff</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Cari nama, email, atau role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.625rem 1rem 0.625rem 2.25rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
          />
        </div>
      </div>

      {/* Staff Table */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#cc7030' }} />
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: '600' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: '#cc7030', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: '700', flexShrink: 0
                        }}>
                          {s.name?.charAt(0).toUpperCase()}
                        </div>
                        {s.name}
                      </div>
                    </td>
                    <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>{s.email}</td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: '600',
                        background: s.role === 'owner' ? '#f3e8ff' : s.role === 'admin' ? '#fff3e8' : '#e0e7ff',
                        color: s.role === 'owner' ? '#7c3aed' : s.role === 'admin' ? '#cc7030' : '#3730a3',
                      }}>
                        <Shield size={10} style={{ marginRight: 4 }} />
                        {ROLE_LABELS[s.role] ?? s.role}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: '600',
                        background: STATUS_COLORS[s.status] ?? '#f3f4f6',
                        color: s.status === 'active' ? '#065f46' : '#991b1b',
                      }}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <a
                        href={`/admin/staff`}
                        style={{ color: '#cc7030', fontSize: '0.78rem', fontWeight: '600', textDecoration: 'none' }}
                      >
                        Edit
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
