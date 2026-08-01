'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import BackButton from '@/components/ui/BackButton'
import DateRangePicker from '@/components/ui/DateRangePicker'
import ReportPDFButton from '@/components/ui/ReportPDFButton'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

function formatDateDisplay(dateStr: string) {
  if (!dateStr || dateStr === '2099-12-31') return 'Semua'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function NeracaPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState('2099-12-31')

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('accounts').select('*').order('code')
    setAccounts(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const assets = accounts.filter((a) => a.type === 'asset')
  const liabilities = accounts.filter((a) => a.type === 'liability')
  const equities = accounts.filter((a) => a.type === 'equity')
  const totalAssets = assets.reduce((s, a) => s + (a.balance ?? 0), 0)
  const totalLiabilities = liabilities.reduce((s, a) => s + (a.balance ?? 0), 0)
  const totalEquity = equities.reduce((s, a) => s + (a.balance ?? 0), 0)

  function downloadPDF() {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('KJ Homedecor - Laporan Neraca', 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode: ${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`, 14, 28)
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, 34)

    autoTable(doc, {
      startY: 40,
      head: [['Kode', 'Nama Akun', 'Tipe', 'Saldo']],
      body: [
        ...assets.map((a) => [a.code, a.name, 'Aset', formatRp(a.balance ?? 0)]),
        [{ content: 'TOTAL ASET', colSpan: 3, styles: { fontStyle: 'bold' } }, formatRp(totalAssets)]
      ],
      theme: 'striped',
      headStyles: { fillColor: [204, 112, 48] }
    })

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Kode', 'Nama Akun', 'Tipe', 'Saldo']],
      body: [
        ...liabilities.map((a) => [a.code, a.name, 'Liabilitas', formatRp(a.balance ?? 0)]),
        [{ content: 'TOTAL LIABILITAS', colSpan: 3, styles: { fontStyle: 'bold' } }, formatRp(totalLiabilities)]
      ],
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38] }
    })

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Kode', 'Nama Akun', 'Tipe', 'Saldo']],
      body: [
        ...equities.map((a) => [a.code, a.name, 'Ekuitas', formatRp(a.balance ?? 0)]),
        [{ content: 'TOTAL EKUITAS', colSpan: 3, styles: { fontStyle: 'bold' } }, formatRp(totalEquity)]
      ],
      theme: 'striped',
      headStyles: { fillColor: [22, 163, 74] }
    })

    doc.save(`neraca-${startDate}-${endDate}.pdf`)
  }

  return (
    <div>
      <BackButton href="/finance/laporan" />
      <PageHeader
        title="Laporan Neraca"
        subtitle="Laporan posisi keuangan (Aset, Liabilitas, Ekuitas)"
        action={<ReportPDFButton onClick={downloadPDF} disabled={loading} />}
      />

      <div className="section-card">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
        />
      </div>

      <div
        className="chart-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}
      >
        {/* ASSETS */}
        <div
          className="chart-card"
          style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.875rem', overflow: 'hidden' }}
        >
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#fef3c7' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#92400e' }}>ASET</h2>
          </div>
          <div className="data-table">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
            ) : (
              <table>
                <tbody>
                  {assets.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: '500' }}>
                        {a.code} {a.name}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatRp(a.balance ?? 0)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                    <td style={{ fontWeight: '700' }}>TOTAL ASET</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#92400e' }}>{formatRp(totalAssets)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* LIABILITIES + EQUITY */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.875rem', overflow: 'hidden' }}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#fef3c7' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#dc2626' }}>LIABILITAS</h2>
            </div>
            <div className="data-table">
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
              ) : (
                <table>
                  <tbody>
                    {liabilities.map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: '500' }}>
                          {a.code} {a.name}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatRp(a.balance ?? 0)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                      <td style={{ fontWeight: '700' }}>TOTAL</td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: '#dc2626' }}>
                        {formatRp(totalLiabilities)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div
            style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.875rem', overflow: 'hidden' }}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#d1fae5' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#065f46' }}>EKUITAS</h2>
            </div>
            <div className="data-table">
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
              ) : (
                <table>
                  <tbody>
                    {equities.map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: '500' }}>
                          {a.code} {a.name}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatRp(a.balance ?? 0)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                      <td style={{ fontWeight: '700' }}>TOTAL</td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: '#16a34a' }}>
                        {formatRp(totalEquity)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
