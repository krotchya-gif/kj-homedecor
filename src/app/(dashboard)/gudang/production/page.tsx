'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { CheckCircle2, Clock, Layers, ExternalLink } from 'lucide-react'

const STATUS_COLORS: Record<string,{bg:string,text:string}> = {
  waiting:     {bg:'#fef2f2',text:'#991b1b'},
  in_progress: {bg:'#fef3c7',text:'#92400e'},
  done:        {bg:'#d1fae5',text:'#065f46'},
}

export default function GudangProductionPage() {
  const [jobs, setJobs]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('')
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('production_jobs')
      .select('*, order:orders(id, customer:customers(name)), penjahit:users(name)')
      .order('created_at', { ascending: false })
    setJobs(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function updateJobStatus(jobId: string, status: string) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('production_jobs').update({
      status,
      ...(status === 'in_progress' ? { started_at: new Date().toISOString() } : {}),
      ...(status === 'done'        ? { completed_at: new Date().toISOString() } : {}),
    }).eq('id', jobId)

    // Log the action
    await supabase.from('order_logs').insert({
      order_id: jobs.find(j => j.id === jobId)?.order_id,
      action: status === 'in_progress' ? 'production_started' : 'production_done',
      notes: status === 'in_progress'
        ? `Produksi dimulai oleh Gudang`
        : `Produksi selesai — siap QC`,
      staff_id: user?.id ?? null,
    })
    load()
  }

  const filtered = filter ? jobs.filter(j => j.status === filter) : jobs

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Proses Pesanan</h1>
        <p className="page-subtitle">Queue produksi dari penjahit — tracking status jahit per order</p>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom:'1.25rem' }}>
        {[
          {label:'Menunggu',   val:jobs.filter(j=>j.status==='waiting').length,     color:'#ef4444'},
          {label:'Dikerjakan', val:jobs.filter(j=>j.status==='in_progress').length, color:'#f59e0b'},
          {label:'Selesai',    val:jobs.filter(j=>j.status==='done').length,        color:'#22c55e'},
        ].map(s=>(
          <div className="stat-card" key={s.label}>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value" style={{color:s.color}}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem' }}>
        {['','waiting','in_progress','done'].map(s=>(
          <button key={s} onClick={()=>setFilter(s)}
            style={{ padding:'0.4rem 1rem', borderRadius:'999px', fontSize:'0.8rem', fontWeight:'600', cursor:'pointer', border:'none',
              background: filter===s ? '#cc7030' : '#f3f4f6',
              color: filter===s ? '#fff' : '#374151' }}>
            {s==='' ? 'Semua' : s==='waiting' ? 'Menunggu' : s==='in_progress' ? 'Dikerjakan' : 'Selesai'}
          </button>
        ))}
      </div>

      <div className="data-table">
        {loading ? (
          <div style={{ padding:'2rem', textAlign:'center', color:'#9ca3af' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'3rem', textAlign:'center', color:'#9ca3af' }}>
            <Layers size={32} style={{ opacity:0.3, margin:'0 auto 0.75rem' }}/>
            <p>Belum ada job produksi</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Pesanan</th><th>Pelanggan</th><th>Penjahit</th><th>Gorden</th><th>Vitras</th><th>Roman</th><th>Kupu²</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {filtered.map(job => {
                const sc = STATUS_COLORS[job.status]
                return (
                  <tr key={job.id}>
                    <td style={{ fontFamily:'monospace', fontSize:'0.78rem', color:'#6b7280' }}>
                      <Link href={`/admin/orders/${job.order?.id}`} style={{ color:'#cc7030', textDecoration:'none' }}>
                        {job.order?.id?.slice(0,8)} <ExternalLink size={10}/>
                      </Link>
                    </td>
                    <td style={{ fontWeight:'500' }}>{job.order?.customer?.name ?? '—'}</td>
                    <td style={{ color:'#6b7280' }}>{job.penjahit?.name ?? '—'}</td>
                    <td>{Number(job.meter_gorden    ?? 0).toFixed(2)}m</td>
                    <td>{Number(job.meter_vitras    ?? 0).toFixed(2)}m</td>
                    <td>{Number(job.meter_roman     ?? 0).toFixed(2)}m</td>
                    <td>{Number(job.meter_kupu_kupu ?? 0).toFixed(2)}m</td>
                    <td>
                      <span style={{ ...sc, padding:'0.2rem 0.6rem', borderRadius:'999px', fontSize:'0.72rem', fontWeight:'600' }}>
                        {job.status === 'waiting' ? 'Menunggu' : job.status === 'in_progress' ? 'Dikerjakan' : 'Selesai'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:'0.375rem' }}>
                        {job.status === 'waiting' && (
                          <button onClick={() => updateJobStatus(job.id,'in_progress')}
                            style={{ padding:'0.25rem 0.625rem', background:'#fef3c7', color:'#92400e', border:'none', borderRadius:'0.375rem', fontSize:'0.72rem', fontWeight:'600', cursor:'pointer' }}>
                            Mulai
                          </button>
                        )}
                        {job.status === 'in_progress' && (
                          <button onClick={() => updateJobStatus(job.id,'done')}
                            style={{ padding:'0.25rem 0.625rem', background:'#d1fae5', color:'#065f46', border:'none', borderRadius:'0.375rem', fontSize:'0.72rem', fontWeight:'600', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.2rem' }}>
                            <CheckCircle2 size={11}/> Selesai
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
