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

interface LooseRow {
  id?: string
  code?: string
  name?: string
  type?: string
  balance?: number
  date?: string
  entry_date?: string
  created_at?: string
  description?: string
  notes?: string
  reference_type?: string
  debit?: number
  credit?: number
  total_debit?: number
  total_credit?: number
  total?: number
  amount?: number
  qty?: number
  status?: string
  order_number?: string
  payment_status?: string
  total_amount?: number
  total_price?: number
  supplier_name?: string
  stock_gudang?: number
  min_stock_level?: number
  cost_per_unit?: number
  unit?: string
  bank_name?: string
  account_number?: string
  account_holder?: string
  account?: { code?: string; name?: string } | null
  [k: string]: unknown
}

export default function MutasiKasPage() {
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState('2099-12-31')
  const [loading, setLoading] = useState(true)
  const [cashAccounts, setCashAccounts] = useState<LooseRow[]>([])

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('cash_accounts').select('*, account:accounts(code, name)').order('bank_name')
    setCashAccounts((data ?? []) as LooseRow[])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const totalBalance = cashAccounts.reduce((s, c) => s + (c.balance ?? 0), 0)

  function downloadPDF() {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Mutasi Kas & Bank (Owner)', 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 28)
    doc.text('Perubahan Saldo Kas dan Bank', 14, 34)

    autoTable(doc, {
      startY: 40,
      head: [['Kode', 'Bank', 'No. Rekening', 'Saldo']],
      headStyles: { fillColor: [20, 184, 166] },
      body: cashAccounts.map((c) => [
        c.account?.code ?? '—',
        c.bank_name ?? '—',
        c.account_number ?? '—',
        formatRp(c.balance ?? 0)
      ]),
      foot: [['', '', 'TOTAL', formatRp(totalBalance)]],
      footStyles: { fillColor: [240, 253, 250], textColor: [19, 78, 74], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold' },
        1: { cellWidth: 60 },
        2: { cellWidth: 45 },
        3: { cellWidth: 50, halign: 'right' }
      }
    })

    doc.save(`owner-mutasi-kas-${startDate}-${endDate}.pdf`)
  }

  return (
    <div>
      <BackButton href="/owner/laporan" />
      <PageHeader
        title="Mutasi Kas & Bank"
        subtitle="Perubahan saldo kas dan bank - Tampilan Owner (Read Only)"
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
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : cashAccounts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada akun kas/bank</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Bank</th>
                <th>No. Rekening</th>
                <th style={{ textAlign: 'right' }}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {cashAccounts.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{c.account?.code ?? '—'}</td>
                  <td style={{ fontWeight: '500' }}>{c.bank_name ?? '—'}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--neutral-600)' }}>{c.account_number ?? '—'}</td>
                  <td style={{ fontWeight: '700', textAlign: 'right', color: '#cc7030' }}>
                    {formatRp(c.balance ?? 0)}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                <td colSpan={3} style={{ fontWeight: '800' }}>
                  TOTAL
                </td>
                <td style={{ fontWeight: '800', textAlign: 'right', color: '#16a34a' }}>{formatRp(totalBalance)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
