'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { RefreshCw, Search } from 'lucide-react'

export default function ProcessReturPage() {
  const [piutang, setPiutang] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('piutang')
      .select('*, customer:customers(name)')
      .order('created_at', { ascending: false })
    setPiutang(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div>
      <PageHeader title="Proses Retur" subtitle="Proses retur piutang" />

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
        ) : piutang.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <RefreshCw size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada data</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Invoice</th>
                <th>Jumlah</th>
                <th>Retur</th>
                <th>Sisa</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {piutang.map((p) => {
                const sisa = (p.amount ?? 0) - (p.paid_amount ?? 0) - (p.return_amount ?? 0)
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: '500' }}>{p.customer?.name ?? '—'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{p.invoice_number ?? '—'}</td>
                    <td style={{ textAlign: 'right' }}>{p.amount ?? 0}</td>
                    <td style={{ color: '#dc2626', textAlign: 'right' }}>{p.return_amount ?? 0}</td>
                    <td style={{ fontWeight: '600', textAlign: 'right' }}>{sisa}</td>
                    <td>
                      <button
                        style={{
                          padding: '0.25rem 0.625rem',
                          background: '#3b82f6',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Proses Retur
                      </button>
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
