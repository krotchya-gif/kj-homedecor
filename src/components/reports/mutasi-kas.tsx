'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import BackButton from '@/components/ui/BackButton'
import DateRangePicker from '@/components/ui/DateRangePicker'
import ReportPDFButton from '@/components/ui/ReportPDFButton'
import { formatRp } from '@/lib/utils'
import { createReportDoc, addReportTable, addPageNumbers } from '@/lib/report-pdf'


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

export default function MutasiKasPage({ variant = 'finance' }: { variant?: 'finance' | 'owner' } = {}) {
  const isOwner = variant === 'owner'
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState('2099-12-31')
  const [loading, setLoading] = useState(true)
  const [cashAccounts, setCashAccounts] = useState<LooseRow[]>([])

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('cash_accounts').select('*, account:accounts(code, name)').order('bank_name')
    const cash = (data ?? []) as LooseRow[]

    // F-33 fix: saldo LIVE dari journal_lines (bukan kolom balance yang sering basi).
    // Saldo per akun kas = Σdebit − Σcredit baris jurnal akun tsb (normal debit).
    const accountIds = cash.map((c) => c.account_id).filter(Boolean) as string[]
    let lines: { account_id: string; debit: number; credit: number }[] = []
    if (accountIds.length > 0) {
      const { data: journalLines } = await supabase
        .from('journal_lines')
        .select('account_id, debit, credit, entry:journal_entries!inner(entry_date)')
        .in('account_id', accountIds)
        .gte('entry.entry_date', startDate)
        .lte('entry.entry_date', endDate)
      lines = (journalLines ?? []) as { account_id: string; debit: number; credit: number }[]
    }
    const sums = new Map<string, number>()
    for (const l of lines) {
      sums.set(l.account_id, (sums.get(l.account_id) ?? 0) + (Number(l.debit) - Number(l.credit)))
    }
    const withBalance = cash.map((c) => ({ ...c, balance: sums.get(String(c.account_id)) ?? 0 }))
    setCashAccounts(withBalance)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  const totalBalance = cashAccounts.reduce((s, c) => s + (c.balance ?? 0), 0)

  async function downloadPDF() {
    const { doc, startY } = await createReportDoc({
      title: `Mutasi Kas & Bank${isOwner ? ' (Owner)' : ''}`,
      period: `${startDate} s/d ${endDate}`,
      subtitle: 'Perubahan saldo kas dan bank'
    })

    addReportTable(doc, {
      startY,
      head: [['Kode', 'Bank', 'No. Rekening', 'Saldo']],
      body: cashAccounts.map((c) => [
        c.account?.code ?? '—',
        c.bank_name ?? '—',
        c.account_number ?? '—',
        formatRp(c.balance ?? 0)
      ]),
      foot: [['', '', 'TOTAL', formatRp(totalBalance)]],
      theme: 'striped',
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold' },
        1: { cellWidth: 60 },
        2: { cellWidth: 45 },
        3: { cellWidth: 50, halign: 'right' }
      }
    })

    await addPageNumbers(doc)
    doc.save(`${isOwner ? 'owner-' : ''}mutasi-kas-${startDate}-${endDate}.pdf`)
  }

  return (
    <div>
      <BackButton href={isOwner ? '/owner/laporan' : '/finance/laporan'} />
      <PageHeader
        title="Mutasi Kas & Bank"
        subtitle={`Perubahan saldo kas dan bank${isOwner ? ' - Tampilan Owner (Read Only)' : ''}`}
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
