'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ClipboardList, Plus, Loader2, CheckCircle2, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'


interface Material {
  id: string
  name: string
  unit: string
  stock_gudang: number
}

interface SessionItem {
  material_id: string
  material?: { name?: string; unit?: string } | null
  system_qty: number
  counted_qty: number
  difference: number
}

interface Session {
  id: string
  status: string
  notes?: string
  created_at: string
  items?: SessionItem[]
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Dibuka',
  submitted: 'Diajukan',
  approved: 'Disetujui',
  cancelled: 'Dibatalkan'
}

export default function StockOpnamePage() {
  const { toast } = useToast()
  const supabase = createClient()
  const [materials, setMaterials] = useState<Material[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form sesi baru
  const [sessionOpen, setSessionOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [counts, setCounts] = useState<Record<string, string>>({})
  // Detail sesi yang dibuka (menampilkan rincian per material)
  const [detailOpen, setDetailOpen] = useState<Set<string>>(new Set())

  function toggleDetail(id: string) {
    setDetailOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function fetchAll() {
    const [matRes, sesRes] = await Promise.all([
      supabase.from('materials').select('id, name, unit, stock_gudang').order('name'),
      supabase
        .from('stock_opname_sessions')
        .select(
          'id, status, notes, created_at, items:stock_opname_items(material_id, system_qty, counted_qty, difference, material:materials(name, unit))'
        )
        .order('created_at', { ascending: false })
    ])
    setMaterials((matRes.data ?? []) as Material[])
    setSessions((sesRes.data ?? []) as Session[])
  }

  useEffect(() => {
    ;(async () => {
      await fetchAll()
      setLoading(false)
    })()
  }, [])

  function toggleMaterial(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function createSession(e: React.FormEvent) {
    e.preventDefault()
    if (selectedIds.size === 0) {
      toast('error', 'Pilih minimal 1 material.')
      return
    }
    setSaving(true)
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      toast('error', 'Sesi login berakhir.')
      return
    }

    const { data: session, error: sErr } = await supabase
      .from('stock_opname_sessions')
      .insert({ status: 'open', notes: notes || null, created_by: user.id })
      .select('id')
      .single()
    if (sErr || !session) {
      setSaving(false)
      toast('error', 'Gagal buat sesi: ' + (sErr?.message ?? 'no id'))
      return
    }

    const rows = materials
      .filter((m) => selectedIds.has(m.id))
      .map((m) => {
        const counted = Number(counts[m.id])
        const system = Number(m.stock_gudang || 0)
        return {
          session_id: session.id,
          material_id: m.id,
          system_qty: system,
          counted_qty: isNaN(counted) ? 0 : counted,
          difference: (isNaN(counted) ? 0 : counted) - system
        }
      })
    const { error: iErr } = await supabase.from('stock_opname_items').insert(rows)
    if (iErr) {
      await supabase.from('stock_opname_sessions').delete().eq('id', session.id)
      setSaving(false)
      toast('error', 'Gagal simpan item: ' + iErr.message)
      return
    }

    setSessionOpen(false)
    setNotes('')
    setSelectedIds(new Set())
    setCounts({})
    setSaving(false)
    toast('success', `Sesi stock opname dibuat (${rows.length} material).`)
    fetchAll()
  }

  async function submitSession(id: string) {
    if (!confirm('Kirim sesi stock opname ini untuk diverifikasi?')) return
    const { error } = await supabase.from('stock_opname_sessions').update({ status: 'submitted' }).eq('id', id)
    if (error) {
      toast('error', 'Gagal kirim sesi: ' + error.message)
      return
    }
    toast('success', 'Sesi dikirim untuk verifikasi.')
    fetchAll()
  }

  async function cancelSession(id: string) {
    if (!confirm('Batalkan sesi stock opname ini?')) return
    const { error } = await supabase.from('stock_opname_sessions').update({ status: 'cancelled' }).eq('id', id)
    if (error) {
      toast('error', 'Gagal batalkan sesi: ' + error.message)
      return
    }
    fetchAll()
  }

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: 400 }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#cc7030' }} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Stock Opname"
        subtitle="Cocokkan stok sistem vs stok fisik — hasilnya diverifikasi Finance"
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
        <button className="btn-primary" onClick={() => setSessionOpen((v) => !v)}>
          <Plus size={16} /> {sessionOpen ? 'Tutup Form' : 'Buat Sesi Stock Opname'}
        </button>
      </div>

      {sessionOpen && (
        <form
          onSubmit={createSession}
          style={{
            background: 'var(--surface)',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}
        >
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: '700' }}>Pilih Material & Input Hitungan</h3>
          <input
            type="text"
            placeholder="Catatan sesi (opsional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}
          />
          <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
            <table className="data-table" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>Pilih</th>
                  <th>Material</th>
                  <th style={{ textAlign: 'right' }}>Stok Sistem</th>
                  <th style={{ textAlign: 'right' }}>Hitung Fisik</th>
                  <th style={{ textAlign: 'right' }}>Selisih</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => {
                  const counted = Number(counts[m.id])
                  const diff = isNaN(counted) ? 0 : counted - Number(m.stock_gudang || 0)
                  return (
                    <tr key={m.id}>
                      <td>
                        <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleMaterial(m.id)} />
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {m.name} <span style={{ color: 'var(--neutral-400)' }}>({m.unit})</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>{Number(m.stock_gudang || 0)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <input
                          type="number"
                          min={0}
                          disabled={!selectedIds.has(m.id)}
                          value={counts[m.id] ?? ''}
                          onChange={(e) => setCounts((c) => ({ ...c, [m.id]: e.target.value }))}
                          style={{ width: 100, padding: '0.35rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                        />
                      </td>
                      <td style={{ textAlign: 'right', color: diff === 0 ? 'var(--neutral-400)' : '#cc7030', fontWeight: 600 }}>
                        {selectedIds.has(m.id) && !isNaN(counted) ? (diff > 0 ? `+${diff}` : String(diff)) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <button className="btn-primary" type="submit" disabled={saving} style={{ marginTop: '1rem' }}>
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />} Buat Sesi ({selectedIds.size} material)
          </button>
        </form>
      )}

      {/* Daftar sesi */}
      <div className="desktop-only">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
          {sessions.length === 0 ? (
            <p style={{ color: 'var(--neutral-400)', padding: '2rem' }}>Belum ada sesi stock opname.</p>
          ) : (
            sessions.map((s) => {
              const totalDiff = (s.items ?? []).reduce((acc, i) => acc + Number(i.difference || 0), 0)
              return (
                <div key={s.id} style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>
                      {new Date(s.created_at).toLocaleString('id-ID')}
                    </div>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: 999,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: s.status === 'approved' ? '#f0fdf4' : s.status === 'submitted' ? '#fef9c3' : s.status === 'open' ? '#eff6ff' : '#fef2f2',
                        color: s.status === 'approved' ? '#166534' : s.status === 'submitted' ? '#854d0e' : s.status === 'open' ? '#1e40af' : '#b91c1c'
                      }}
                    >
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </div>
                  {s.notes && <div style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', marginBottom: '0.5rem' }}>{s.notes}</div>}
                  <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginBottom: '0.5rem' }}>
                    {(s.items ?? []).length} material · Total selisih:{' '}
                    <span style={{ fontWeight: 700, color: totalDiff === 0 ? '#16a34a' : '#cc7030' }}>
                      {totalDiff.toLocaleString('id-ID')} unit
                    </span>
                  </div>
                  <button
                    onClick={() => toggleDetail(s.id)}
                    style={{ fontSize: '0.75rem', background: 'none', border: 'none', color: '#cc7030', fontWeight: 600, cursor: 'pointer', padding: '0 0 0.5rem' }}
                  >
                    {detailOpen.has(s.id) ? '▲ Tutup Detail' : '▼ Lihat Detail'}
                  </button>
                  {detailOpen.has(s.id) && (
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '0.5rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--neutral-50)' }}>
                            <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left' }}>Material</th>
                            <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>Sistem</th>
                            <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>Hitung</th>
                            <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>Selisih</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(s.items ?? []).map((i, idx) => (
                            <tr key={`${s.id}-${idx}`} style={{ borderTop: '1px solid var(--neutral-100)' }}>
                              <td style={{ padding: '0.4rem 0.6rem' }}>
                                {i.material?.name ?? '—'} <span style={{ color: 'var(--neutral-400)' }}>({i.material?.unit ?? ''})</span>
                              </td>
                              <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>{Number(i.system_qty ?? 0)}</td>
                              <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>{Number(i.counted_qty ?? 0)}</td>
                              <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 600, color: Number(i.difference) === 0 ? 'var(--neutral-400)' : '#cc7030' }}>
                                {Number(i.difference) > 0 ? `+${i.difference}` : String(Number(i.difference ?? 0))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {s.status === 'open' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn-primary"
                        style={{ fontSize: '0.8rem' }}
                        onClick={() => submitSession(s.id)}
                        title="Kirim hasil hitung stok ke Finance untuk diverifikasi"
                      >
                        <CheckCircle2 size={14} /> Kirim
                      </button>
                      <button
                        style={{ fontSize: '0.8rem', background: 'none', border: '1px solid #d1d5db', borderRadius: '0.5rem', padding: '0.4rem 0.75rem', cursor: 'pointer' }}
                        onClick={() => cancelSession(s.id)}
                      >
                        <X size={14} /> Batalkan
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="mobile-only">
        <MobileCards
          items={sessions}
          keyOf={(s) => s.id}
          renderCard={(s) => (
            <div className="mobile-card">
              <div className="mobile-card-row">
                <span className="mobile-card-label">Dibuat</span>
                <span className="mobile-card-value">{new Date(s.created_at).toLocaleDateString('id-ID')}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Status</span>
                <span className="mobile-card-value">{STATUS_LABELS[s.status] ?? s.status}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Material</span>
                <span className="mobile-card-value">{(s.items ?? []).length}</span>
              </div>
              <button
                onClick={() => toggleDetail(s.id)}
                style={{ fontSize: '0.75rem', background: 'none', border: 'none', color: '#cc7030', fontWeight: 600, cursor: 'pointer', padding: '0.25rem 0', textAlign: 'left' }}
              >
                {detailOpen.has(s.id) ? '▲ Tutup Detail' : '▼ Lihat Detail'}
              </button>
              {detailOpen.has(s.id) && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden', margin: '0.25rem 0 0.5rem' }}>
                  {(s.items ?? []).map((i, idx) => (
                    <div key={`${s.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', borderTop: idx === 0 ? 'none' : '1px solid var(--neutral-100)', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--neutral-700)' }}>
                        {i.material?.name ?? '—'} <span style={{ color: 'var(--neutral-400)' }}>({i.material?.unit ?? ''})</span>
                      </span>
                      <span style={{ fontWeight: 600, color: Number(i.difference) === 0 ? 'var(--neutral-400)' : '#cc7030' }}>
                        {Number(i.system_qty ?? 0)} → {Number(i.counted_qty ?? 0)} ({Number(i.difference) > 0 ? `+${i.difference}` : String(Number(i.difference ?? 0))})
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {s.status === 'open' && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="btn-primary" style={{ fontSize: '0.8rem' }} onClick={() => submitSession(s.id)} title="Kirim hasil hitung stok ke Finance untuk diverifikasi">
                    Kirim
                  </button>
                  <button style={{ fontSize: '0.8rem', background: 'none', border: '1px solid #d1d5db', borderRadius: '0.5rem', padding: '0.4rem 0.75rem' }} onClick={() => cancelSession(s.id)}>
                    Batalkan
                  </button>
                </div>
              )}
            </div>
          )}
        />
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--neutral-500)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <ClipboardList size={14} />
        Sesi 'Diajukan' menunggu verifikasi Finance. Selisih stok baru diterapkan setelah disetujui.
      </div>
    </div>
  )
}
