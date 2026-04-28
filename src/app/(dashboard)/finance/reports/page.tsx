'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { BarChart3, TrendingUp, DollarSign, Scissors } from 'lucide-react'

const fmt  = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const RATES  = { gorden: 500, vitras: 300, roman: 600, kupu_kupu: 700, poni_lurus: 2000, poni_gel: 3000 }

export default function FinanceReportsPage() {
  const [orders,   setOrders]   = useState<any[]>([])
  const [reports,  setReports]  = useState<any[]>([])
  const [lembur,   setLembur]   = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [month,    setMonth]    = useState(new Date().getMonth())
  const [year,     setYear]     = useState(new Date().getFullYear())
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [oRes, rRes, lRes] = await Promise.all([
        supabase.from('orders').select('total_amount, dp_amount, lunas_amount, payment_status, source, created_at').order('created_at', { ascending: false }),
        supabase.from('production_reports').select('*, job:production_jobs(penjahit_id, penjahit:users(name))').order('created_at', { ascending: false }),
        supabase.from('lembur_records').select('*, staff:users(name)').order('date', { ascending: false }),
      ])
      setOrders(oRes.data ?? [])
      setReports(rRes.data ?? [])
      setLembur(lRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // Filter by selected month/year
  const periodKey = `${year}-${String(month + 1).padStart(2, '0')}`

  const periodOrders = orders.filter(o => o.created_at?.slice(0, 7) === periodKey)
  const periodReports = reports.filter(r => r.created_at?.slice(0, 7) === periodKey)
  const periodLembur  = lembur.filter(l => l.date?.slice(0, 7) === periodKey)

  // Revenue
  const totalRevenue = periodOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0)
  const totalDp      = periodOrders.reduce((s, o) => s + (o.dp_amount ?? 0), 0)
  const totalLunas   = periodOrders.reduce((s, o) => s + (o.lunas_amount ?? 0), 0)

  // Platform breakdown
  const bySource: Record<string, number> = {}
  periodOrders.forEach(o => { bySource[o.source] = (bySource[o.source] ?? 0) + 1 })

  // Pengupahan penjahit
  interface PenjahitMap { [key: string]: { name: string; gorden: number; vitras: number; roman: number; kupu_kupu: number; poni_lurus: number; poni_gel: number } }
  const byPenjahit = periodReports.reduce<PenjahitMap>((acc, r) => {
    const id   = r.job?.penjahit_id ?? 'unknown'
    const name = r.job?.penjahit?.name ?? 'Unknown'
    if (!acc[id]) acc[id] = { name, gorden: 0, vitras: 0, roman: 0, kupu_kupu: 0, poni_lurus: 0, poni_gel: 0 }
    acc[id].gorden     += r.meter_gorden    ?? 0
    acc[id].vitras     += r.meter_vitras    ?? 0
    acc[id].roman      += r.meter_roman     ?? 0
    acc[id].kupu_kupu  += r.meter_kupu_kupu ?? 0
    acc[id].poni_lurus += r.poni_lurus      ?? 0
    acc[id].poni_gel   += r.poni_gel        ?? 0
    return acc
  }, {})

  const calcUpah = (p: PenjahitMap[string]) =>
    p.gorden * RATES.gorden + p.vitras * RATES.vitras + p.roman * RATES.roman +
    p.kupu_kupu * RATES.kupu_kupu + p.poni_lurus * RATES.poni_lurus + p.poni_gel * RATES.poni_gel

  const totalLemburJam = periodLembur.reduce((s, l) => s + (l.jam ?? 0), 0)

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Laporan Keuangan</h1>
        <p className="page-subtitle">Laporan penjualan, platform breakdown & rekap pengupahan penjahit</p>
      </div>

      {/* Period picker */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          style={{ padding: '0.625rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }}>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          style={{ padding: '0.625rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }}>
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Menampilkan data: {MONTHS[month]} {year}</span>
      </div>

      {/* Revenue stats */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Omzet',      val: fmt(totalRevenue),             color: '#cc7030', icon: <TrendingUp size={18}/> },
          { label: 'Total DP Masuk',   val: fmt(totalDp),                  color: '#2563eb', icon: <DollarSign size={18}/> },
          { label: 'Total Pelunasan',  val: fmt(totalLunas),               color: '#16a34a', icon: <DollarSign size={18}/> },
          { label: 'Jumlah Pesanan',   val: String(periodOrders.length),   color: '#9333ea', icon: <BarChart3 size={18}/> },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div style={{ color: s.color, marginBottom: '0.5rem' }}>{s.icon}</div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Platform breakdown */}
        <div className="form-section">
          <div className="form-section-title">📊 Breakdown per Platform</div>
          {Object.keys(bySource).length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Tidak ada pesanan di periode ini</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {Object.entries(bySource).sort((a, b) => b[1] - a[1]).map(([src, count]) => (
                <div key={src} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', textTransform: 'capitalize' }}>{src}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ height: 8, width: Math.max(count * 20, 8), background: '#cc7030', borderRadius: '999px', opacity: 0.7 }} />
                    <span style={{ background: '#f3f4f6', padding: '0.2rem 0.625rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '600' }}>{count} pesanan</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lembur summary */}
        <div className="form-section">
          <div className="form-section-title">⏱️ Lembur Bulan Ini</div>
          {periodLembur.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Tidak ada catatan lembur</p>
          ) : (
            <>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#cc7030', marginBottom: '0.5rem' }}>{totalLemburJam} jam</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {periodLembur.slice(0, 5).map((l, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#6b7280' }}>
                    <span>{l.staff?.name ?? '—'} — {new Date(l.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                    <span style={{ fontWeight: '600', color: '#374151' }}>{l.jam} jam</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Penjahit wage table */}
      <div className="form-section">
        <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Scissors size={15} /> Rekap Pengupahan Penjahit — {MONTHS[month]} {year}
        </div>
        {Object.keys(byPenjahit).length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', padding: '1rem 0' }}>Tidak ada laporan produksi di periode ini</p>
        ) : (
          <div className="data-table" style={{ marginTop: '0.75rem' }}>
            <table>
              <thead>
                <tr><th>Nama Penjahit</th><th>Gorden</th><th>Vitras</th><th>Roman</th><th>Kupu²</th><th>P.Lurus</th><th>P.Gel</th><th>Est. Upah</th></tr>
              </thead>
              <tbody>
                {Object.entries(byPenjahit).map(([id, p]) => (
                  <tr key={id}>
                    <td style={{ fontWeight: '600' }}>{p.name}</td>
                    <td>{p.gorden.toFixed(2)}m</td>
                    <td>{p.vitras.toFixed(2)}m</td>
                    <td>{p.roman.toFixed(2)}m</td>
                    <td>{p.kupu_kupu.toFixed(2)}m</td>
                    <td>{p.poni_lurus} pcs</td>
                    <td>{p.poni_gel} pcs</td>
                    <td style={{ fontWeight: '700', color: '#cc7030' }}>{fmt(calcUpah(p))}</td>
                  </tr>
                ))}
                <tr style={{ background: '#fafafa', fontWeight: '700' }}>
                  <td>Total</td>
                  <td colSpan={6}></td>
                  <td style={{ color: '#cc7030' }}>
                    {fmt(Object.values(byPenjahit).reduce((s, p) => s + calcUpah(p), 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
