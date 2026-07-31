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

export default function BukuBesarPage() {
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState('2099-12-31')
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<any[]>([])

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

  function downloadPDF() {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Buku Besar', 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode: ${startDate} - ${endDate}`, 14, 28)

    autoTable(doc, {
      startY: 35,
      head: [['Kode', 'Nama Akun', 'Tipe', 'Saldo']],
      headStyles: { fillColor: [37, 99, 235] },
      body: accounts.map((a) => [a.code, a.name, a.type ?? '—', formatRp(a.balance ?? 0)])
    })

    doc.save(`buku-besar-${startDate}-${endDate}.pdf`)
  }

  return (
    <div>
      <BackButton href="/finance/laporan" />
      <PageHeader
        title="Buku Besar"
        subtitle="General ledger per akun"
        action={<ReportPDFButton onClick={downloadPDF} label="Download PDF" />}
      />

      <div className="section-card">
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
        ) : accounts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Belum ada data akun</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Akun</th>
                <th>Tipe</th>
                <th style={{ textAlign: 'right' }}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{a.code}</td>
                  <td style={{ fontWeight: '500' }}>{a.name}</td>
                  <td style={{ textTransform: 'capitalize', color: '#6b7280' }}>{a.type}</td>
                  <td style={{ fontWeight: '700', textAlign: 'right', color: '#cc7030' }}>
                    {formatRp(a.balance ?? 0)}
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
