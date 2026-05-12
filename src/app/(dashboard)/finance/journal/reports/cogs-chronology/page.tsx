'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Download, TrendingUp } from 'lucide-react'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function COGSChronologyPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('order_number, created_at, total_amount, hpp_calculated:products(harga_jual)')
      .order('created_at', { ascending: false })
      .limit(100)
    setOrders(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  function downloadPDF() {
    alert('PDF download - implement dengan jspdf atau @react-pdf/renderer')
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Kronologi HPP</h1>
          <p className="page-subtitle">Harga pokok produksi per order</p>
        </div>
        <button onClick={downloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}>
          <Download size={16} /> Download PDF
        </button>
      </div>

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <TrendingUp size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada data</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Tanggal</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{o.order_number ?? o.id.slice(0, 8)}</td>
                  <td style={{ color: '#6b7280' }}>{new Date(o.created_at).toLocaleDateString('id-ID')}</td>
                  <td style={{ fontWeight: '600', textAlign: 'right', color: '#cc7030' }}>{formatRp(o.total_amount ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}