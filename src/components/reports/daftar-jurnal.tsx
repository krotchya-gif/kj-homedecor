'use client'
import type { JournalEntry, JournalLine } from '@/types'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import BackButton from '@/components/ui/BackButton'
import DateRangePicker from '@/components/ui/DateRangePicker'
import ReportPDFButton from '@/components/ui/ReportPDFButton'
import { formatRp, formatDateDDMMYYYY } from '@/lib/utils'
import { createReportDoc, addReportTable, addPageNumbers } from '@/lib/report-pdf'


export default function DaftarJurnalPage({ variant = 'finance' }: { variant?: 'finance' | 'owner' } = {}) {
  const isOwner = variant === 'owner'
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState('2099-12-31')
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<JournalEntry[]>([])
  // F-59 fix: pagination — tidak ada batas 100 yang menyembunyikan jurnal lama
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('journal_entries')
      .select('*, lines:journal_lines(*, account:accounts(code, name))')
      .gte('entry_date', startDate)
      .lte('entry_date', endDate)
      .order('entry_date', { ascending: false })
    setEntries(data ?? [])
    setPage(0)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const pageEntries = entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  const goto = (n: number) => setPage(Math.min(Math.max(0, n), pageCount - 1))

  function downloadPDF() {
    const { doc, startY } = createReportDoc({
      title: `Daftar Jurnal${isOwner ? ' (Owner)' : ''}`,
      period: `${startDate} s/d ${endDate}`,
      subtitle: 'Daftar jurnal per periode'
    })

    const tableBody: (string | number)[][] = []
    let totalDebit = 0
    let totalCredit = 0
    entries.forEach((e) => {
      e.lines?.forEach((line: JournalLine, idx: number) => {
        const debit = line.debit > 0 ? line.debit : 0
        const credit = line.credit > 0 ? line.credit : 0
        totalDebit += Number(debit)
        totalCredit += Number(credit)
        tableBody.push([
          idx === 0 ? (e.entry_date ?? '') : '',
          `${line.account?.code ?? ''} ${line.account?.name ?? ''}`,
          debit > 0 ? formatRp(debit) : '',
          credit > 0 ? formatRp(credit) : '',
          idx === 0 ? (e.description ?? '') : ''
        ])
      })
    })

    // Sesi 44: lebar kolom ≤ lebar A4 (180mm) + TOTAL debit/kredit
    addReportTable(doc, {
      startY,
      head: [['Tanggal', 'Akun', 'Debit', 'Kredit', 'Deskripsi']],
      body: tableBody,
      foot: [['', 'TOTAL', formatRp(totalDebit), formatRp(totalCredit), '']],
      theme: 'striped',
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 50 },
        2: { cellWidth: 32, halign: 'right' },
        3: { cellWidth: 32, halign: 'right' },
        4: { cellWidth: 44 }
      }
    })

    addPageNumbers(doc)
    doc.save(`${isOwner ? 'owner-' : ''}daftar-jurnal-${startDate}-${endDate}.pdf`)
  }

  return (
    <div>
      <BackButton href={isOwner ? '/owner/laporan' : '/finance/laporan'} />
      <PageHeader
        title="Daftar Jurnal"
        subtitle={`Journal entries list${isOwner ? ' - Tampilan Owner (Read Only)' : ''}`}
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
              {pageEntries.map((e) =>
                e.lines?.map((line: JournalLine, idx: number) => (
                  <tr key={`${e.id}-${idx}`}>
                    {idx === 0 && (
                      <td rowSpan={e.lines?.length ?? 1} style={{ color: 'var(--neutral-600)' }}>
                        {formatDateDDMMYYYY(e.entry_date)}
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
        {!loading && entries.length > 0 && pageCount > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', padding: '1rem 0' }}>
            <button onClick={() => goto(page - 1)} disabled={page === 0} style={{ padding: '0.4rem 0.8rem', borderRadius: '0.4rem', border: '1px solid #d1d5db', cursor: 'pointer', fontSize: '0.8rem' }}>‹ Prev</button>
            <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>{page + 1} / {pageCount} ({entries.length} jurnal)</span>
            <button onClick={() => goto(page + 1)} disabled={page >= pageCount - 1} style={{ padding: '0.4rem 0.8rem', borderRadius: '0.4rem', border: '1px solid #d1d5db', cursor: 'pointer', fontSize: '0.8rem' }}>Next ›</button>
          </div>
        )}
      </div>
    </div>
  )
}
