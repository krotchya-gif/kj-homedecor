'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import {
  CheckCircle2,
  Layers,
  ExternalLink,
  UserPlus,
  X,
  Package,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { MotionStagger } from '@/components/ui/Motion'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  waiting: { bg: '#fef2f2', text: '#991b1b' },
  in_progress: { bg: '#fef3c7', text: '#92400e' },
  done: { bg: '#d1fae5', text: '#065f46' }
}

interface UserType {
  id: string
  name: string
  role: string
}
interface JobMaterial {
  material_id: string
  material_name: string
  unit: string
  qty_needed: number
  stock_gudang: number
}

export default function GudangProductionPage() {
  const { toast } = useToast()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [penjahits, setPenjahits] = useState<UserType[]>([])
  const [assignJob, setAssignJob] = useState<any | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [jobMaterials, setJobMaterials] = useState<Record<string, JobMaterial[]>>({})
  const [warningJob, setWarningJob] = useState<any | null>(null)
  const [warningMats, setWarningMats] = useState<JobMaterial[]>([])
  const supabase = createClient()

  async function load() {
    setLoading(true)
    // Load production_jobs dengan order info lengkap (status, order_number, customer)
    // agar Gudang bisa lihat konteks pipeline + assign penjahit.
    const [{ data }, { data: penjahitData }] = await Promise.all([
      supabase
        .from('production_jobs')
        .select('*, order:orders(id, status, order_number, customer:customers(name)), penjahit:users(name)')
        .order('created_at', { ascending: false }),
      supabase.from('users').select('id, name, role').eq('role', 'penjahit')
    ])
    setJobs((data ?? []) as any[]) // ← CRITICAL FIX: setJobs() dipanggil agar UI render data
    setPenjahits((penjahitData ?? []) as UserType[])
    setLoading(false)

    // Pre-load BOM materials for all jobs that are waiting/in_progress
    const activeJobs = (data ?? []).filter((j: any) => j.status === 'waiting' || j.status === 'in_progress')
    const materialsMap: Record<string, JobMaterial[]> = {}
    for (const job of activeJobs) {
      materialsMap[job.id] = await loadJobMaterials(job.order_id)
    }
    setJobMaterials(materialsMap)
  }

  async function loadJobMaterials(orderId: string): Promise<JobMaterial[]> {
    const { data: orderItems } = await supabase.from('order_items').select('product_id, qty').eq('order_id', orderId)

    const materials: JobMaterial[] = []
    for (const item of orderItems ?? []) {
      if (!item.product_id) continue
      const { data: bomItems } = await supabase
        .from('bom')
        .select('material_id, qty_per_unit, material:materials(name, unit, stock_gudang)')
        .eq('product_id', item.product_id)

      for (const bom of bomItems ?? []) {
        const mat = (bom as any).material
        materials.push({
          material_id: bom.material_id,
          material_name: mat?.name ?? 'Unknown',
          unit: mat?.unit ?? 'unit',
          qty_needed: Number(bom.qty_per_unit) * Number(item.qty),
          stock_gudang: mat?.stock_gudang ?? 0
        })
      }
    }
    return materials
  }

  useEffect(() => {
    load()
    // Realtime: auto-refresh saat ada job baru atau status berubah
    const channel = supabase
      .channel('production_jobs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_jobs' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function updateJobStatus(jobId: string, status: string) {
    const {
      data: { user }
    } = await supabase.auth.getUser()
    const job = jobs.find((j) => j.id === jobId)

    // V3: Panggil API server-side untuk material consumption (atomic)
    // Saat job.status transitions ke 'done', panggil /api/orders/[id]/consume-materials
    // yang internally call RPC consume_materials_for_production.
    // - Decrement stock_gudang (with GREATEST(0) guard)
    // - Insert order_material_consumption (per-order traceability)
    // - Insert inventory_movements (audit trail with FK order_id, production_job_id)
    if (status === 'done' && job?.order_id && job.status !== 'done') {
      try {
        const consumeRes = await fetch(`/api/orders/${job.order_id}/consume-materials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ production_job_id: jobId })
        })
        const consumeJson = await consumeRes.json()
        if (!consumeRes.ok) {
          toast('error', '⚠️ Gagal consume materials: ' + (consumeJson.error?.message ?? 'unknown error'))
          return // Jangan continue kalau material gagal
        }
        console.log('Material consumption:', consumeJson.data)
      } catch (e) {
        toast('error', '⚠️ Gagal consume materials: ' + (e as Error).message)
        return
      }
    }

    // CRITICAL: error handling + ALERT kalau update gagal
    const { error: statusErr } = await supabase
      .from('production_jobs')
      .update({
        status,
        ...(status === 'in_progress' ? { started_at: new Date().toISOString() } : {}),
        ...(status === 'done' ? { completed_at: new Date().toISOString() } : {})
      })
      .eq('id', jobId)
    if (statusErr) {
      toast('error', '⚠️ Gagal update status job: ' + statusErr.message + '\n\nCek RLS policy atau koneksi database.')
    }

    const { error: logErr } = await supabase.from('order_logs').insert({
      order_id: job?.order_id,
      action: status === 'in_progress' ? 'production_started' : 'production_done',
      notes: status === 'in_progress' ? `Produksi dimulai oleh Gudang` : `Produksi selesai — siap QC`,
      staff_id: user?.id ?? null
    })
    if (logErr) { console.error('Gagal catat log produksi:', logErr) }
    load()
  }

  async function handleAssignPenjahit(penjahitId: string) {
    if (!assignJob) return
    setAssigning(true)
    const {
      data: { user }
    } = await supabase.auth.getUser()
    // CRITICAL: error handling + ALERT kalau update gagal
    const { data: updated, error: updateErr } = await supabase
      .from('production_jobs')
      .update({ penjahit_id: penjahitId })
      .eq('id', assignJob.id)
      .select('id, penjahit_id, status')
      .single()
    if (updateErr) {
      toast('error', '⚠️ Gagal assign penjahit: ' + updateErr.message + '\n\nCek RLS policy atau koneksi database.')
      setAssigning(false)
      return
    }
    if (!updated?.penjahit_id) {
      toast('success', '⚠️ Update berhasil tapi penjahit_id tidak ter-set. Refresh halaman dan coba lagi.')
      setAssigning(false)
      return
    }
    const selectedPenjahit = penjahits.find((p: UserType) => p.id === penjahitId)
    const { error: logErr } = await supabase.from('order_logs').insert({
      order_id: assignJob.order_id,
      action: 'penjahit_assigned',
      notes: `Job diserahkan ke penjahit: ${selectedPenjahit?.name ?? penjahitId} (penjahit_id: ${updated.penjahit_id.slice(0, 8)})`,
      staff_id: user?.id ?? null
    })
    if (logErr) { console.error('Gagal catat log assign:', logErr) }
    setAssigning(false)
    setAssignJob(null)
    load()
  }

  const filtered = filter ? jobs.filter((j) => j.status === filter) : jobs

  return (
    <div>
      <PageHeader
        title="Proses Pesanan"
        subtitle="Queue produksi dari penjahit — tracking status jahit per order. Order dari Admin (status: production) akan muncul di sini untuk di-assign penjahit."
      />

      <MotionStagger className="stat-grid" style={{ marginBottom: '1.25rem' }}>
        {[
          { label: 'Menunggu', val: jobs.filter((j) => j.status === 'waiting').length, color: '#ef4444' },
          { label: 'Dikerjakan', val: jobs.filter((j) => j.status === 'in_progress').length, color: '#f59e0b' },
          { label: 'Selesai', val: jobs.filter((j) => j.status === 'done').length, color: '#22c55e' }
        ].map((s, i) => (
          <StatCard key={s.label} label={s.label} value={s.val} accent={s.color} delay={i * 0.05} />
        ))}
      </MotionStagger>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {['', 'waiting', 'in_progress', 'done'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              border: 'none',
              background: filter === s ? '#cc7030' : 'var(--neutral-100)',
              color: filter === s ? '#fff' : 'var(--neutral-700)'
            }}
          >
            {s === '' ? 'Semua' : s === 'waiting' ? 'Menunggu' : s === 'in_progress' ? 'Dikerjakan' : 'Selesai'}
          </button>
        ))}
      </div>

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <Layers size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada job produksi</p>
          </div>
        ) : (
          <>
            {filtered.map((job) => {
              const sc = STATUS_COLORS[job.status]
              const mats = jobMaterials[job.id] ?? []
              const isExpanded = expandedJob === job.id
              const hasInsufficient = mats.some((m) => m.stock_gudang < m.qty_needed)
              return (
                <div key={job.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {/* Main row */}
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.78rem',
                            color: 'var(--neutral-600)',
                            padding: '0.75rem 0.5rem',
                            width: 100
                          }}
                        >
                          <Link
                            href={`/admin/orders/${job.order?.id}`}
                            style={{
                              color: '#cc7030',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            {job.order?.id?.slice(0, 8)} <ExternalLink size={10} />
                          </Link>
                        </td>
                        <td style={{ fontWeight: '500', padding: '0.75rem 0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span>{job.order?.customer?.name ?? '—'}</span>
                            {(job.revision_round ?? 0) > 0 && (
                              <span
                                style={{
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '999px',
                                  fontSize: '0.65rem',
                                  fontWeight: '700'
                                }}
                                title={job.revision_reason ?? ''}
                              >
                                🔄 Revisi #{job.revision_round}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ color: 'var(--neutral-600)', padding: '0.75rem 0.5rem' }}>{job.penjahit?.name ?? '—'}</td>
                        <td style={{ padding: '0.75rem 0.25rem' }}>{Number(job.meter_gorden ?? 0).toFixed(1)}m</td>
                        <td style={{ padding: '0.75rem 0.25rem' }}>{Number(job.meter_vitras ?? 0).toFixed(1)}m</td>
                        <td style={{ padding: '0.75rem 0.25rem' }}>{Number(job.meter_roman ?? 0).toFixed(1)}m</td>
                        <td style={{ padding: '0.75rem 0.25rem' }}>{Number(job.meter_kupu_kupu ?? 0).toFixed(1)}m</td>
                        <td style={{ padding: '0.75rem 0.25rem' }}>
                          <span
                            style={{
                              ...sc,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}
                          >
                            {job.status === 'waiting'
                              ? 'Menunggu'
                              : job.status === 'in_progress'
                                ? 'Dikerjakan'
                                : 'Selesai'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.25rem', whiteSpace: 'nowrap' }}>
                          {(job.status === 'waiting' || job.status === 'in_progress') && mats.length > 0 && (
                            <button
                              onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.2rem 0.6rem',
                                background: hasInsufficient ? '#fef2f2' : '#f0fdf4',
                                color: hasInsufficient ? '#dc2626' : '#16a34a',
                                border: 'none',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                marginRight: '0.375rem'
                              }}
                            >
                              {hasInsufficient && <AlertTriangle size={10} />}
                              <Package size={11} /> Material
                              {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </button>
                          )}
                          <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                            {job.status === 'waiting' && !job.penjahit_id && (
                              <button
                                onClick={() => setAssignJob(job)}
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  background: '#e0e7ff',
                                  color: '#3730a3',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                <UserPlus size={10} /> Penjahit
                              </button>
                            )}
                            {job.status === 'waiting' && job.penjahit_id && (
                              <button
                                onClick={() => {
                                  const mats = jobMaterials[job.id] ?? []
                                  const insufficient = mats.some((m) => m.stock_gudang < m.qty_needed)
                                  if (insufficient) {
                                    setWarningJob(job)
                                    setWarningMats(mats.filter((m: JobMaterial) => m.stock_gudang < m.qty_needed))
                                  } else {
                                    updateJobStatus(job.id, 'in_progress')
                                  }
                                }}
                                style={{
                                  padding: '0.2rem 0.625rem',
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                Mulai
                              </button>
                            )}
                            {job.status === 'in_progress' && (
                              <button
                                onClick={() => updateJobStatus(job.id, 'done')}
                                style={{
                                  padding: '0.2rem 0.625rem',
                                  background: '#d1fae5',
                                  color: '#065f46',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                <CheckCircle2 size={10} /> Selesai
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Expanded BOM panel */}
                  {isExpanded && mats.length > 0 && (
                    <div style={{ padding: '0 1rem 1rem 1rem' }}>
                      <div
                        style={{
                          background: '#fffbeb',
                          border: '1px solid #f59e0b',
                          borderRadius: '0.5rem',
                          padding: '0.875rem',
                          marginBottom: '0.5rem'
                        }}
                      >
                        <div
                          style={{ fontSize: '0.78rem', fontWeight: '700', color: '#92400e', marginBottom: '0.5rem' }}
                        >
                          📋 Material yang Dibutuhkan
                        </div>
                        <table style={{ width: '100%', fontSize: '0.8rem' }}>
                          <thead>
                            <tr style={{ color: 'var(--neutral-400)', fontWeight: '600' }}>
                              <td>Material</td>
                              <td style={{ textAlign: 'center' }}>Dibutuhkan</td>
                              <td style={{ textAlign: 'center' }}>Stok Gudang</td>
                              <td style={{ textAlign: 'center' }}>Status</td>
                            </tr>
                          </thead>
                          <tbody>
                            {mats.map((m, idx) => {
                              const insufficient = m.stock_gudang < m.qty_needed
                              return (
                                <tr key={idx} style={{ borderTop: '1px solid #fde68a' }}>
                                  <td style={{ padding: '0.35rem 0', fontWeight: '500' }}>{m.material_name}</td>
                                  <td style={{ textAlign: 'center', fontWeight: '600' }}>
                                    {m.qty_needed} {m.unit}
                                  </td>
                                  <td
                                    style={{
                                      textAlign: 'center',
                                      color: insufficient ? '#dc2626' : 'var(--neutral-700)',
                                      fontWeight: '600'
                                    }}
                                  >
                                    {m.stock_gudang}
                                  </td>
                                  <td>
                                    {insufficient ? (
                                      <span style={{ color: '#dc2626', fontWeight: '700', fontSize: '0.75rem' }}>
                                        ⚠️ Kurang {m.qty_needed - m.stock_gudang} {m.unit}
                                      </span>
                                    ) : (
                                      <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '0.75rem' }}>
                                        ✅ Cukup
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                        {hasInsufficient && (
                          <div
                            style={{
                              marginTop: '0.5rem',
                              padding: '0.5rem',
                              background: '#fef2f2',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              color: '#991b1b',
                              fontWeight: '600'
                            }}
                          >
                            ⚠️ Stok kurang! Material belum mencukupi. Hubungi Owner untuk restock sebelum produksi
                            dimulai.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>

      <Modal open={!!assignJob} onClose={() => setAssignJob(null)} maxWidth={420} padding="2rem" zIndex={200}>
        {assignJob && (
          <>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}
            >
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Serahkan ke Penjahit</h2>
              <button
                onClick={() => setAssignJob(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--neutral-600)', marginBottom: '1.25rem' }}>
              Job: <strong>{assignJob.order?.customer?.name ?? assignJob.order_id?.slice(0, 8)}</strong>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {penjahits.length === 0 ? (
                <p style={{ color: 'var(--neutral-400)', fontSize: '0.875rem' }}>Tidak ada penjahit tersedia</p>
              ) : (
                penjahits.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleAssignPenjahit(p.id)}
                    disabled={assigning}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.875rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      background: 'var(--surface)',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#16a34a20',
                        color: '#16a34a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        flexShrink: 0
                      }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--neutral-800)' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>Penjahit</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={!!warningJob}
        onClose={() => {
          setWarningJob(null)
          setWarningMats([])
        }}
        maxWidth={480}
        padding="2rem"
        zIndex={201}
      >
        {warningJob && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <AlertTriangle size={28} style={{ color: '#dc2626', flexShrink: 0 }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#dc2626' }}>
                Material Tidak Mencukupi!
              </h2>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--neutral-600)', marginBottom: '1.25rem' }}>
              Job <strong>{warningJob.order?.customer?.name ?? warningJob.order_id?.slice(0, 8)}</strong> — material BOM
              belum tersedia. production akan dimulai tapi material kurang:
            </p>
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '0.5rem',
                padding: '0.875rem',
                marginBottom: '1.25rem',
                maxHeight: 180,
                overflowY: 'auto'
              }}
            >
              {warningMats.map((m: JobMaterial, idx: number) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.3rem 0',
                    borderBottom: idx < warningMats.length - 1 ? '1px solid #fecaca' : 'none',
                    fontSize: '0.82rem'
                  }}
                >
                  <span style={{ fontWeight: '500', color: '#991b1b' }}>{m.material_name}</span>
                  <span style={{ color: '#991b1b' }}>
                    Stok: {m.stock_gudang} / Butuh: {m.qty_needed} {m.unit}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setWarningJob(null)
                  setWarningMats([])
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setWarningJob(null)
                  setWarningMats([])
                  updateJobStatus(warningJob.id, 'in_progress')
                }}
                style={{
                  flex: 2,
                  padding: '0.75rem',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.875rem'
                }}
              >
                ⚠️ Tetap Mulai (Material Akan Dimakan Habis)
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
