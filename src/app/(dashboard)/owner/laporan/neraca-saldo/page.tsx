'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchAccountBalances } from '@/lib/ledger'
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

export default function NeracaSaldoPage() {
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState('2099-12-31')
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<LooseRow[]>([])

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await fetchAccountBalances(supabase, startDate, endDate)
    setAccounts((data ?? []) as LooseRow[])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Debit: asset, expense | Credit: liability, equity, revenue
  const isDebit = (type: string) => type === 'asset' || type === 'expense'
  const isCredit = (type: string) => type === 'liability' || type === 'equity' || type === 'revenue'

  const totalDebit = accounts.filter((a) => isDebit(a.type ?? '')).reduce((s, a) => s + (a.balance ?? 0), 0)
  const totalCredit = accounts.filter((a) => isCredit(a.type ?? '')).reduce((s, a) => s + (a.balance ?? 0), 0)

  function downloadPDF() {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Neraca Saldo (Owner)', 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 28)
    doc.text('Daftar Aktivitas Akun (Format Debit-Kredit)', 14, 34)

    const body = accounts.map((a) => {
      const debit = isDebit(a.type ?? '') ? (a.balance ?? 0) : 0
      const credit = isCredit(a.type ?? '') ? (a.balance ?? 0) : 0
      return [a.code ?? '', a.name ?? '', debit > 0 ? formatRp(debit) : '', credit > 0 ? formatRp(credit) : '']
    })

    autoTable(doc, {
      startY: 40,
      head: [['Kode', 'Nama Akun', 'Debit', 'Kredit']],
      headStyles: { fillColor: [99, 102, 241] },
      body,
      foot: [['', 'TOTAL', formatRp(totalDebit), formatRp(totalCredit)]],
      footStyles: { fillColor: [238, 242, 255], textColor: [55, 48, 163], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold' },
        1: { cellWidth: 80 },
        2: { cellWidth: 45, halign: 'right' },
        3: { cellWidth: 45, halign: 'right' }
      }
    })

    doc.save(`owner-neraca-saldo-${startDate}-${endDate}.pdf`)
  }

  return (
    <div>
      <BackButton href="/owner/laporan" />
      <PageHeader
        title="Neraca Saldo"
        subtitle="Daftar aktivitas akun dalam format debit-kredit - Tampilan Owner (Read Only)"
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
        ) : accounts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data akun</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Akun</th>
                <th style={{ textAlign: 'right' }}>Debit</th>
                <th style={{ textAlign: 'right' }}>Kredit</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const debit = isDebit(a.type ?? '') ? (a.balance ?? 0) : 0
                const credit = isCredit(a.type ?? '') ? (a.balance ?? 0) : 0
                return (
                  <tr key={a.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{a.code}</td>
                    <td style={{ fontWeight: '500' }}>{a.name}</td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: debit > 0 ? '600' : '400',
                        color: debit > 0 ? '#16a34a' : 'var(--input-border)'
                      }}
                    >
                      {debit > 0 ? formatRp(debit) : '—'}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: credit > 0 ? '600' : '400',
                        color: credit > 0 ? '#dc2626' : 'var(--input-border)'
                      }}
                    >
                      {credit > 0 ? formatRp(credit) : '—'}
                    </td>
                  </tr>
                )
              })}
              <tr style={{ borderTop: '2px solid #e5e7eb', background: '#eef2ff' }}>
                <td colSpan={2} style={{ fontWeight: '800' }}>
                  TOTAL
                </td>
                <td style={{ fontWeight: '800', textAlign: 'right', color: '#4f46e5' }}>{formatRp(totalDebit)}</td>
                <td style={{ fontWeight: '800', textAlign: 'right', color: '#4f46e5' }}>{formatRp(totalCredit)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {!loading && accounts.length > 0 && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            background: Math.abs(totalDebit - totalCredit) < 1 ? '#dcfce7' : '#fef2f2',
            color: Math.abs(totalDebit - totalCredit) < 1 ? '#166534' : '#991b1b',
            fontWeight: '600',
            fontSize: '0.875rem'
          }}
        >
          {Math.abs(totalDebit - totalCredit) < 1
            ? 'Neraca saldo seimbang (Total Debit = Total Kredit)'
            : `Neraca saldo tidak seimbang (Selisih: ${formatRp(Math.abs(totalDebit - totalCredit))})`}
        </div>
      )}
    </div>
  )
}
