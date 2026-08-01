'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CheckCircle2 } from 'lucide-react'

export default function PenjahitHistoryPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) {
        setJobs([])
        setLoading(false)
        return
      }
      // Note: Tidak ada FK production_jobs -> order_items (fix: pakai nested via order)
      // Note: Tidak ada FK production_jobs -> production_reports (setelah migration 046, ada)
      //       Tapi kita tidak perlu relasi reports di sini — meter_* sudah ada di production_jobs
      const { data, error } = await supabase
        .from('production_jobs')
        .select(
          '*, order:orders(id, order_number, customer:customers(name), order_items(id, size, product:products(name)))'
        )
        .eq('penjahit_id', user.id)
        .eq('status', 'done')
        .order('completed_at', { ascending: false })
      if (error) {
        console.error('[Penjahit History] Query error:', error)
        alert('⚠️ Gagal load history: ' + error.message)
      }
      setJobs(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <PageHeader title="Riwayat Pekerjaan" subtitle="Semua job yang sudah selesai dikerjakan" />

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : jobs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <CheckCircle2 size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada riwayat pekerjaan</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Selesai</th>
                <th>Produk</th>
                <th>Pelanggan</th>
                <th>Ukuran</th>
                <th>Gorden</th>
                <th>Vitras</th>
                <th>Roman</th>
                <th>Kupu²</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                // order_items nested di order.order_items (array, bukan single object)
                const firstItem = job.order?.order_items?.[0]
                const productName = firstItem?.product?.name ?? firstItem?.custom_specs
                const itemSize = firstItem?.size
                return (
                  <tr key={job.id}>
                    <td style={{ color: 'var(--neutral-600)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {job.completed_at
                        ? new Date(job.completed_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })
                        : '—'}
                    </td>
                    <td style={{ fontWeight: '500' }}>{productName ?? '—'}</td>
                    <td>{job.order?.customer?.name ?? '—'}</td>
                    <td style={{ color: 'var(--neutral-600)', fontSize: '0.8rem' }}>{itemSize ?? '—'}</td>
                    <td>{Number(job.meter_gorden ?? 0).toFixed(2)}m</td>
                    <td>{Number(job.meter_vitras ?? 0).toFixed(2)}m</td>
                    <td>{Number(job.meter_roman ?? 0).toFixed(2)}m</td>
                    <td>{Number(job.meter_kupu_kupu ?? 0).toFixed(2)}m</td>
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
