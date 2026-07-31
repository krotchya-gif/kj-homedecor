'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

interface OpnameSession {
  id: string
  status: 'open' | 'submitted' | 'approved' | 'cancelled'
  created_by: string
  notes: string | null
  created_at: string
  approved_by: string | null
  approved_at: string | null
  staff?: { name: string }
}

interface OpnameItem {
  id: string
  session_id: string
  material_id: string
  system_qty: number
  counted_qty: number
  difference: number
  adjustment_reason: string | null
  material?: { name: string; unit: string; stock_gudang: number; stock_toko: number }
}

const PAGE_SIZE = 15

export default function GudangStockOpnamePage() {
  const [sessions, setSessions] = useState<OpnameSession[]>([])
  const [items, setItems] = useState<OpnameItem[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'sessions' | 'count' | 'approve'>('sessions')
  const [currentPage, setCurrentPage] = useState(1)

  // New session state
  const [creating, setCreating] = useState(false)
  const [newNotes, setNewNotes] = useState('')

  // Count phase state
  const [activeSession, setActiveSession] = useState<OpnameSession | null>(null)
  const [countItems, setCountItems] = useState<Record<string, number>>({})
  const [counting, setCounting] = useState(false)
  const [countDone, setCountDone] = useState(false)

  // Approve phase state
  const [approveSession, setApproveSession] = useState<OpnameSession | null>(null)
  const [approveItems, setApproveItems] = useState<OpnameItem[]>([])
  const [approveNote, setApproveNote] = useState('')
  const [approving, setApproving] = useState(false)

  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('stock_opname_sessions')
      .select('*, staff:users(name)')
      .order('created_at', { ascending: false })
    setSessions(data ?? [])
    const { data: mats } = await supabase
      .from('materials')
      .select('id, name, unit, stock_gudang, stock_toko')
      .order('name')
    setMaterials(mats ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])
  useEffect(() => {
    loadItems()
  }, [activeSession])

  async function loadItems() {
    if (!activeSession) return
    const { data } = await supabase
      .from('stock_opname_items')
      .select('*, material:materials(name, unit, stock_gudang, stock_toko)')
      .eq('session_id', activeSession.id)
    setItems(data ?? [])
    // Initialize count map
    const init: Record<string, number> = {}
    for (const item of data ?? []) {
      init[item.material_id] = item.counted_qty
    }
    setCountItems(init)
  }

  async function createSession(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const {
      data: { user }
    } = await supabase.auth.getUser()

    // Create session
    const { data: session } = await supabase
      .from('stock_opname_sessions')
      .insert({ created_by: user?.id ?? null, notes: newNotes || null, status: 'open' })
      .select()
      .single()

    if (session) {
      // Create items for all materials with current stock
      const itemRows = materials.map((m) => ({
        session_id: session.id,
        material_id: m.id,
        system_qty: m.stock_gudang,
        counted_qty: m.stock_gudang,
        difference: 0
      }))
      await supabase.from('stock_opname_items').insert(itemRows)
    }
    setCreating(false)
    setNewNotes('')
    load()
    setTab('sessions')
  }

  async function submitCount() {
    if (!activeSession) return
    setCounting(true)
    // Update each item with counted qty and diff
    for (const item of items) {
      const counted = countItems[item.material_id] ?? item.counted_qty
      const diff = counted - item.system_qty
      await supabase
        .from('stock_opname_items')
        .update({
          counted_qty: counted,
          difference: diff
        })
        .eq('id', item.id)
    }
    // Update session status to submitted
    await supabase.from('stock_opname_sessions').update({ status: 'submitted' }).eq('id', activeSession.id)
    setCounting(false)
    setCountDone(true)
  }

  async function approveSessionFinal(s: OpnameSession, approve: boolean) {
    if (!approve) {
      // Reject — back to open
      await supabase.from('stock_opname_sessions').update({ status: 'open' }).eq('id', s.id)
      load()
      setApproveSession(null)
      return
    }
    setApproving(true)
    const {
      data: { user }
    } = await supabase.auth.getUser()

    // Get all items for this session
    const { data: opItems } = await supabase
      .from('stock_opname_items')
      .select('*, material:materials(name)')
      .eq('session_id', s.id)

    // Apply adjustments to materials table
    for (const item of opItems ?? []) {
      if (item.difference === 0) continue
      const { data: mat } = await supabase.from('materials').select('stock_gudang').eq('id', item.material_id).single()
      if (mat) {
        const newStock = Math.max(0, (mat.stock_gudang ?? 0) + item.difference)
        await supabase.from('materials').update({ stock_gudang: newStock }).eq('id', item.material_id)
        await supabase.from('inventory_movements').insert({
          material_id: item.material_id,
          type: item.difference > 0 ? 'in' : 'out',
          qty: Math.abs(item.difference),
          reason: `Stock Opname ${item.difference > 0 ? 'Plus' : 'Minus'} — ${item.adjustment_reason || 'selisih fisik'} | session: ${s.id.slice(0, 8)}`,
          notes: approveNote || null,
          created_by: user?.id ?? null
        })
      }
    }

    await supabase
      .from('stock_opname_sessions')
      .update({
        status: 'approved',
        approved_by: user?.id ?? null,
        approved_at: new Date().toISOString()
      })
      .eq('id', s.id)

    setApproving(false)
    setApproveSession(null)
    setApproveNote('')
    load()
  }

  function getSessionsByStatus(status: string) {
    return sessions.filter((s) => s.status === status)
  }

  return (
    <div>
      <PageHeader title="Stock Opname" subtitle="Hitung fisik vs sistem — selisih jadi adjustment" />

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem' }}>
        {(
          [
            { key: 'sessions', label: '📋 Riwayat', count: sessions.filter((s) => s.status !== 'open').length },
            {
              key: 'count',
              label: '🔢 Hitung Fisik',
              count: getSessionsByStatus('open').length + getSessionsByStatus('submitted').length
            }
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === t.key ? '#cc7030' : 'transparent'}`,
              cursor: 'pointer',
              fontWeight: tab === t.key ? '700' : '500',
              color: tab === t.key ? '#cc7030' : '#6b7280',
              fontSize: '0.9rem',
              marginBottom: '-2px'
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span
                style={{
                  background: '#cc7030',
                  color: '#fff',
                  borderRadius: '999px',
                  fontSize: '0.65rem',
                  padding: '0.1rem 0.5rem',
                  fontWeight: '700',
                  marginLeft: '0.375rem'
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ========== SESSIONS LIST ========== */}
      {tab === 'sessions' && (
        <>
          {/* Create new session */}
          <form
            onSubmit={createSession}
            style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}
          >
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '0.25rem'
                }}
              >
                Catatan (opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Opname akhir Juni 2026..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
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
            <button
              type="submit"
              disabled={creating}
              style={{
                padding: '0.625rem 1.25rem',
                background: '#cc7030',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: creating ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Plus size={15} style={{ display: 'inline', marginRight: '0.25rem' }} />
              {creating ? 'Membuat...' : 'Mulai Opname'}
            </button>
          </form>

          {/* Stats */}
          <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
            {[
              { label: 'Open', val: getSessionsByStatus('open').length, color: '#f59e0b' },
              { label: 'Submitted', val: getSessionsByStatus('submitted').length, color: '#3b82f6' },
              { label: 'Approved', val: getSessionsByStatus('approved').length, color: '#22c55e' }
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-card-label">{s.label}</div>
                <div className="stat-card-value" style={{ color: s.color }}>
                  {s.val}
                </div>
              </div>
            ))}
          </div>

          <div className="data-table">
            {loading ? (
              <div style={{ padding: '1.5rem' }}>
                <TableSkeleton rows={5} cols={5} />
              </div>
            ) : sessions.length === 0 ? (
              <EmptyState icon="📋" title="Belum ada sesi" description="Mulai opname baru dengan tombol di atas." />
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Catatan</th>
                    <th>Status</th>
                    <th>Dibuat Oleh</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                        {new Date(s.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td
                        style={{
                          color: '#6b7280',
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {s.notes ?? '—'}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background:
                              s.status === 'open' ? '#fff7ed' : s.status === 'submitted' ? '#e0e7ff' : '#d1fae5',
                            color: s.status === 'open' ? '#92400e' : s.status === 'submitted' ? '#3730a3' : '#065f46'
                          }}
                        >
                          {s.status === 'open' ? '🟡 Open' : s.status === 'submitted' ? '🔵 Submitted' : '✅ Approved'}
                        </span>
                      </td>
                      <td style={{ color: '#6b7280' }}>{s.staff?.name ?? '—'}</td>
                      <td>
                        {s.status === 'open' && (
                          <button
                            onClick={() => {
                              setActiveSession(s)
                              setCountDone(false)
                              loadItems()
                              setTab('count')
                            }}
                            style={{
                              padding: '0.3rem 0.75rem',
                              background: '#fef3c7',
                              color: '#92400e',
                              border: 'none',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            🔢 Hitung
                          </button>
                        )}
                        {s.status === 'submitted' && (
                          <button
                            onClick={async () => {
                              const { data } = await supabase
                                .from('stock_opname_items')
                                .select('*, material:materials(name,unit,stock_gudang,stock_toko)')
                                .eq('session_id', s.id)
                              setApproveItems(data ?? [])
                              setApproveSession(s)
                              setTab('approve')
                            }}
                            style={{
                              padding: '0.3rem 0.75rem',
                              background: '#e0e7ff',
                              color: '#3730a3',
                              border: 'none',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            ✅ Review & Setuju
                          </button>
                        )}
                        {s.status === 'approved' && (
                          <button
                            onClick={async () => {
                              const { data } = await supabase
                                .from('stock_opname_items')
                                .select('*, material:materials(name,unit,stock_gudang,stock_toko)')
                                .eq('session_id', s.id)
                              setApproveItems(data ?? [])
                              setApproveSession(s)
                              setTab('approve')
                            }}
                            style={{
                              padding: '0.3rem 0.75rem',
                              background: '#d1fae5',
                              color: '#065f46',
                              border: 'none',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            👁 Lihat
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ========== COUNT PHASE ========== */}
      {tab === 'count' && activeSession && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <button
              onClick={() => {
                setTab('sessions')
                setActiveSession(null)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                background: '#fff',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              <ChevronLeft size={14} /> Kembali
            </button>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>
                Hitung Fisik — {new Date(activeSession.created_at).toLocaleDateString('id-ID')}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.2rem 0 0' }}>
                {activeSession.notes ?? 'Tanpa catatan'}
              </p>
            </div>
            {countDone && (
              <span
                style={{
                  marginLeft: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#d1fae5',
                  color: '#065f46',
                  padding: '0.4rem 0.875rem',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}
              >
                <CheckCircle2 size={15} /> Submitted
              </span>
            )}
          </div>

          <div
            style={{
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.82rem',
              color: '#92400e'
            }}
          >
            💡 Masukkan jumlah stok fisik yang sebenarnya. Selisih akan dihitung otomatis.
          </div>

          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Satuan</th>
                  <th>Sistem (Gudang)</th>
                  <th>Hitung Fisik</th>
                  <th>Selisih</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const diff = (countItems[item.material_id] ?? item.counted_qty) - item.system_qty
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: '500' }}>{item.material?.name ?? '—'}</td>
                      <td style={{ color: '#6b7280' }}>{item.material?.unit ?? '—'}</td>
                      <td style={{ color: '#6b7280' }}>{item.system_qty}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={countItems[item.material_id] ?? item.counted_qty}
                          onChange={(e) =>
                            setCountItems((prev) => ({ ...prev, [item.material_id]: Number(e.target.value) }))
                          }
                          style={{
                            width: 100,
                            padding: '0.375rem 0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            outline: 'none',
                            textAlign: 'center'
                          }}
                        />
                      </td>
                      <td>
                        <span
                          style={{ fontWeight: '700', color: diff > 0 ? '#16a34a' : diff < 0 ? '#ef4444' : '#6b7280' }}
                        >
                          {diff > 0 ? '+' : ''}
                          {diff}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            {!countDone && (
              <>
                <button
                  onClick={() => {
                    setActiveSession(null)
                    setTab('sessions')
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={submitCount}
                  disabled={counting}
                  style={{
                    flex: 2,
                    padding: '0.75rem',
                    background: '#cc7030',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: counting ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {counting ? 'Menyimpan...' : '✅ Submit Hitungan'}
                </button>
              </>
            )}
            {countDone && (
              <button
                onClick={() => {
                  setActiveSession(null)
                  setTab('sessions')
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#cc7030',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                🔙 Kembali ke Riwayat
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========== APPROVE / REVIEW ========== */}
      {tab === 'approve' && approveSession && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <button
              onClick={() => {
                setTab('sessions')
                setApproveSession(null)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                background: '#fff',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              <ChevronLeft size={14} /> Kembali
            </button>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>
                Review Opname — {new Date(approveSession.created_at).toLocaleDateString('id-ID')}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.2rem 0 0' }}>
                {approveSession.notes ?? 'Tanpa catatan'}
              </p>
            </div>
          </div>

          {/* Summary stats */}
          {(() => {
            const totalPlus = approveItems.filter((i) => i.difference > 0).length
            const totalMinus = approveItems.filter((i) => i.difference < 0).length
            const totalZero = approveItems.filter((i) => i.difference === 0).length
            return (
              <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
                <div className="stat-card">
                  <div className="stat-card-label">Plus (+)</div>
                  <div className="stat-card-value" style={{ color: '#16a34a' }}>
                    {totalPlus}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Minus (−)</div>
                  <div className="stat-card-value" style={{ color: '#ef4444' }}>
                    {totalMinus}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Sesuai (=)</div>
                  <div className="stat-card-value" style={{ color: '#6b7280' }}>
                    {totalZero}
                  </div>
                </div>
              </div>
            )
          })()}

          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Satuan</th>
                  <th>Sistem</th>
                  <th>Fisik</th>
                  <th>Selisih</th>
                </tr>
              </thead>
              <tbody>
                {approveItems.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '500' }}>{item.material?.name ?? '—'}</td>
                    <td style={{ color: '#6b7280' }}>{item.material?.unit ?? '—'}</td>
                    <td style={{ color: '#6b7280' }}>{item.system_qty}</td>
                    <td style={{ color: '#6b7280' }}>{item.counted_qty}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: '700',
                          color: item.difference > 0 ? '#16a34a' : item.difference < 0 ? '#ef4444' : '#6b7280'
                        }}
                      >
                        {item.difference > 0 ? '+' : ''}
                        {item.difference}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {approveSession.status !== 'approved' && (
            <div
              style={{
                marginTop: '1.25rem',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.75rem',
                padding: '1.25rem'
              }}
            >
              <h3 style={{ fontSize: '0.9rem', fontWeight: '700', margin: '0 0 0.75rem' }}>Approval</h3>
              <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0 0 1rem' }}>
                Dengan menyetujui, selisih (+/−) akan langsung di-adjust ke <strong>stock_gudang</strong> dan dicatat di
                inventory movements.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => {
                    approveSessionFinal(approveSession, false)
                    setTab('sessions')
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: '600',
                    color: '#ef4444'
                  }}
                >
                  ❌ Tolak / Koreksi Ulang
                </button>
                <button
                  onClick={() => approveSessionFinal(approveSession, true)}
                  disabled={approving}
                  style={{
                    flex: 2,
                    padding: '0.75rem',
                    background: '#22c55e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: approving ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {approving ? 'Menyimpan...' : '✅ Setuju & Apply Adjustment'}
                </button>
              </div>
            </div>
          )}
          {approveSession.status === 'approved' && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.875rem 1rem',
                background: '#d1fae5',
                border: '1px solid #22c55e',
                borderRadius: '0.5rem',
                color: '#065f46',
                fontWeight: '600',
                fontSize: '0.875rem',
                textAlign: 'center'
              }}
            >
              ✅ Sudah di-approve dan adjustment sudah applied
            </div>
          )}
        </div>
      )}
    </div>
  )
}
