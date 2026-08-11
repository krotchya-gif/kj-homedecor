'use client'
import type { JournalEntry, JournalLine } from '@/types'
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

export default function DaftarJurnalPage() {
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState('2099-12-31')
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<JournalEntry[]>([])

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('journal_entries')
      .select('*, lines:journal_lines(*, account:accounts(code, name))')
      .gte('entry_date', startDate)
      .lte('entry_date', endDate)
      .order('entry_date', { ascending: false })
      .limit(100)
    setEntries(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  function downloadPDF() {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Daftar Jurnal', 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 28)
    doc.text('Journal Entries List', 14, 34)

    const tableBody: (string | number)[][] = []
    entries.forEach((e) => {
      e.lines?.forEach((line: JournalLine, idx: number) => {
        tableBody.push([
          idx === 0 ? (e.entry_date ?? '') : '',
          `${line.account?.code ?? ''} ${line.account?.name ?? ''}`,
          line.debit > 0 ? formatRp(line.debit) : '',
          line.credit > 0 ? formatRp(line.credit) : '',
          idx === 0 ? (e.description ?? '') : ''
        ])
      })
    })

    autoTable(doc, {
      startY: 40,
      head: [['Tanggal', 'Akun', 'Debit', 'Kredit', 'Deskripsi']],
      headStyles: { fillColor: [147, 51, 234] },
      body: tableBody,
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 55 },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 40 }
      }
    })

    doc.save(`daftar-jurnal-${startDate}-${endDate}.pdf`)
  }

  return (
    <div>
      <BackButton href="/finance/laporan" />
      <PageHeader
        title="Daftar Jurnal"
        subtitle="Journal entries list"
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
        ) : entries.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada journal entries</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Akun</th>
                <th style={{ textAlign: 'right' }}>Debit</th>
                <th style={{ textAlign: 'right' }}>Kredit</th>
                <th>Deskripsi</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) =>
                e.lines?.map((line: JournalLine, idx: number) => (
                  <tr key={`${e.id}-${idx}`}>
                    {idx === 0 && (
                      <td rowSpan={e.lines?.length ?? 1} style={{ color: 'var(--neutral-600)' }}>
                        {e.entry_date}
                      </td>
                    )}
                    <td style={{ fontWeight: '500' }}>
                      {line.account?.code ?? '—'} {line.account?.name ?? ''}
                    </td>
                    <td style={{ textAlign: 'right' }}>{line.debit > 0 ? formatRp(line.debit) : '—'}</td>
                    <td style={{ textAlign: 'right' }}>{line.credit > 0 ? formatRp(line.credit) : '—'}</td>
                    {idx === 0 && (
                      <td rowSpan={e.lines?.length ?? 1} style={{ color: 'var(--neutral-600)' }}>
                        {e.description ?? '—'}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
