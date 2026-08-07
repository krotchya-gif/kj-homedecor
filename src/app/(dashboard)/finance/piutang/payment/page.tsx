'use client'
import MobileCards from '@/components/ui/MobileCards'
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
      .select('*, order:orders(customer:customers(name)), staff:users(name)')
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

            {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : payments.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={payments} keyOf={(p: any) => p.id} renderCard={(p: any) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Tanggal</span>
                  <span className="mobile-card-value">{p.payment_date ?? p.created_at}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Jumlah</span>
                  <span className="mobile-card-value">{p.amount}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Catatan</span>
                  <span className="mobile-card-value">{p.notes}</span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
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
                  <td style={{ fontWeight: '500' }}>{p.order?.customer?.name ?? '—'}</td>
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
