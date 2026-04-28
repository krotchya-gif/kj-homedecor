'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Scissors, CheckCircle2, Clock } from 'lucide-react'

export default function PenjahitJobsPage() {
  const [jobs, setJobs]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<string|null>(null)
  const [reportForm, setReportForm] = useState<Record<string,any>>({})
  const [showReport, setShowReport] = useState<string|null>(null)
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('production_jobs')
      .select('*, order:orders(id, customer:customers(name)), order_item:order_items(size, product:products(name))')
      .eq('penjahit_id', user?.id ?? '')
      .neq('status', 'done')
      .order('created_at', { ascending: true })
    setJobs(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function startJob(id: string) {
    setSaving(id)
    await supabase.from('production_jobs').update({ status:'in_progress', started_at: new Date().toISOString() }).eq('id',id)
    setSaving(null)
    load()
  }

  async function submitReport(jobId: string) {
    setSaving(jobId)
    const rf = reportForm[jobId] ?? {}
    await supabase.from('production_reports').insert({
      production_job_id: jobId,
      meter_gorden:     Number(rf.meter_gorden ?? 0),
      meter_vitras:     Number(rf.meter_vitras ?? 0),
      meter_roman:      Number(rf.meter_roman ?? 0),
      meter_kupu_kupu:  Number(rf.meter_kupu_kupu ?? 0),
      poni_lurus:       Number(rf.poni_lurus ?? 0),
      poni_gel:         Number(rf.poni_gel ?? 0),
      notes: rf.notes || null,
    })
    await supabase.from('production_jobs').update({ status:'done', completed_at: new Date().toISOString() }).eq('id',jobId)
    setSaving(null)
    setShowReport(null)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Job Queue</h1>
        <p className="page-subtitle">Daftar pekerjaan yang harus dikerjakan hari ini</p>
      </div>

      {jobs.length === 0 && !loading ? (
        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'0.75rem', padding:'3rem', textAlign:'center' }}>
          <CheckCircle2 size={40} style={{ color:'#22c55e', margin:'0 auto 1rem' }}/>
          <p style={{ fontWeight:'700', color:'#166534', fontSize:'1.1rem' }}>Semua job selesai! 🎉</p>
          <p style={{ color:'#16a34a', fontSize:'0.875rem' }}>Tidak ada pekerjaan yang pending</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {loading && <div style={{ textAlign:'center', color:'#9ca3af', padding:'2rem' }}>Memuat...</div>}
          {jobs.map(job => {
            const item = job.order_item
            return (
              <div key={job.id} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:'0.75rem', padding:'1.25rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.75rem' }}>
                  <div>
                    <div style={{ fontWeight:'700', fontSize:'1rem', color:'#1f2937' }}>{item?.product?.name ?? 'Item Pesanan'}</div>
                    <div style={{ fontSize:'0.85rem', color:'#6b7280', marginTop:'0.25rem' }}>
                      Pelanggan: {job.order?.customer?.name ?? '—'}
                      {item?.size && <span style={{ marginLeft:'0.75rem' }}>Ukuran: {item.size}</span>}
                    </div>
                    <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.75rem', flexWrap:'wrap' }}>
                      {[
                        {label:'Gorden', val:job.meter_gorden},
                        {label:'Vitras', val:job.meter_vitras},
                        {label:'Roman', val:job.meter_roman},
                        {label:'Kupu²', val:job.meter_kupu_kupu},
                      ].filter(m=>m.val>0).map(m=>(
                        <span key={m.label} style={{ background:'#fff3e8', color:'#cc7030', padding:'0.2rem 0.6rem', borderRadius:'999px', fontSize:'0.78rem', fontWeight:'600' }}>
                          {m.label}: {Number(m.val).toFixed(2)}m
                        </span>
                      ))}
                      {job.poni_lurus && <span style={{ background:'#e0e7ff', color:'#3730a3', padding:'0.2rem 0.6rem', borderRadius:'999px', fontSize:'0.78rem', fontWeight:'600' }}>Poni Lurus</span>}
                      {job.poni_gel   && <span style={{ background:'#fef3c7', color:'#92400e', padding:'0.2rem 0.6rem', borderRadius:'999px', fontSize:'0.78rem', fontWeight:'600' }}>Poni Gel</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                    {job.status === 'waiting' && (
                      <button onClick={()=>startJob(job.id)} disabled={saving===job.id}
                        style={{ padding:'0.5rem 1.25rem', background:'#fef3c7', color:'#92400e', border:'1px solid #fde68a', borderRadius:'0.5rem', fontWeight:'600', cursor:'pointer', fontSize:'0.875rem', display:'flex', alignItems:'center', gap:'0.375rem' }}>
                        <Clock size={14}/> Mulai Kerjakan
                      </button>
                    )}
                    {job.status === 'in_progress' && (
                      <button onClick={()=>setShowReport(job.id)}
                        style={{ padding:'0.5rem 1.25rem', background:'#cc7030', color:'#fff', border:'none', borderRadius:'0.5rem', fontWeight:'600', cursor:'pointer', fontSize:'0.875rem', display:'flex', alignItems:'center', gap:'0.375rem' }}>
                        <CheckCircle2 size={14}/> Selesai & Laporan
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline report form */}
                {showReport === job.id && (
                  <div style={{ borderTop:'1px solid #e5e7eb', marginTop:'1rem', paddingTop:'1rem' }}>
                    <div style={{ fontWeight:'600', fontSize:'0.875rem', color:'#374151', marginBottom:'0.75rem' }}>📋 Laporan Pengerjaan</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.5rem', marginBottom:'0.75rem' }}>
                      {[{label:'Gorden (m)',id:'meter_gorden'},{label:'Vitras (m)',id:'meter_vitras'},{label:'Roman (m)',id:'meter_roman'},{label:'Kupu² (m)',id:'meter_kupu_kupu'}].map(f=>(
                        <div key={f.id}>
                          <label style={{ display:'block', fontSize:'0.72rem', fontWeight:'600', color:'#6b7280', marginBottom:'0.2rem' }}>{f.label}</label>
                          <input type="number" step="0.1" min="0" placeholder="0"
                            value={reportForm[job.id]?.[f.id] ?? ''} onChange={e=>setReportForm(prev=>({...prev,[job.id]:{...(prev[job.id]??{}),[f.id]:e.target.value}}))}
                            style={{ width:'100%', padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:'0.375rem', fontSize:'0.8rem', outline:'none' }}/>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 2fr', gap:'0.5rem', marginBottom:'0.75rem' }}>
                      {[{label:'Poni Lurus',id:'poni_lurus'},{label:'Poni Gel',id:'poni_gel'}].map(f=>(
                        <div key={f.id}>
                          <label style={{ display:'block', fontSize:'0.72rem', fontWeight:'600', color:'#6b7280', marginBottom:'0.2rem' }}>{f.label} (pcs)</label>
                          <input type="number" min="0" placeholder="0"
                            value={reportForm[job.id]?.[f.id] ?? ''} onChange={e=>setReportForm(prev=>({...prev,[job.id]:{...(prev[job.id]??{}),[f.id]:e.target.value}}))}
                            style={{ width:'100%', padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:'0.375rem', fontSize:'0.8rem', outline:'none' }}/>
                        </div>
                      ))}
                      <div>
                        <label style={{ display:'block', fontSize:'0.72rem', fontWeight:'600', color:'#6b7280', marginBottom:'0.2rem' }}>Catatan</label>
                        <input type="text" placeholder="Catatan..." value={reportForm[job.id]?.notes ?? ''} onChange={e=>setReportForm(prev=>({...prev,[job.id]:{...(prev[job.id]??{}),notes:e.target.value}}))}
                          style={{ width:'100%', padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:'0.375rem', fontSize:'0.8rem', outline:'none' }}/>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'0.5rem' }}>
                      <button onClick={()=>setShowReport(null)} style={{ padding:'0.5rem 1rem', border:'1px solid #d1d5db', borderRadius:'0.375rem', background:'#fff', cursor:'pointer', fontWeight:'600', fontSize:'0.8rem' }}>Batal</button>
                      <button onClick={()=>submitReport(job.id)} disabled={saving===job.id}
                        style={{ padding:'0.5rem 1.25rem', background:'#16a34a', color:'#fff', border:'none', borderRadius:'0.375rem', fontWeight:'600', cursor:'pointer', fontSize:'0.8rem', display:'flex', alignItems:'center', gap:'0.375rem' }}>
                        <CheckCircle2 size={13}/> {saving===job.id ? 'Menyimpan...' : 'Konfirmasi Selesai'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
