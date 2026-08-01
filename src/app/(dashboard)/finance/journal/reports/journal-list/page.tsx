'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Download, List } from 'lucide-react'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function JournalListPage() {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('journal_entries')
      .select('*, lines:journal_lines(*, account:accounts(code, name))')
      .order('entry_date', { ascending: false })
      .limit(100)
    setEntries(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  function downloadPDF() {
    alert('PDF download - implement dengan jspdf atau @react-pdf/renderer')
  }

  return (
    <div>
      <PageHeader
        title="Daftar Jurnal"
        subtitle="Journal entries list"
        action={
          <button
            onClick={downloadPDF}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.625rem 1.25rem',
              background: '#cc7030',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            <Download size={16} /> Download PDF
          </button>
        }
      />

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <List size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada journal entries</p>
          </div>
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
                e.lines?.map((line: any, idx: number) => (
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
