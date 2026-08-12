'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CheckCircle2, Loader2, ClipboardList } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'


interface SessionItem {
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
  approved_at?: string
  items?: SessionItem[]
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Dibuka',
  submitted: 'Diajukan',
  approved: 'Disetujui',
  cancelled: 'Dibatalkan'
}

export default function FinanceStockOpnamePage() {
  const { toast } = useToast()
  const supabase = createClient()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)

  async function fetchAll() {
    const { data } = await supabase
      .from('stock_opname_sessions')
      .select(
        'id, status, notes, created_at, approved_at, items:stock_opname_items(material_id, system_qty, counted_qty, difference, material:materials(name, unit))'
      )
      .order('created_at', { ascending: false })
    setSessions((data ?? []) as Session[])
  }

  useEffect(() => {
    ;(async () => {
      await fetchAll()
      setLoading(false)
    })()
  }, [])

  async function approve(id: string) {
    if (!confirm('Setujui sesi ini & terapkan selisih ke stok gudang?')) return
    setApproving(id)
    const { data, error } = await supabase.rpc('approve_stock_opname', { p_session_id: id })
    setApproving(null)
    if (error) {
      toast('error', 'Gagal approve: ' + error.message)
      return
    }
    toast('success', (data as { message?: string } | null)?.message ?? 'Sesi disetujui')
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
      <PageHeader title="Stock Opname — Verifikasi" subtitle="Setujui hasil stock opname gudang — selisih diterapkan ke stok" />

      {sessions.length === 0 ? (
        <p style={{ color: 'var(--neutral-400)', padding: '2rem' }}>Belum ada sesi stock opname.</p>
      ) : (
        <div className="desktop-only">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Status</th>
                <th>Catatan</th>
                <th style={{ textAlign: 'right' }}>Material</th>
                <th style={{ textAlign: 'right' }}>Total Selisih</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const totalDiff = (s.items ?? []).reduce((a, i) => a + Number(i.difference || 0), 0)
                return (
                  <tr key={s.id}>
                    <td style={{ fontSize: '0.8rem' }}>{new Date(s.created_at).toLocaleString('id-ID')}</td>
                    <td>
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
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>{s.notes || '-'}</td>
                    <td style={{ textAlign: 'right' }}>{(s.items ?? []).length}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: totalDiff === 0 ? '#16a34a' : '#cc7030' }}>
                      {totalDiff.toLocaleString('id-ID')} unit
                    </td>
                    <td>
                      {s.status === 'submitted' ? (
                <button className="btn-primary" style={{ fontSize: '0.8rem' }} disabled={approving === s.id} onClick={() => approve(s.id)} title="Terapkan selisih stok ke gudang (permanen)">
                  {approving === s.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={14} />} Approve
                </button>
                      ) : (
                        <span style={{ color: 'var(--neutral-400)', fontSize: '0.8rem' }}>-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mobile-only">
        <MobileCards
          items={sessions}
          keyOf={(s) => s.id}
          renderCard={(s) => (
            <div className="mobile-card">
              <div className="mobile-card-row">
                <span className="mobile-card-label">Tanggal</span>
                <span className="mobile-card-value">{new Date(s.created_at).toLocaleString('id-ID')}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Status</span>
                <span className="mobile-card-value">{STATUS_LABELS[s.status] ?? s.status}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Total Selisih</span>
                <span className="mobile-card-value">{(s.items ?? []).reduce((a, i) => a + Number(i.difference || 0), 0).toLocaleString('id-ID')} unit</span>
              </div>
              {s.status === 'submitted' && (
                <button className="btn-primary" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }} disabled={approving === s.id} onClick={() => approve(s.id)} title="Terapkan selisih stok ke gudang (permanen)">
                  Approve
                </button>
              )}
            </div>
          )}
        />
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--neutral-500)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <ClipboardList size={14} />
        Approve menerapkan selisih (hitung fisik − stok sistem) ke stok gudang & mencatat mutasi adjustment.
      </div>
    </div>
  )
}
