'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import DateRangePicker from '@/components/ui/DateRangePicker'
import ReportPDFButton from '@/components/ui/ReportPDFButton'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function KronologiHPPPage() {
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState('2099-12-31')
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('order_number, created_at, total_amount, payment_status')
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59')
      .order('created_at', { ascending: false })
      .limit(200)
    setOrders(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [startDate, endDate])

  function downloadPDF() {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Kronologi HPP', 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 28)
    doc.text('Harga Pokok Penjualan per Periode', 14, 34)

    autoTable(doc, {
      startY: 40,
      head: [['Order ID', 'Tanggal', 'Total', 'Status']],
      headStyles: { fillColor: [217, 119, 6] },
      body: orders.map(o => [
        o.order_number ?? o.id.slice(0, 8),
        new Date(o.created_at).toLocaleDateString('id-ID'),
        formatRp(o.total_amount ?? 0),
        o.payment_status ?? '—',
      ]),
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold' },
        1: { cellWidth: 35 },
        2: { cellWidth: 45, halign: 'right' },
        3: { cellWidth: 45 },
      },
    })

    doc.save(`kronologi-hpp-${startDate}-${endDate}.pdf`)
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Kronologi HPP</h1>
          <p className="page-subtitle">Harga pokok penjualan per periode</p>
        </div>
        <ReportPDFButton onClick={downloadPDF} label="Download PDF" />
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
        />
      </div>

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Belum ada data order</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Tanggal</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{o.order_number ?? o.id.slice(0, 8)}</td>
                  <td style={{ color: '#6b7280' }}>{new Date(o.created_at).toLocaleDateString('id-ID')}</td>
                  <td style={{ fontWeight: '600', textAlign: 'right', color: '#cc7030' }}>{formatRp(o.total_amount ?? 0)}</td>
                  <td>
                    <span style={{
                      padding: '0.25rem 0.625rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: o.payment_status === 'paid' ? '#dcfce7' : o.payment_status === 'pending' ? '#fef9c3' : '#f3f4f6',
                      color: o.payment_status === 'paid' ? '#166534' : o.payment_status === 'pending' ? '#854d0e' : '#6b7280',
                    }}>
                      {o.payment_status ?? '—'}
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
