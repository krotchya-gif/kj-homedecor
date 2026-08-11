'use client'
import { PageHeader } from '@/components/ui/PageHeader'
import MobileCards from '@/components/ui/MobileCards'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { WashingMachine, CheckCircle2, Clock, PlayCircle } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e', label: 'Menunggu' },
  in_progress: { bg: '#dbeafe', text: '#1e40af', label: 'Diproses' },
  done: { bg: '#d1fae5', text: '#065f46', label: 'Selesai' }
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

interface LaundryTask {
  id: string
  customer_name: string
  customer_phone?: string
  kg?: number
  meter?: number
  description?: string
  status: 'pending' | 'in_progress' | 'done'
  kg_actual?: number
  received_at: string
  completed_at?: string
  created_at: string
}

export default function LaundryDashboardPage() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<LaundryTask[]>([])
  const [loading, setLoading] = useState(true)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [reportTask, setReportTask] = useState<LaundryTask | null>(null)
  const [kgActual, setKgActual] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'active' | 'done'>('active')
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const {
      data: { user }
    } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('laundry_orders')
      .select('*')
      .eq('assigned_to', user?.id ?? '')
      .order('created_at', { ascending: false })
    setTasks((data ?? []) as LaundryTask[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const activeTasks = tasks.filter((t) => t.status !== 'done')
  const doneTasks = tasks.filter((t) => t.status === 'done')
  const shown = tab === 'active' ? activeTasks : doneTasks

  async function handleAccept(task: LaundryTask) {
    setAcceptingId(task.id)
    const { error } = await supabase
      .from('laundry_orders')
      .update({ status: 'in_progress' })
      .eq('id', task.id)
      .eq('status', 'pending')
    if (error) {
      setAcceptingId(null)
      toast('error', 'Gagal terima task: ' + error.message)
      return
    }
    setAcceptingId(null)
    setTasks((curr) => curr.map((t) => (t.id === task.id ? { ...t, status: 'in_progress' } : t)))
    toast('success', 'Task diterima — mulai dikerjakan')
  }

  async function handleReport(e: React.FormEvent) {
    e.preventDefault()
    if (!reportTask) return
    const kg = Number(kgActual)
    if (!kgActual || isNaN(kg) || kg <= 0) {
      toast('error', 'Berat aktual (kg) wajib diisi dan lebih dari 0.')
      return
    }
    setSaving(true)
    const {
      data: { user }
    } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('laundry_orders')
      .update({
        status: 'done',
        kg_actual: kg,
        reported_by: user?.id ?? null,
        reported_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .eq('id', reportTask.id)
      .eq('status', 'in_progress')
    if (error) {
      setSaving(false)
      toast('error', 'Gagal lapor selesai: ' + error.message)
      return
    }
    setSaving(false)
    setReportTask(null)
    setKgActual('')
    setTasks((curr) => curr.map((t) => (t.id === reportTask.id ? { ...t, status: 'done', kg_actual: kg } : t)))
    toast('success', 'Task selesai — berat ' + kg + ' kg dicatat untuk gaji Anda')
  }

  return (
    <div>
      <PageHeader title="Tugas Laundry" subtitle="Terima & laporkan penyelesaian task laundry" />

      <div
        style={{
          display: 'flex',
          gap: '0.375rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '0.75rem'
        }}
      >
        {[
          { id: 'active', label: `Aktif (${activeTasks.length})` },
          { id: 'done', label: `Selesai (${doneTasks.length})` }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as 'active' | 'done')}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: tab === t.id ? '#6366f1' : 'transparent',
              color: tab === t.id ? '#fff' : 'var(--neutral-600)',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.85rem'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : shown.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Tidak ada task</div>
        ) : (
          <MobileCards
            items={shown}
            keyOf={(t) => t.id}
            renderCard={(t) => (
              <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Customer</span>
                  <span className="mobile-card-value">{t.customer_name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Estimasi</span>
                  <span className="mobile-card-value">{t.kg ? `${t.kg} kg` : '—'}</span>
                </div>
                {t.status === 'done' && (
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Berat Aktual</span>
                    <span className="mobile-card-value">{t.kg_actual ? `${t.kg_actual} kg` : '—'}</span>
                  </div>
                )}
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Status</span>
                  <span className="mobile-card-value">{STATUS_COLORS[t.status]?.label}</span>
                </div>
                <div className="mobile-card-actions">
                  {t.status === 'pending' && (
                    <button
                      onClick={() => handleAccept(t)}
                      disabled={acceptingId === t.id}
                      style={{ background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' }}
                    >
                      <PlayCircle size={14} /> Terima Task
                    </button>
                  )}
                  {t.status === 'in_progress' && (
                    <button
                      onClick={() => {
                        setReportTask(t)
                        setKgActual(String(t.kg ?? ''))
                      }}
                      style={{ background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer' }}
                    >
                      <CheckCircle2 size={14} /> Lapor Selesai
                    </button>
                  )}
                </div>
              </div>
            )}
          />
        )}
      </div>

      <div className="data-table desktop-only">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : shown.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <WashingMachine size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Tidak ada task laundry</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Deskripsi</th>
                <th style={{ textAlign: 'right' }}>Estimasi (kg)</th>
                <th style={{ textAlign: 'right' }}>Berat Aktual</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: '500' }}>{t.customer_name}</td>
                  <td style={{ color: 'var(--neutral-600)' }}>{t.description ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>{t.kg ? `${t.kg} kg` : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>
                    {t.status === 'done' ? `${t.kg_actual ?? '—'} kg` : '—'}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: STATUS_COLORS[t.status]?.bg,
                        color: STATUS_COLORS[t.status]?.text
                      }}
                    >
                      {STATUS_COLORS[t.status]?.label}
                    </span>
                  </td>
                  <td>
                    {t.status === 'pending' && (
                      <button
                        onClick={() => handleAccept(t)}
                        disabled={acceptingId === t.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.3rem 0.75rem',
                          background: '#6366f1',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <PlayCircle size={13} /> Terima
                      </button>
                    )}
                    {t.status === 'in_progress' && (
                      <button
                        onClick={() => {
                          setReportTask(t)
                          setKgActual(String(t.kg ?? ''))
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.3rem 0.75rem',
                          background: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <CheckCircle2 size={13} /> Lapor Selesai
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal lapor selesai */}
      <Modal open={!!reportTask} onClose={() => !saving && setReportTask(null)} maxWidth={420} padding="1.5rem" zIndex={300}>
        <form onSubmit={handleReport}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem' }}>✅ Lapor Selesai</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', marginBottom: '1rem' }}>
            {reportTask?.customer_name} — Berat ini akan dijumlahkan sebagai dasar gaji Anda.
          </p>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.3rem' }}>
            Berat Aktual (kg) *
          </label>
          <input
            type="number"
            required
            min={0.1}
            step={0.1}
            value={kgActual}
            onChange={(e) => setKgActual(e.target.value)}
            placeholder="Contoh: 3.5"
            style={{
              width: '100%',
              padding: '0.625rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              marginBottom: '1rem',
              outline: 'none'
            }}
          />
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setReportTask(null)}
              disabled={saving}
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
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              {saving ? 'Menyimpan...' : 'Lapor Selesai'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
