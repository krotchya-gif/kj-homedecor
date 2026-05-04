'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { CheckCircle2, Clock, Layers, ExternalLink, UserPlus, X } from 'lucide-react'

const STATUS_COLORS: Record<string,{bg:string,text:string}> = {
  waiting:     {bg:'#fef2f2',text:'#991b1b'},
  in_progress: {bg:'#fef3c7',text:'#92400e'},
  done:        {bg:'#d1fae5',text:'#065f46'},
}

interface UserType { id: string; name: string; role: string }

export default function GudangProductionPage() {
  const [jobs, setJobs]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('')
  const [penjahits, setPenjahits] = useState<UserType[]>([])
  const [assignJob, setAssignJob] = useState<any|null>(null)
  const [assigning, setAssigning] = useState(false)
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const [{ data }, { data: penjahitData }] = await Promise.all([
      supabase
        .from('production_jobs')
        .select('*, order:orders(id, customer:customers(name)), penjahit:users(name)')
        .order('created_at', { ascending: false }),
      supabase.from('users').select('id, name, role').eq('role', 'penjahit'),
    ])
    setJobs(data ?? [])
    setPenjahits((penjahitData ?? []) as UserType[])
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

  async function handleAssignPenjahit(penjahitId: string) {
    if (!assignJob) return
    setAssigning(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('production_jobs').update({ penjahit_id: penjahitId }).eq('id', assignJob.id)
    const selectedPenjahit = penjahits.find((p: UserType) => p.id === penjahitId)
    await supabase.from('order_logs').insert({
      order_id: assignJob.order_id,
      action: 'penjahit_assigned',
      notes: `Job diserahkan ke penjahit: ${selectedPenjahit?.name ?? penjahitId}`,
      staff_id: user?.id ?? null,
    })
    setAssigning(false)
    setAssignJob(null)
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
                        {job.status === 'waiting' && !job.penjahit_id && (
                          <button onClick={() => setAssignJob(job)}
                            style={{ padding:'0.25rem 0.625rem', background:'#e0e7ff', color:'#3730a3', border:'none', borderRadius:'0.375rem', fontSize:'0.72rem', fontWeight:'600', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.2rem' }}>
                            <UserPlus size={11}/> Beri Penjahit
                          </button>
                        )}
                        {job.status === 'waiting' && job.penjahit_id && (
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

      {/* Assign Penjahit Modal */}
      {assignJob && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setAssignJob(null) }}>
          <div style={{ background:'#fff', borderRadius:'0.875rem', padding:'2rem', width:'100%', maxWidth:420, boxShadow:'0 25px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
              <h2 style={{ fontSize:'1.1rem', fontWeight:'700', margin:0 }}>Serahkan ke Penjahit</h2>
              <button onClick={() => setAssignJob(null)} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={20}/></button>
            </div>
            <p style={{ fontSize:'0.875rem', color:'#6b7280', marginBottom:'1.25rem' }}>
              Pilih penjahit untuk job: <strong>{assignJob.order?.customer?.name ?? assignJob.order_id?.slice(0,8)}</strong>
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
              {penjahits.length === 0 ? (
                <p style={{ color:'#9ca3af', fontSize:'0.875rem' }}>Tidak ada penjahit tersedia</p>
              ) : (
                penjahits.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleAssignPenjahit(p.id)}
                    disabled={assigning}
                    style={{ display:'flex', alignItems:'center', gap:'0.625rem', padding:'0.875rem', border:`2px solid ${'#e5e7eb'}`, borderRadius:'0.5rem', background:'#fff', cursor:'pointer', textAlign:'left' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'#16a34a20', color:'#16a34a', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', fontSize:'0.9rem', flexShrink:0 }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight:'600', fontSize:'0.875rem', color:'#1f2937' }}>{p.name}</div>
                      <div style={{ fontSize:'0.75rem', color:'#9ca3af' }}>Penjahit</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
