'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchAccountBalances } from '@/lib/ledger'
import BackButton from '@/components/ui/BackButton'
import DateRangePicker from '@/components/ui/DateRangePicker'
import ReportPDFButton from '@/components/ui/ReportPDFButton'
import { createReportDoc, addReportTable, addPageNumbers } from '@/lib/report-pdf'
import { formatRp } from '@/lib/utils'


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

export default function LabaRugiPage({ variant = 'finance' }: { variant?: 'finance' | 'owner' } = {}) {
  const isOwner = variant === 'owner'
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState('2099-12-31')
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<LooseRow[]>([])

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await fetchAccountBalances(supabase, startDate, endDate, ['revenue', 'expense'])
    setAccounts((data ?? []) as LooseRow[])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  const revenues = accounts.filter((a) => a.type === 'revenue')
  const expenses = accounts.filter((a) => a.type === 'expense')
  const totalRevenue = revenues.reduce((s, a) => s + (a.balance ?? 0), 0)
  const totalExpense = expenses.reduce((s, a) => s + (a.balance ?? 0), 0)
  const profit = totalRevenue - totalExpense

  function downloadPDF() {
    const { doc, startY } = createReportDoc({
      title: `Laporan Laba Rugi${isOwner ? ' (Owner)' : ''}`,
      period: `${startDate} s/d ${endDate}`,
      subtitle: 'Pendapatan dan biaya periode'
    })
    let y = startY

    // Pendapatan
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('PENDAPATAN', 14, y)
    y += 4
    y = addReportTable(doc, {
      startY: y,
      head: [['Kode', 'Nama Akun', 'Saldo']],
      body: revenues.map((a) => [a.code ?? '', a.name ?? '', formatRp(a.balance ?? 0)]),
      foot: [['', 'TOTAL PENDAPATAN', formatRp(totalRevenue)]],
      theme: 'striped',
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 80 }, 2: { cellWidth: 50, halign: 'right' } }
    })
    y += 8

    // Biaya
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('BIAYA', 14, y)
    y += 4
    y = addReportTable(doc, {
      startY: y,
      head: [['Kode', 'Nama Akun', 'Saldo']],
      body: expenses.map((a) => [a.code ?? '', a.name ?? '', formatRp(a.balance ?? 0)]),
      foot: [['', 'TOTAL BIAYA', formatRp(totalExpense)]],
      theme: 'striped',
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 80 }, 2: { cellWidth: 50, halign: 'right' } }
    })
    y += 10

    // LABA/RUGI PERIODE
    doc.setFillColor(profit >= 0 ? 34 : 220, profit >= 0 ? 197 : 38, profit >= 0 ? 94 : 38)
    doc.rect(14, y, 180, 18, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(255, 255, 255)
    doc.text(profit >= 0 ? 'LABA PERIODE' : 'RUGI PERIODE', 20, y + 7)
    doc.text(formatRp(profit), 194 - doc.getTextWidth(formatRp(profit)) / 2, y + 13)

    addPageNumbers(doc)
    doc.save(`${isOwner ? 'owner-' : ''}laba-rugi-${startDate}-${endDate}.pdf`)
  }

  return (
    <div>
      <BackButton href={isOwner ? '/owner/laporan' : '/finance/laporan'} />
      <PageHeader
        title="Laporan Laba Rugi"
        subtitle={`Profit & Loss statement${isOwner ? ' - Tampilan Owner (Read Only)' : ''}`}
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginTop: '1.5rem'
        }}
      >
        <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.875rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#dcfce7' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#166534' }}>PENDAPATAN</h2>
          </div>
          <div className="data-table">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
            ) : (
              <table>
                <tbody>
                  {revenues.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: '500' }}>
                        {a.code} {a.name}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>
                        {formatRp(a.balance ?? 0)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                    <td style={{ fontWeight: '800' }}>TOTAL PENDAPATAN</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#16a34a' }}>
                      {formatRp(totalRevenue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.875rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#fef2f2' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#991b1b' }}>BIAYA</h2>
          </div>
          <div className="data-table">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
            ) : (
              <table>
                <tbody>
                  {expenses.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: '500' }}>
                        {a.code} {a.name}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '600', color: '#dc2626' }}>
                        {formatRp(a.balance ?? 0)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                    <td style={{ fontWeight: '800' }}>TOTAL BIAYA</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#dc2626' }}>
                      {formatRp(totalExpense)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: '1.5rem',
          background: '#1a0a00',
          borderRadius: '0.875rem',
          padding: '1.5rem',
          color: '#fff'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>LABA/RUGI PERIODE</span>
          <span style={{ fontSize: '1.5rem', fontWeight: '800', color: profit >= 0 ? '#4ade80' : '#f87171' }}>
            {formatRp(profit)}
          </span>
        </div>
      </div>
    </div>
  )
}
