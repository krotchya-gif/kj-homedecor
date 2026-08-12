'use client'
import type { Material } from '@/types'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { AlertTriangle, Plus, ShoppingBag } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface LooseRow {
  id: string
  code?: string
  stock_gudang?: number
  min_stock_level?: number
  supplier?: { name?: string } | null
  cost_per_unit?: number
  unit?: string
  name?: string
  type?: string
  balance?: number
  date?: string
  entry_date?: string
  created_at?: string
  description?: string
  notes?: string
  reference_type?: string
  debit?: number
  credit?: number
  total_debit?: number
  total_credit?: number
  total?: number
  amount?: number
  qty?: number
  status?: string
  [k: string]: unknown
}

export default function GudangAlertsPage() {
  const { toast } = useToast()
  const [alerts, setAlerts] = useState<LooseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('materials').select('*, supplier:suppliers(name)').order('name')
    // filter locally materials below min_stock
    setAlerts(((data ?? []) as LooseRow[]).filter((m) => (m.stock_gudang ?? 0) < (m.min_stock_level ?? 0)))
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  async function createPR(material: LooseRow) {
    setCreating(material.id ?? '')
    const needed = (material.min_stock_level ?? 0) - (material.stock_gudang ?? 0) + 10
    const estimatedCost = needed * (material.cost_per_unit ?? 0)
    const { error } = await supabase.from('purchase_requests').insert({
      material_id: material.id,
      qty: needed,
      estimated_cost: estimatedCost,
      status: 'pending'
    })
    if (error) { setCreating(null); toast('error', 'Gagal buat PR: ' + error.message); return }
    setCreating(null)
    toast('success', `Purchase Request untuk "${material.name}" berhasil dibuat! (${needed} unit)`)
  }

  return (
    <div>
      <PageHeader title="Monitor Stok & Alerts" subtitle="Material di bawah minimum — buat Purchase Request (PR)" />

            {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={alerts} keyOf={(m) => m.id} renderCard={(m) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Material</span>
                  <span className="mobile-card-value">{m.name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Stok Gudang</span>
                  <span className="mobile-card-value">{m.stock_gudang}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Min. Stok</span>
                  <span className="mobile-card-value">{m.min_stock_level ?? 0}</span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <AlertTriangle size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem', color: '#22c55e' }} />
            <p style={{ color: '#16a34a', fontWeight: '600' }}>Semua stok material aman ✅</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Material</th>
                <th>Satuan</th>
                <th>Stok Sekarang</th>
                <th>Min. Stok</th>
                <th>Kekurangan</th>
                <th>Supplier</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: '600' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <AlertTriangle size={14} color="#ef4444" /> {m.name}
                    </span>
                  </td>
                  <td style={{ color: 'var(--neutral-600)' }}>{m.unit ?? '—'}</td>
                  <td style={{ fontWeight: '700', color: '#ef4444' }}>{(m.stock_gudang ?? 0)}</td>
                  <td style={{ color: 'var(--neutral-700)' }}>{m.min_stock_level ?? 0}</td>
                  <td style={{ fontWeight: '700', color: '#dc2626' }}>-{((m.min_stock_level ?? 0) - (m.stock_gudang ?? 0))}</td>
                  <td style={{ color: 'var(--neutral-600)', fontSize: '0.85rem' }}>{m.supplier?.name ?? '—'}</td>
                  <td>
                    <button
                      onClick={() => createPR(m)}
                      disabled={creating === m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.375rem 0.875rem',
                        background: '#cc7030',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        cursor: creating === m.id ? 'not-allowed' : 'pointer'
                      }}
                      title="Buat permintaan pembelian material ke supplier"
                    >
                      <ShoppingBag size={12} /> {creating === m.id ? 'Membuat...' : 'Buat Permintaan Pembelian'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
