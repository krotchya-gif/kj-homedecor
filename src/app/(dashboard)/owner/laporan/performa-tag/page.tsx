'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import BackButton from '@/components/ui/BackButton'
import DateRangePicker from '@/components/ui/DateRangePicker'
import ReportPDFButton from '@/components/ui/ReportPDFButton'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function PerformaTagPage() {
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState('2099-12-31')
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('source_tag, total_amount, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59')
      .order('created_at', { ascending: false })
      .limit(500)
    setOrders(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  // Group by source_tag
  const tagStats = orders.reduce((acc: any, o) => {
    const tag = o.source_tag ?? 'Tanpa Tag'
    if (!acc[tag]) acc[tag] = { count: 0, total: 0 }
    acc[tag].count++
    acc[tag].total += o.total_amount ?? 0
    return acc
  }, {})

  const tagData = Object.entries(tagStats)
    .map(([tag, stats]: [string, any]) => ({
      tag,
      count: stats.count,
      total: stats.total
    }))
    .sort((a, b) => b.total - a.total)

  const grandTotal = tagData.reduce((s, d) => s + d.total, 0)
  const grandCount = tagData.reduce((s, d) => s + d.count, 0)

  function downloadPDF() {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Performa Per Tag (Owner)', 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 28)
    doc.text('Ringkasan Laba Rugi per Tag/Marketplace', 14, 34)

    autoTable(doc, {
      startY: 40,
      head: [['Tag/Platform', 'Jumlah Order', 'Total Revenue']],
      headStyles: { fillColor: [236, 72, 153] },
      body: tagData.map((d) => [d.tag, d.count.toString(), formatRp(d.total)]),
      foot: [['TOTAL', grandCount.toString(), formatRp(grandTotal)]],
      footStyles: { fillColor: [253, 242, 252], textColor: [131, 24, 67], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 50, halign: 'right' }
      }
    })

    doc.save(`owner-performa-tag-${startDate}-${endDate}.pdf`)
  }

  return (
    <div>
      <BackButton href="/owner/laporan" />
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h1 className="page-title">Performa Per Tag</h1>
          <p className="page-subtitle">Ringkasan laba rugi per tag/marketplace - Tampilan Owner (Read Only)</p>
        </div>
        <ReportPDFButton onClick={downloadPDF} label="Download PDF" />
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}
      >
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
        ) : tagData.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Belum ada data order</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tag/Platform</th>
                <th style={{ textAlign: 'right' }}>Jumlah Order</th>
                <th style={{ textAlign: 'right' }}>Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {tagData.map((d) => (
                <tr key={d.tag}>
                  <td style={{ fontWeight: '600' }}>{d.tag}</td>
                  <td style={{ textAlign: 'right', color: '#6b7280' }}>{d.count}</td>
                  <td style={{ fontWeight: '700', textAlign: 'right', color: '#cc7030' }}>{formatRp(d.total)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #e5e7eb', background: '#fdf2f8' }}>
                <td style={{ fontWeight: '800' }}>TOTAL</td>
                <td style={{ fontWeight: '800', textAlign: 'right', color: '#6b7280' }}>{grandCount}</td>
                <td style={{ fontWeight: '800', textAlign: 'right', color: '#db2777' }}>{formatRp(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
