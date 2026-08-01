'use client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { WashingMachine, CheckCircle2, Clock, PackageCheck } from 'lucide-react'
import type { LaundryOrder } from '@/types'

const STATUS_CONFIG = {
  pending: { label: 'Pending', bg: '#fef3c7', text: '#92400e', icon: Clock },
  in_progress: { label: 'Diproses', bg: '#dbeafe', text: '#1e40af', icon: WashingMachine },
  done: { label: 'Selesai', bg: '#d1fae5', text: '#065f46', icon: CheckCircle2 }
}

export default function LaundryJobsPage() {
  const [orders, setOrders] = useState<LaundryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [showDoneModal, setShowDoneModal] = useState<LaundryOrder | null>(null)
  const [completedKg, setCompletedKg] = useState('')
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
      .order('received_at', { ascending: false })
    setOrders((data as LaundryOrder[]) ?? [])
    setLoading(false)
  }

  // Load unassigned orders for self-assign
  const [unassigned, setUnassigned] = useState<LaundryOrder[]>([])
  async function loadUnassigned() {
    const { data } = await supabase
      .from('laundry_orders')
      .select('*')
      .is('assigned_to', null)
      .eq('status', 'pending')
      .order('received_at', { ascending: false })
    setUnassigned((data as LaundryOrder[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])
  useEffect(() => {
    loadUnassigned()
  }, [])

  async function selfAssign(id: string) {
    const {
      data: { user }
    } = await supabase.auth.getUser()
    await supabase
      .from('laundry_orders')
      .update({ assigned_to: user?.id ?? null })
      .eq('id', id)
    await loadUnassigned()
    load()
  }

  async function startWork(id: string) {
    setSaving(id)
    await supabase.from('laundry_orders').update({ status: 'in_progress' }).eq('id', id)
    setSaving(null)
    load()
  }

  async function completeWork(id: string) {
    if (!completedKg.trim()) return
    setSaving(id)
    await supabase
      .from('laundry_orders')
      .update({
        status: 'done',
        kg: Number(completedKg) || undefined,
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
    setSaving(null)
    setShowDoneModal(null)
    setCompletedKg('')
    load()
  }

  const pending = orders.filter((o) => o.status === 'pending')
  const inProgress = orders.filter((o) => o.status === 'in_progress')
  const done = orders.filter((o) => o.status === 'done')

  return (
    <div>
      <PageHeader title="Laundry Jobs" subtitle="Pesanan laundry yang di-assign ke Anda" />

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Unassigned — self assign */}
          {unassigned.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#7c3aed', marginBottom: '0.75rem' }}>
                📋 Ambil Pesanan ({unassigned.length})
              </h3>
              <div
                style={{
                  padding: '1rem',
                  background: '#f5f3ff',
                  border: '2px dashed #c4b5fd',
                  borderRadius: '0.75rem'
                }}
              >
                {unassigned.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 0',
                      borderBottom: '1px solid #e9d5ff'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--neutral-800)' }}>{o.customer_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
                        {o.kg} kg{o.meter ? ` • ${o.meter}m` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => selfAssign(o.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#7c3aed',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontWeight: '600',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Ambil
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--neutral-700)', marginBottom: '0.75rem' }}>
              ⏳ Pesanan Baru ({pending.length})
            </h3>
            {pending.length === 0 ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--neutral-400)',
                  background: 'var(--neutral-100)',
                  borderRadius: '0.75rem',
                  border: '1px solid #e5e7eb'
                }}
              >
                Tidak ada pesanan baru
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pending.map((o) => {
                  const sc = STATUS_CONFIG[o.status]
                  return (
                    <div
                      key={o.id}
                      style={{
                        background: 'var(--surface)',
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
                          <div style={{ fontWeight: '600', color: 'var(--neutral-800)', marginBottom: '0.25rem' }}>
                            {o.customer_name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
                            {o.kg} kg{o.meter ? ` • ${o.meter}m` : ''} • {o.description || '—'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.25rem' }}>
                            Masuk: {new Date(o.received_at).toLocaleDateString('id-ID')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => startWork(o.id)}
                            disabled={saving === o.id}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#3b82f6',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '0.5rem',
                              fontWeight: '600',
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            {saving === o.id ? '...' : '▶ Mulai'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* In Progress */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e40af', marginBottom: '0.75rem' }}>
              🧺 Sedang Diproses ({inProgress.length})
            </h3>
            {inProgress.length === 0 ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--neutral-400)',
                  background: '#eff6ff',
                  borderRadius: '0.75rem',
                  border: '1px solid #bfdbfe'
                }}
              >
                Tidak ada yang sedang diproses
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {inProgress.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid #bfdbfe',
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
                        <div style={{ fontWeight: '600', color: 'var(--neutral-800)', marginBottom: '0.25rem' }}>
                          {o.customer_name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
                          {o.kg} kg{o.meter ? ` • ${o.meter}m` : ''} • {o.description || '—'}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowDoneModal(o)
                          setCompletedKg(String(o.kg))
                        }}
                        disabled={saving === o.id}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontWeight: '600',
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        {saving === o.id ? '...' : '✓ Selesai'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Done */}
          {done.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#065f46', marginBottom: '0.75rem' }}>
                ✅ Selesai ({done.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {done.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '0.75rem',
                      padding: '1.25rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#166534', marginBottom: '0.25rem' }}>
                          {o.customer_name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#16a34a' }}>
                          {o.kg} kg • Selesai:{' '}
                          {o.completed_at ? new Date(o.completed_at).toLocaleDateString('id-ID') : '-'}
                        </div>
                      </div>
                      <PackageCheck size={20} color="#16a34a" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Done Confirmation Modal */}
      <Modal
        open={!!showDoneModal}
        onClose={() => {
          setShowDoneModal(null)
          setCompletedKg('')
        }}
        maxWidth={400}
        padding="2rem"
        zIndex={200}
      >
        {showDoneModal && (
          <>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>Konfirmasi Selesai</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--neutral-600)', marginBottom: '1.5rem' }}>
              Berat aktual untuk <strong>{showDoneModal.customer_name}</strong>:
            </p>
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: 'var(--neutral-700)',
                  marginBottom: '0.3rem'
                }}
              >
                Berat Final (kg)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={completedKg}
                onChange={(e) => setCompletedKg(e.target.value)}
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
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setShowDoneModal(null)
                  setCompletedKg('')
                }}
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
                onClick={() => completeWork(showDoneModal.id)}
                disabled={saving === showDoneModal.id || !completedKg.trim()}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {saving === showDoneModal.id ? 'Menyimpan...' : '✓ Selesai'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
