'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Waves, CheckCircle2, X, AlertTriangle, Camera } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface SteamJob {
  id: string
  order_id: string
  production_job_id: string | null
  status: 'pending' | 'done' | 'revision'
  result: 'pass' | 'fail' | null
  fail_reason: string | null
  notes: string | null
  checked_by: string | null
  completed_at: string | null
  created_at: string
  order?: { id: string; customer?: { name: string }; created_at: string }
}

interface LaundryRecord {
  id: string
  customer_name: string
  kg: number
  meter: number
  description: string | null
  date: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(n)

export default function GudangSteamPage() {
  const [tab, setTab] = useState<'laundry' | 'steam'>('laundry')
  const supabase = createClient()

  // Laundry state
  const [laundryRecords, setLaundryRecords] = useState<LaundryRecord[]>([])
  const [laundryLoading, setLaundryLoading] = useState(true)
  const [showLaundryForm, setShowLaundryForm] = useState(false)
  const [laundrySaving, setLaundrySaving] = useState(false)
  const [laundryForm, setLaundryForm] = useState({
    customer_name: '',
    kg: '',
    meter: '',
    description: '',
    date: new Date().toISOString().slice(0, 10)
  })

  // Steam QC state
  const [steamJobs, setSteamJobs] = useState<SteamJob[]>([])
  const [steamLoading, setSteamLoading] = useState(true)
  const [showFailModal, setShowFailModal] = useState<SteamJob | null>(null)
  const [failReason, setFailReason] = useState('')
  const [failSaving, setFailSaving] = useState(false)
  const [showPassDialog, setShowPassDialog] = useState<SteamJob | null>(null)
  const [passSaving, setPassSaving] = useState(false)
  // V3: foto bukti WAJIB sebelum steam pass/fail (PHOTO_REQUIRED_STAGES include 'steam')
  const [steamPassPhoto, setSteamPassPhoto] = useState<string | null>(null)
  const [steamFailPhoto, setSteamFailPhoto] = useState<string | null>(null)
  const [uploadingSteamPhoto, setUploadingSteamPhoto] = useState(false)

  async function handleSteamPhotoUpload(e: React.ChangeEvent<HTMLInputElement>, target: 'pass' | 'fail') {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingSteamPhoto(true)
    try {
      const { uploadToLocal } = await import('@/lib/upload')
      const result = await uploadToLocal(file, 'order_progress', { compress: true, maxSizeMB: 1 })
      if (target === 'pass') setSteamPassPhoto(result.url)
      else setSteamFailPhoto(result.url)
    } catch (err) {
      console.error('Upload failed:', err)
      alert('⚠️ Gagal upload foto: ' + (err as Error).message)
    } finally {
      setUploadingSteamPhoto(false)
    }
  }

  async function loadLaundry() {
    setLaundryLoading(true)
    const { data } = await supabase.from('laundry_records').select('*').order('date', { ascending: false })
    setLaundryRecords((data as LaundryRecord[]) ?? [])
    setLaundryLoading(false)
  }

  async function loadSteam() {
    setSteamLoading(true)
    const { data } = await supabase
      .from('steam_jobs')
      .select('*, order:orders(id, customer:customers(name))')
      .order('created_at', { ascending: false })
    setSteamJobs((data as SteamJob[]) ?? [])
    setSteamLoading(false)
  }

  useEffect(() => {
    loadLaundry()
    loadSteam()
    const channel = supabase
      .channel('gudang-steam')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'steam_jobs' }, () => loadSteam())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function handleLaundrySave(e: React.FormEvent) {
    e.preventDefault()
    setLaundrySaving(true)
    await supabase.from('laundry_records').insert({
      date: laundryForm.date,
      customer_name: laundryForm.customer_name,
      kg: Number(laundryForm.kg) || 0,
      meter: Number(laundryForm.meter) || 0,
      description: laundryForm.description || null
    })
    setLaundrySaving(false)
    setShowLaundryForm(false)
    setLaundryForm({
      customer_name: '',
      kg: '',
      meter: '',
      description: '',
      date: new Date().toISOString().slice(0, 10)
    })
    loadLaundry()
  }

  async function handleSteamPass(job: SteamJob) {
    // V3: foto bukti WAJIB untuk stage 'steam' (per PHOTO_REQUIRED_STAGES)
    if (!steamPassPhoto) {
      alert('⚠️ Wajib upload foto bukti QC Steam (V3 accountability) sebelum konfirmasi Pass.')
      return
    }
    setPassSaving(true)
    const {
      data: { user }
    } = await supabase.auth.getUser()
    await supabase
      .from('steam_jobs')
      .update({
        status: 'done',
        result: 'pass',
        completed_at: new Date().toISOString(),
        checked_by: user?.id ?? null
      })
      .eq('id', job.id)
    // V3: insert order_progress_photos dengan stage='steam' (V3 foto bukti)
    await supabase.from('order_progress_photos').insert({
      order_id: job.order_id,
      stage: 'steam',
      photo_url: steamPassPhoto,
      uploaded_by: user?.id ?? null,
      notes: `Steam QC Pass — foto bukti hasil pengerjaan (V3)`
    })
    // Log
    await supabase.from('order_logs').insert({
      order_id: job.order_id,
      action: 'steam_qc_pass',
      notes: `Steam/QC Passed oleh Gudang`,
      staff_id: user?.id ?? null
    })

    // Pipeline baru: auto-advance dihapus. Gudang/Admin harus klik manual di order detail
    // untuk transisi steam → ready. Ini untuk konsistensi — payment_ok sekarang di antara
    // ready dan packed, jadi Gudang perlu acknowledge 'ready' stage eksplisit.

    setPassSaving(false)
    setShowPassDialog(null)
    setSteamPassPhoto(null) // V3: reset foto
    loadSteam()
  }

  async function handleSteamFail() {
    if (!showFailModal || !failReason.trim()) return
    // V3: foto bukti WAJIB untuk stage 'steam' (saat fail/revisi)
    if (!steamFailPhoto) {
      alert('⚠️ Wajib upload foto bukti QC Steam Fail (V3 accountability) sebelum konfirmasi Revisi.')
      return
    }
    setFailSaving(true)
    const {
      data: { user }
    } = await supabase.auth.getUser()
    const steamJobId = showFailModal.id
    const orderId = showFailModal.order_id
    const failReasonText = failReason

    // V3: insert order_progress_photos dengan stage='steam' (foto bukti fail)
    await supabase.from('order_progress_photos').insert({
      order_id: orderId,
      stage: 'steam',
      photo_url: steamFailPhoto,
      uploaded_by: user?.id ?? null,
      notes: `Steam QC Fail — foto bukti (V3). Alasan: ${failReasonText}`
    })

    // 1. Mark steam_job as revision (audit trail)
    await supabase
      .from('steam_jobs')
      .update({
        status: 'revision',
        result: 'fail',
        fail_reason: failReasonText,
        checked_by: user?.id ?? null
      })
      .eq('id', steamJobId)

    // 2. Get original production_job to preserve penjahit_id
    let originalPenjahitId: string | null = null
    if (showFailModal.production_job_id) {
      const { data: origJob } = await supabase
        .from('production_jobs')
        .select('penjahit_id')
        .eq('id', showFailModal.production_job_id)
        .single()
      originalPenjahitId = origJob?.penjahit_id ?? null
    }

    // 3. Calculate revision round for this order (MAX + 1)
    const { data: priorRevisions } = await supabase
      .from('production_jobs')
      .select('revision_round')
      .eq('order_id', orderId)
      .order('revision_round', { ascending: false })
      .limit(1)
    const nextRound = (priorRevisions?.[0]?.revision_round ?? -1) + 1

    // 4. INSERT new production_job for re-do
    const { data: newJob, error: newJobErr } = await supabase
      .from('production_jobs')
      .insert({
        order_id: orderId,
        penjahit_id: originalPenjahitId,
        status: 'waiting',
        revision_of: showFailModal.production_job_id ?? null,
        revision_round: nextRound,
        revision_reason: failReasonText
      })
      .select('id')
      .single()

    if (newJobErr) {
      console.error('Failed to create revision production_job:', newJobErr)
      alert('Gagal membuat job revisi: ' + newJobErr.message)
      setFailSaving(false)
      return
    }

    // 5. Update order status back to 'production' (re-queue ke Penjahit)
    await supabase.from('orders').update({ status: 'production' }).eq('id', orderId)

    // 6. Log the revision re-queue
    await supabase.from('order_logs').insert({
      order_id: orderId,
      action: 'steam_revision_requeue',
      notes: `Steam QC Fail → re-queue ke Penjahit (round ${nextRound}). Alasan: ${failReasonText}. Job revisi: ${newJob.id.slice(0, 8)}`,
      staff_id: user?.id ?? null
    })

    setFailSaving(false)
    setShowFailModal(null)
    setFailReason('')
    setSteamFailPhoto(null) // V3: reset foto
    loadSteam()
  }

  const steamPending = steamJobs.filter((j) => j.status === 'pending')
  const steamRevision = steamJobs.filter((j) => j.status === 'revision')
  const steamDone = steamJobs.filter((j) => j.status === 'done')

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Steam & QC Jahitan Penjahit</h1>
        <p className="page-subtitle">
          QC jahitan penjahit setelah mereka submit laporan produksi. <strong>Bukan</strong> untuk QC per-item pesanan
          (lihat{' '}
          <a href="/gudang/qc" style={{ color: '#cc7030' }}>
            QC Per-Item & Retur
          </a>
          ).
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem' }}>
        {(['laundry', 'steam'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === t ? '#cc7030' : 'transparent'}`,
              cursor: 'pointer',
              fontWeight: tab === t ? '700' : '500',
              color: tab === t ? '#cc7030' : '#6b7280',
              fontSize: '0.9rem',
              marginBottom: '-2px',
              transition: 'all 0.15s'
            }}
          >
            {t === 'laundry' ? '🧺 Laundry' : '♨️ QC Jahitan (Steam)'}
          </button>
        ))}
      </div>

      {/* ===== LAUNDRY TAB ===== */}
      {tab === 'laundry' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              onClick={() => setShowLaundryForm(true)}
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
              <Plus size={16} /> Input Laundry
            </button>
          </div>

          <div className="data-table">
            {laundryLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
            ) : laundryRecords.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
                <Waves size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
                <p>Belum ada laundry</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Nama Pelanggan</th>
                    <th>Kg</th>
                    <th>Meter</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {laundryRecords.map((r) => (
                    <tr key={r.id}>
                      <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                        {new Date(r.date).toLocaleDateString('id-ID')}
                      </td>
                      <td style={{ fontWeight: '500' }}>{r.customer_name}</td>
                      <td>{r.kg > 0 ? `${r.kg.toFixed(2)} kg` : '—'}</td>
                      <td>{r.meter > 0 ? `${r.meter.toFixed(2)} m` : '—'}</td>
                      <td style={{ color: '#6b7280' }}>{r.description ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ===== STEAM TAB ===== */}
      {tab === 'steam' && (
        <>
          {steamLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Menunggu QC */}
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#374151', marginBottom: '0.75rem' }}>
                  ⏳ Menunggu QC Jahitan ({steamPending.length})
                </h3>
                {steamPending.length === 0 ? (
                  <div
                    style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#9ca3af',
                      background: '#f9fafb',
                      borderRadius: '0.75rem',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    Tidak ada job yang menunggu QC jahitan
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {steamPending.map((job) => (
                      <div
                        key={job.id}
                        style={{
                          background: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.75rem',
                          padding: '1.25rem'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                            gap: '0.75rem'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                              {job.order?.customer?.name ?? 'Tanpa Nama'}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#6b7280', fontFamily: 'monospace' }}>
                              Order #{job.order_id?.slice(0, 8)} •{' '}
                              {new Date(job.created_at).toLocaleDateString('id-ID')}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => setShowPassDialog(job)}
                              style={{
                                padding: '0.5rem 1rem',
                                background: '#16a34a',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '0.5rem',
                                fontWeight: '600',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem'
                              }}
                            >
                              <CheckCircle2 size={14} /> QC Jahitan Pass
                            </button>
                            <button
                              onClick={() => {
                                setShowFailModal(job)
                                setFailReason('')
                              }}
                              style={{
                                padding: '0.5rem 1rem',
                                background: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                borderRadius: '0.5rem',
                                fontWeight: '600',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem'
                              }}
                            >
                              <AlertTriangle size={14} /> Revisi
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dikembalikan ke Penjahit */}
              {steamRevision.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#dc2626', marginBottom: '0.75rem' }}>
                    ↩️ Dikembalikan ke Penjahit ({steamRevision.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {steamRevision.map((job) => (
                      <div
                        key={job.id}
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '0.75rem',
                          padding: '1.25rem'
                        }}
                      >
                        <div style={{ fontWeight: '600', color: '#991b1b', marginBottom: '0.25rem' }}>
                          {job.order?.customer?.name ?? 'Tanpa Nama'}
                        </div>
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: '#dc2626',
                            background: '#fee2e2',
                            borderRadius: '0.375rem',
                            padding: '0.375rem 0.625rem',
                            display: 'inline-block',
                            marginBottom: '0.25rem'
                          }}
                        >
                          ⚠️ {job.fail_reason}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          Order #{job.order_id?.slice(0, 8)} • {new Date(job.created_at).toLocaleDateString('id-ID')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sudah QC Pass */}
              {steamDone.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#16a34a', marginBottom: '0.75rem' }}>
                    ✅ QC Jahitan Pass — Lanjut ke QC Per-Item ({steamDone.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {steamDone.map((job) => (
                      <div
                        key={job.id}
                        style={{
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '0.75rem',
                          padding: '1.25rem'
                        }}
                      >
                        <div style={{ fontWeight: '600', color: '#166534', marginBottom: '0.25rem' }}>
                          {job.order?.customer?.name ?? 'Tanpa Nama'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>
                          ✓ QC Jahitan Pass — {new Date(job.completed_at ?? job.created_at).toLocaleDateString('id-ID')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Order #{job.order_id?.slice(0, 8)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ===== LAUNDRY FORM MODAL ===== */}
      {showLaundryForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLaundryForm(false)
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '0.875rem',
              padding: '2rem',
              width: '100%',
              maxWidth: 440,
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)'
            }}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>🧺 Input Laundry</h2>
            <form onSubmit={handleLaundrySave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.3rem'
                  }}
                >
                  Nama Pelanggan *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Nama pelanggan"
                  value={laundryForm.customer_name}
                  onChange={(e) => setLaundryForm((f) => ({ ...f, customer_name: e.target.value }))}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.3rem'
                    }}
                  >
                    Berat (kg) *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="58,75"
                    value={laundryForm.kg}
                    onChange={(e) => setLaundryForm((f) => ({ ...f, kg: e.target.value }))}
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
                      color: '#374151',
                      marginBottom: '0.3rem'
                    }}
                  >
                    Meter (m)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={laundryForm.meter}
                    onChange={(e) => setLaundryForm((f) => ({ ...f, meter: e.target.value }))}
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
                    color: '#374151',
                    marginBottom: '0.3rem'
                  }}
                >
                  Tanggal
                </label>
                <input
                  type="date"
                  value={laundryForm.date}
                  onChange={(e) => setLaundryForm((f) => ({ ...f, date: e.target.value }))}
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
                    color: '#374151',
                    marginBottom: '0.3rem'
                  }}
                >
                  Keterangan
                </label>
                <input
                  type="text"
                  placeholder="Vitras, Gorden, dll..."
                  value={laundryForm.description}
                  onChange={(e) => setLaundryForm((f) => ({ ...f, description: e.target.value }))}
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
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowLaundryForm(false)}
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
                  type="submit"
                  disabled={laundrySaving}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#cc7030',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: laundrySaving ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {laundrySaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== PASS CONFIRMATION DIALOG ===== */}
      <Dialog
        open={!!showPassDialog}
        onOpenChange={() => {
          setShowPassDialog(null)
          setSteamPassPhoto(null)
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Konfirmasi QC Pass</DialogTitle>
            <DialogDescription>
              Yakin bahwa barang untuk <strong>{showPassDialog?.order?.customer?.name}</strong> sudah lolos QC Steam dan
              siap dikirim ke Finance untuk approval pembayaran?
            </DialogDescription>
          </DialogHeader>
          {/* V3: Foto bukti WAJIB untuk stage 'steam' */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.3rem'
              }}
            >
              Foto Bukti Hasil QC <span style={{ color: '#dc2626' }}>*</span>
            </label>
            {steamPassPhoto ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={steamPassPhoto}
                  alt="Foto bukti"
                  style={{
                    width: 100,
                    height: 100,
                    objectFit: 'cover',
                    borderRadius: '0.5rem',
                    border: '1px solid #d1d5db'
                  }}
                />
                <button
                  onClick={() => setSteamPassPhoto(null)}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 100,
                  height: 100,
                  border: '2px dashed #d1d5db',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  background: '#f9fafb',
                  gap: '0.25rem'
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleSteamPhotoUpload(e, 'pass')}
                  disabled={uploadingSteamPhoto}
                  style={{ display: 'none' }}
                />
                {uploadingSteamPhoto ? (
                  <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Upload...</span>
                ) : (
                  <>
                    <Camera size={18} style={{ color: '#9ca3af' }} />
                    <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>Wajib</span>
                  </>
                )}
              </label>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPassDialog(null)
                setSteamPassPhoto(null)
              }}
            >
              Batal
            </Button>
            <Button
              onClick={() => showPassDialog && handleSteamPass(showPassDialog)}
              disabled={passSaving || !steamPassPhoto}
            >
              {passSaving ? 'Menyimpan...' : '✓ Ya, QC Pass'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== FAIL / REVISION MODAL ===== */}
      <Dialog
        open={!!showFailModal}
        onOpenChange={() => {
          setShowFailModal(null)
          setSteamFailPhoto(null)
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Kembalikan ke Penjahit</DialogTitle>
            <DialogDescription>
              Jelaskan alasan mengapa barang dikembalikan. Penjahit akan melihat alasan ini.
            </DialogDescription>
          </DialogHeader>
          <div style={{ margin: '1rem 0' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.3rem'
              }}
            >
              Alasan Revisi *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Contoh: Jahitan kurang rapi, ukuran tidak sesuai, dll..."
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>
          {/* V3: Foto bukti WAJIB untuk stage 'steam' (saat fail) */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.3rem'
              }}
            >
              Foto Bukti QC Gagal <span style={{ color: '#dc2626' }}>*</span>
            </label>
            {steamFailPhoto ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={steamFailPhoto}
                  alt="Foto bukti fail"
                  style={{
                    width: 100,
                    height: 100,
                    objectFit: 'cover',
                    borderRadius: '0.5rem',
                    border: '1px solid #d1d5db'
                  }}
                />
                <button
                  onClick={() => setSteamFailPhoto(null)}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 100,
                  height: 100,
                  border: '2px dashed #d1d5db',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  background: '#f9fafb',
                  gap: '0.25rem'
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleSteamPhotoUpload(e, 'fail')}
                  disabled={uploadingSteamPhoto}
                  style={{ display: 'none' }}
                />
                {uploadingSteamPhoto ? (
                  <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Upload...</span>
                ) : (
                  <>
                    <Camera size={18} style={{ color: '#9ca3af' }} />
                    <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>Wajib</span>
                  </>
                )}
              </label>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowFailModal(null)
                setSteamFailPhoto(null)
              }}
            >
              Batal
            </Button>
            <Button
              onClick={handleSteamFail}
              disabled={failSaving || !failReason.trim() || !steamFailPhoto}
              style={{ background: '#dc2626' }}
            >
              {failSaving ? 'Menyimpan...' : '↩️ Ya, Kembalikan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
