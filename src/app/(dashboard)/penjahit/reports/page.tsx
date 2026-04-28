'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { BarChart3 } from 'lucide-react'

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

export default function PenjahitReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth]     = useState(new Date().getMonth())
  const [year, setYear]       = useState(new Date().getFullYear())
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('production_reports')
        .select('*, job:production_jobs(penjahit_id, order:orders(customer:customers(name)))')
        .order('created_at', { ascending: false })
      // filter by penjahit_id and month
      const filtered = (data ?? []).filter((r: any) => {
        const d = new Date(r.created_at)
        return r.job?.penjahit_id === user?.id && d.getMonth() === month && d.getFullYear() === year
      })
      setReports(filtered)
      setLoading(false)
    }
    load()
  }, [month, year])

  const totals = reports.reduce((acc, r) => ({
    gorden:     acc.gorden     + (r.meter_gorden ?? 0),
    vitras:     acc.vitras     + (r.meter_vitras ?? 0),
    roman:      acc.roman      + (r.meter_roman ?? 0),
    kupu_kupu:  acc.kupu_kupu  + (r.meter_kupu_kupu ?? 0),
    poni_lurus: acc.poni_lurus + (r.poni_lurus ?? 0),
    poni_gel:   acc.poni_gel   + (r.poni_gel ?? 0),
  }), { gorden:0, vitras:0, roman:0, kupu_kupu:0, poni_lurus:0, poni_gel:0 })

  // Example rates (configurable by owner later)
  const RATES = { gorden:500, vitras:300, roman:600, kupu_kupu:700, poni_lurus:2000, poni_gel:3000 }
  const estimated = (
    totals.gorden * RATES.gorden +
    totals.vitras * RATES.vitras +
    totals.roman * RATES.roman +
    totals.kupu_kupu * RATES.kupu_kupu +
    totals.poni_lurus * RATES.poni_lurus +
    totals.poni_gel * RATES.poni_gel
  )
  const fmt = (n: number) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Rekap Bulanan</h1>
        <p className="page-subtitle">Total meter pengerjaan dan estimasi upah</p>
      </div>

      {/* Month picker */}
      <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', marginBottom:'1.5rem' }}>
        <select value={month} onChange={e=>setMonth(Number(e.target.value))}
          style={{ padding:'0.625rem 1rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none', background:'#fff' }}>
          {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
        </select>
        <select value={year} onChange={e=>setYear(Number(e.target.value))}
          style={{ padding:'0.625rem 1rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none', background:'#fff' }}>
          {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
        {[
          {label:'Gorden',     val:`${totals.gorden.toFixed(2)}m`,     sub:`× Rp ${RATES.gorden}/m`,     color:'#cc7030'},
          {label:'Vitras',     val:`${totals.vitras.toFixed(2)}m`,     sub:`× Rp ${RATES.vitras}/m`,     color:'#2563eb'},
          {label:'Roman Blind',val:`${totals.roman.toFixed(2)}m`,      sub:`× Rp ${RATES.roman}/m`,      color:'#16a34a'},
          {label:'Kupu-Kupu', val:`${totals.kupu_kupu.toFixed(2)}m`,   sub:`× Rp ${RATES.kupu_kupu}/m`,  color:'#9333ea'},
          {label:'Poni Lurus', val:`${totals.poni_lurus}pcs`,          sub:`× Rp ${RATES.poni_lurus}`,   color:'#0d9488'},
          {label:'Poni Gel',   val:`${totals.poni_gel}pcs`,            sub:`× Rp ${RATES.poni_gel}`,     color:'#dc2626'},
        ].map(s=>(
          <div className="stat-card" key={s.label}>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value" style={{color:s.color,fontSize:'1.4rem'}}>{s.val}</div>
            <div className="stat-card-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Estimated wage */}
      <div style={{ background:'linear-gradient(135deg,#1a0a00,#3d1a08)', borderRadius:'0.875rem', padding:'1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <div style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.85rem', marginBottom:'0.25rem' }}>Estimasi Upah {MONTHS[month]} {year}</div>
          <div style={{ color:'#f4a857', fontSize:'2rem', fontWeight:'800', fontFamily:'Playfair Display,serif' }}>{fmt(estimated)}</div>
        </div>
        <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.78rem', maxWidth:200 }}>*Estimasi berdasarkan rate per meter/pcs. Final tergantung rekap Finance.</div>
      </div>

      {/* Detail table */}
      <div className="data-table">
        {loading ? (
          <div style={{ padding:'2rem', textAlign:'center', color:'#9ca3af' }}>Memuat...</div>
        ) : reports.length === 0 ? (
          <div style={{ padding:'3rem', textAlign:'center', color:'#9ca3af' }}>
            <BarChart3 size={32} style={{ opacity:0.3, margin:'0 auto 0.75rem' }}/>
            <p>Belum ada laporan di periode ini</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Pelanggan</th><th>Gorden</th><th>Vitras</th><th>Roman</th><th>Kupu²</th><th>P.Lurus</th><th>P.Gel</th><th>Catatan</th></tr>
            </thead>
            <tbody>
              {reports.map(r=>(
                <tr key={r.id}>
                  <td style={{ fontWeight:'500' }}>{r.job?.order?.customer?.name ?? '—'}</td>
                  <td>{(r.meter_gorden ?? 0).toFixed(2)}m</td>
                  <td>{(r.meter_vitras ?? 0).toFixed(2)}m</td>
                  <td>{(r.meter_roman ?? 0).toFixed(2)}m</td>
                  <td>{(r.meter_kupu_kupu ?? 0).toFixed(2)}m</td>
                  <td>{r.poni_lurus ?? 0}</td>
                  <td>{r.poni_gel ?? 0}</td>
                  <td style={{ color:'#6b7280', fontSize:'0.8rem' }}>{r.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
