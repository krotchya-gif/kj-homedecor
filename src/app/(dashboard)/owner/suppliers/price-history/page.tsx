'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { TrendingUp, TrendingDown, Minus, Search, Package, Calendar } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function MaterialHistoryPage() {
  const [materials, setMaterials] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMaterial, setSelectedMaterial] = useState<string>('')
  const [search, setSearch] = useState('')

  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [matsRes, suplRes] = await Promise.all([
      supabase.from('materials').select('*, supplier:suppliers(id,name)').order('name'),
      supabase.from('suppliers').select('id,name').order('name')
    ])
    setMaterials(matsRes.data ?? [])
    setSuppliers(suplRes.data ?? [])
    setLoading(false)
  }

  async function loadHistory(material_id: string) {
    setSelectedMaterial(material_id)
    const { data } = await supabase
      .from('material_price_history')
      .select('*, supplier:suppliers(name)')
      .eq('material_id', material_id)
      .order('recorded_at', { ascending: false })
      .limit(30)
    setHistory(data ?? [])
  }

  const filteredMaterials = materials.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.supplier?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const selectedMat = materials.find((m) => m.id === selectedMaterial)
  const latestPrice = selectedMat?.cost_per_unit

  // Compute trend
  function getTrend(): { direction: 'up' | 'down' | 'same'; diff: number; pct: number } {
    if (history.length < 2) return { direction: 'same', diff: 0, pct: 0 }
    const current = history[0].price
    const previous = history[1].price
    const diff = current - previous
    const pct = previous > 0 ? (diff / previous) * 100 : 0
    return { direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same', diff, pct }
  }

  const trend = getTrend()

  return (
    <div>
      <PageHeader
        title="Riwayat Harga Material"
        subtitle="Track naik/turun harga material per supplier untuk negotiation & budgeting"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left: Material list */}
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ position: 'relative' }}>
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
                placeholder="Cari material atau supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 1rem 0.625rem 2.25rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div className="data-table" style={{ maxHeight: 600, overflowY: 'auto' }}>
            {loading ? (
              <TableSkeleton rows={8} cols={3} />
            ) : filteredMaterials.length === 0 ? (
              <EmptyState
                icon="📦"
                title="Tidak ada material"
                description="Tidak ada material yang cocok dengan pencarian."
              />
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Supplier</th>
                    <th>Harga Terkini</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => loadHistory(m.id)}
                      style={{
                        cursor: 'pointer',
                        background: selectedMaterial === m.id ? '#fff7ed' : 'transparent'
                      }}
                    >
                      <td style={{ fontWeight: selectedMaterial === m.id ? '700' : '500' }}>{m.name}</td>
                      <td style={{ color: 'var(--neutral-600)', fontSize: '0.82rem' }}>{m.supplier?.name ?? '—'}</td>
                      <td style={{ fontWeight: '600', color: '#cc7030' }}>{formatRp(m.cost_per_unit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Price history detail */}
        <div>
          {!selectedMaterial ? (
            <div className="section-card">
              <Package size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p>Pilih material di sebelah kiri untuk melihat riwayat harganya</p>
            </div>
          ) : loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
          ) : (
            <div>
              {/* Header */}
              <div className="section-card">
                <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--neutral-800)', marginBottom: '0.375rem' }}>
                  {selectedMat?.name}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--neutral-600)', marginBottom: '0.75rem' }}>
                  Supplier: <strong>{selectedMat?.supplier?.name ?? '—'}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginBottom: '0.2rem' }}>HARGA TERKINI</div>
                    <div style={{ fontWeight: '800', fontSize: '1.5rem', color: '#cc7030' }}>
                      {formatRp(latestPrice)}
                    </div>
                  </div>
                  {trend.direction !== 'same' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {trend.direction === 'up' ? (
                        <TrendingUp size={20} color="#dc2626" />
                      ) : (
                        <TrendingDown size={20} color="#059669" />
                      )}
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>vs harga sebelumnya</div>
                        <div style={{ fontWeight: '700', color: trend.direction === 'up' ? '#dc2626' : '#059669' }}>
                          {trend.direction === 'up' ? '+' : ''}
                          {formatRp(trend.diff)} ({trend.pct.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                  )}
                  {trend.direction === 'same' && history.length >= 2 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--neutral-600)' }}>
                      <Minus size={20} />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>vs harga sebelumnya</div>
                        <div style={{ fontWeight: '700' }}>Tidak berubah</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* History table */}
              <div
                style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}
              >
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: 'var(--neutral-100)' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>
                    Riwayat Perubahan Harga
                  </h3>
                </div>
                {history.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
                    <Calendar size={28} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                    <p>Belum ada data riwayat harga untuk material ini.</p>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                      Riwayat harga tercatat otomatis setiap kali harga material diubah.
                    </p>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Harga</th>
                        <th>Supplier</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, i) => (
                        <tr key={h.id}>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                            {new Date(h.recorded_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                            {i === 0 && (
                              <span
                                style={{
                                  marginLeft: '0.5rem',
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '999px',
                                  fontSize: '0.65rem',
                                  fontWeight: '700'
                                }}
                              >
                                Terkini
                              </span>
                            )}
                          </td>
                          <td style={{ fontWeight: '600', color: '#cc7030' }}>{formatRp(h.price)}</td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--neutral-600)' }}>{h.supplier?.name ?? '—'}</td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--neutral-400)' }}>{h.notes ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
