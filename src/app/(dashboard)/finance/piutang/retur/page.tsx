'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { RotateCcw, Search } from 'lucide-react'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

interface Retur {
  id: string
  piutang_id: string
  return_amount: number
  return_date: string
  reason: string
  status: string
  piutang?: { customer: { name: string }; invoice_number: string; amount: number }
}

export default function ReturPage() {
  const [retur, setRetur] = useState<Retur[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    // Simplified - show return transactions
    const { data } = await supabase
      .from('piutang')
      .select('*, customer:customers(name)')
      .gt('return_amount', 0)
      .order('created_at', { ascending: false })
    setRetur((data as any[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div>
      <PageHeader title="Retur Piutang" subtitle="Daftar retur piutang pelanggan" />

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
        ) : retur.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <RotateCcw size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada retur</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Invoice</th>
                <th>Nilai Retur</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {retur.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: '500' }}>{r.piutang?.customer?.name ?? '—'}</td>
                  <td style={{ fontFamily: 'monospace' }}>{r.piutang?.invoice_number ?? '—'}</td>
                  <td style={{ fontWeight: '600', color: '#dc2626', textAlign: 'right' }}>
                    {formatRp(r.return_amount ?? 0)}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: '#fef3c7',
                        color: '#92400e'
                      }}
                    >
                      Retur
                    </span>
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
