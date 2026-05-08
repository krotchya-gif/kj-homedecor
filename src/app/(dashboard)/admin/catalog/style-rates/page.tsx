'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { RefreshCw, Check } from 'lucide-react'

const STYLE_LABELS: Record<string, string> = {
  smokring: 'Smokring',
  kaitan: 'Kaitan',
  'kupu-kupu': 'Kupu-Kupu',
  romanshade: 'Romanship',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

interface StyleRate {
  id: string
  style: string
  rate_per_meter: number
  is_active: boolean
  updated_at: string
}

export default function StyleRatesPage() {
  const [rates, setRates] = useState<StyleRate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  async function fetchRates() {
    setLoading(true)
    const { data } = await supabase.from('style_rates').select('*').order('style')
    setRates((data as StyleRate[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchRates() }, [])

  async function handleSave(rate: StyleRate) {
    setSaving(true)
    await supabase.from('style_rates').update({
      rate_per_meter: Number(editValue),
      updated_at: new Date().toISOString(),
    }).eq('id', rate.id)
    setEditingId(null)
    setSaving(false)
    fetchRates()
  }

  function startEdit(r: StyleRate) {
    setEditingId(r.id)
    setEditValue(String(r.rate_per_meter))
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Style Rates</h1>
          <p className="page-subtitle">Atur harga per meter untuk setiap model gorden</p>
        </div>
      </div>

      <div className="form-section" style={{ maxWidth: 560 }}>
        <div className="form-section-title">Daftar Rate per Meter (IDR)</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '2px solid #e5e7eb', fontSize: '0.8rem', color: '#6b7280' }}>Model</th>
              <th style={{ textAlign: 'right', padding: '0.75rem', borderBottom: '2px solid #e5e7eb', fontSize: '0.8rem', color: '#6b7280' }}>Rate per Meter</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {rates.map(r => (
              <tr key={r.id}>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #f3f4f6', fontWeight: '600' }}>
                  {STYLE_LABELS[r.style] ?? r.style}
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontFamily: 'monospace' }}>{r.style}</div>
                </td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>
                  {editingId === r.id ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      style={{ width: 120, padding: '0.375rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', textAlign: 'right' }}
                    />
                  ) : (
                    <span style={{ fontWeight: '600', color: '#cc7030' }}>{fmt(r.rate_per_meter)}</span>
                  )}
                </td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>
                  {editingId === r.id ? (
                    <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleSave(r)} disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.625rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer' }}>
                        <Check size={12} /> Simpan
                      </button>
                      <button onClick={() => setEditingId(null)}
                        style={{ padding: '0.375rem 0.625rem', background: '#f3f4f6', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(r)}
                      style={{ padding: '0.375rem 0.625rem', background: '#fef3c7', color: '#92400e', border: 'none', borderRadius: '0.375rem', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer' }}>
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={fetchRates}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
