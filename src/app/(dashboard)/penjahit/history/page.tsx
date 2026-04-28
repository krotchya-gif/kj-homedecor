'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CheckCircle2 } from 'lucide-react'

export default function PenjahitHistoryPage() {
  const [jobs, setJobs]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('production_jobs')
        .select('*, order:orders(customer:customers(name)), order_item:order_items(size, product:products(name)), reports:production_reports(*)')
        .eq('penjahit_id', user?.id ?? '')
        .eq('status', 'done')
        .order('completed_at', { ascending: false })
      setJobs(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Riwayat Pekerjaan</h1>
        <p className="page-subtitle">Semua job yang sudah selesai dikerjakan</p>
      </div>

      <div className="data-table">
        {loading ? (
          <div style={{ padding:'2rem', textAlign:'center', color:'#9ca3af' }}>Memuat...</div>
        ) : jobs.length === 0 ? (
          <div style={{ padding:'3rem', textAlign:'center', color:'#9ca3af' }}>
            <CheckCircle2 size={32} style={{ opacity:0.3, margin:'0 auto 0.75rem' }}/>
            <p>Belum ada riwayat pekerjaan</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Selesai</th><th>Produk</th><th>Pelanggan</th><th>Ukuran</th><th>Gorden</th><th>Vitras</th><th>Roman</th><th>Kupu²</th></tr>
            </thead>
            <tbody>
              {jobs.map(job => {
                const rep = (job.reports ?? [])[0]
                return (
                  <tr key={job.id}>
                    <td style={{ color:'#6b7280', fontSize:'0.8rem', whiteSpace:'nowrap' }}>
                      {job.completed_at ? new Date(job.completed_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                    </td>
                    <td style={{ fontWeight:'500' }}>{job.order_item?.product?.name ?? '—'}</td>
                    <td>{job.order?.customer?.name ?? '—'}</td>
                    <td style={{ color:'#6b7280', fontSize:'0.8rem' }}>{job.order_item?.size ?? '—'}</td>
                    <td>{Number(rep?.meter_gorden    ?? job.meter_gorden    ?? 0).toFixed(2)}m</td>
                    <td>{Number(rep?.meter_vitras    ?? job.meter_vitras    ?? 0).toFixed(2)}m</td>
                    <td>{Number(rep?.meter_roman     ?? job.meter_roman     ?? 0).toFixed(2)}m</td>
                    <td>{Number(rep?.meter_kupu_kupu ?? job.meter_kupu_kupu ?? 0).toFixed(2)}m</td>
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
