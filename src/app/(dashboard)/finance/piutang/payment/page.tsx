'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { DollarSign, Search } from 'lucide-react'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function PaymentPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('payments')
      .select('*, customer:customers(name), staff:users(name)')
      .order('created_at', { ascending: false })
      .limit(50)
    setPayments(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div>
      <PageHeader title="Pembayaran Piutang" subtitle="Riwayat pembayaran piutang" />

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : payments.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <DollarSign size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada pembayaran</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Customer</th>
                <th>Jumlah</th>
                <th>Tipe</th>
                <th>Staff</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--neutral-600)' }}>{new Date(p.created_at).toLocaleDateString('id-ID')}</td>
                  <td style={{ fontWeight: '500' }}>{p.customer?.name ?? '—'}</td>
                  <td style={{ fontWeight: '600', color: '#16a34a', textAlign: 'right' }}>{formatRp(p.amount ?? 0)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{p.type ?? 'dp'}</td>
                  <td style={{ color: 'var(--neutral-600)' }}>{p.staff?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
