'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { AlertTriangle, Plus, ShoppingBag } from 'lucide-react'

export default function GudangAlertsPage() {
  const [alerts, setAlerts]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string|null>(null)
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('materials')
      .select('*, supplier:suppliers(name)')
      .order('name')
    // filter locally materials below min_stock
    setAlerts((data ?? []).filter((m: any) => m.stock_gudang < m.min_stock_level))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function createPR(material: any) {
    setCreating(material.id)
    const needed = material.min_stock_level - material.stock_gudang + 10
    const estimatedCost = needed * (material.cost_per_unit ?? 0)
    await supabase.from('purchase_requests').insert({
      material_id: material.id,
      qty: needed,
      estimated_cost: estimatedCost,
      status: 'pending',
    })
    setCreating(null)
    alert(`Purchase Request untuk "${material.name}" berhasil dibuat! (${needed} unit)`)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Monitor Stok & Alerts</h1>
        <p className="page-subtitle">Material di bawah minimum — buat Purchase Request (PR)</p>
      </div>

      <div className="data-table">
        {loading ? (
          <div style={{ padding:'2rem', textAlign:'center', color:'#9ca3af' }}>Memuat...</div>
        ) : alerts.length === 0 ? (
          <div style={{ padding:'3rem', textAlign:'center', color:'#9ca3af' }}>
            <AlertTriangle size={32} style={{ opacity:0.3, margin:'0 auto 0.75rem', color:'#22c55e' }}/>
            <p style={{ color:'#16a34a', fontWeight:'600' }}>Semua stok material aman ✅</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Material</th><th>Satuan</th><th>Stok Sekarang</th><th>Min. Stok</th><th>Kekurangan</th><th>Supplier</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {alerts.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight:'600' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:'0.4rem' }}>
                      <AlertTriangle size={14} color="#ef4444"/> {m.name}
                    </span>
                  </td>
                  <td style={{ color:'#6b7280' }}>{m.unit}</td>
                  <td style={{ fontWeight:'700', color:'#ef4444' }}>{m.stock_gudang}</td>
                  <td style={{ color:'#374151' }}>{m.min_stock_level}</td>
                  <td style={{ fontWeight:'700', color:'#dc2626' }}>-{m.min_stock_level - m.stock_gudang}</td>
                  <td style={{ color:'#6b7280', fontSize:'0.85rem' }}>{m.supplier?.name ?? '—'}</td>
                  <td>
                    <button onClick={() => createPR(m)} disabled={creating === m.id}
                      style={{ display:'flex', alignItems:'center', gap:'0.375rem', padding:'0.375rem 0.875rem', background:'#cc7030', color:'#fff', border:'none', borderRadius:'0.375rem', fontSize:'0.78rem', fontWeight:'600', cursor:creating===m.id?'not-allowed':'pointer' }}>
                      <ShoppingBag size={12}/> {creating===m.id ? 'Membuat...' : 'Buat PR'}
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
