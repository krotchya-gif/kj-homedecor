'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FileText } from 'lucide-react'

export default function AutoJournalPage() {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('journal_entries')
      .select('*, lines:journal_lines(count)')
      .order('entry_date', { ascending: false })
      .limit(50)
    setEntries(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div>
      <PageHeader title="Jurnal Otomatis" subtitle="Journal entries dari sistem" />

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <FileText size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada journal entries</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Deskripsi</th>
                <th>Reference</th>
                <th>Debit</th>
                <th>Kredit</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td style={{ color: 'var(--neutral-600)' }}>{e.entry_date ?? '—'}</td>
                  <td style={{ fontWeight: '500' }}>{e.description ?? '—'}</td>
                  <td style={{ textTransform: 'capitalize', color: 'var(--neutral-600)' }}>{e.reference_type ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>{e.total_debit ?? 0}</td>
                  <td style={{ textAlign: 'right' }}>{e.total_credit ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
