'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import DateRangePicker from '@/components/ui/DateRangePicker'
import ReportPDFButton from '@/components/ui/ReportPDFButton'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function LabaRugiPage() {
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState('2099-12-31')
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<any[]>([])

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .in('type', ['revenue', 'expense'])
      .order('code')
    setAccounts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const revenues = accounts.filter(a => a.type === 'revenue')
  const expenses = accounts.filter(a => a.type === 'expense')
  const totalRevenue = revenues.reduce((s, a) => s + (a.balance ?? 0), 0)
  const totalExpense = expenses.reduce((s, a) => s + (a.balance ?? 0), 0)
  const profit = totalRevenue - totalExpense

  function downloadPDF() {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Laporan Laba Rugi', 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 28)
    doc.text('Profit & Loss Statement', 14, 34)

    autoTable(doc, {
      startY: 40,
      head: [['Kode', 'Nama Akun', 'Saldo']],
      headStyles: { fillColor: [34, 197, 94] },
      body: revenues.map(a => [a.code, a.name, formatRp(a.balance ?? 0)]),
      foot: [['', 'TOTAL PENDAPATAN', formatRp(totalRevenue)]],
      footStyles: { fillColor: [220, 252, 231], textColor: [22, 101, 52], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 80 }, 2: { cellWidth: 50, halign: 'right' } },
    })

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Kode', 'Nama Akun', 'Saldo']],
      headStyles: { fillColor: [220, 38, 38] },
      body: expenses.map(a => [a.code, a.name, formatRp(a.balance ?? 0)]),
      foot: [['', 'TOTAL BIAYA', formatRp(totalExpense)]],
      footStyles: { fillColor: [254, 242, 242], textColor: [153, 27, 27], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 80 }, 2: { cellWidth: 50, halign: 'right' } },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFillColor(profit >= 0 ? 34 : 220, profit >= 0 ? 197 : 38, profit >= 0 ? 94 : 38)
    doc.rect(14, finalY, 180, 18, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(255, 255, 255)
    doc.text('LABA/RUGI PERIODE', 20, finalY + 7)
    doc.text(formatRp(profit), 194 - doc.getTextWidth(formatRp(profit)) / 2, finalY + 13)

    doc.save(`laba-rugi-${startDate}-${endDate}.pdf`)
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Laporan Laba Rugi</h1>
          <p className="page-subtitle">Profit & Loss statement</p>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.875rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#dcfce7' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#166534' }}>PENDAPATAN</h2>
          </div>
          <div className="data-table">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
            ) : (
              <table>
                <tbody>
                  {revenues.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: '500' }}>{a.code} {a.name}</td>
                      <td style={{ textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>{formatRp(a.balance ?? 0)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                    <td style={{ fontWeight: '800' }}>TOTAL PENDAPATAN</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#16a34a' }}>{formatRp(totalRevenue)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.875rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#fef2f2' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#991b1b' }}>BIAYA</h2>
          </div>
          <div className="data-table">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
            ) : (
              <table>
                <tbody>
                  {expenses.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: '500' }}>{a.code} {a.name}</td>
                      <td style={{ textAlign: 'right', fontWeight: '600', color: '#dc2626' }}>{formatRp(a.balance ?? 0)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                    <td style={{ fontWeight: '800' }}>TOTAL BIAYA</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#dc2626' }}>{formatRp(totalExpense)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', background: '#1a0a00', borderRadius: '0.875rem', padding: '1.5rem', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>LABA/RUGI PERIODE</span>
          <span style={{ fontSize: '1.5rem', fontWeight: '800', color: profit >= 0 ? '#4ade80' : '#f87171' }}>{formatRp(profit)}</span>
        </div>
      </div>
    </div>
  )
}
