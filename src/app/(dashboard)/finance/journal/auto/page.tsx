'use client'
import MobileCards from '@/components/ui/MobileCards'
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

            {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={entries} keyOf={(e: any) => e.id} renderCard={(e: any) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Tanggal</span>
                  <span className="mobile-card-value">{e.entry_date ?? e.created_at}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Keterangan</span>
                  <span className="mobile-card-value">{e.description ?? e.notes}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Debit</span>
                  <span className="mobile-card-value">{e.total_debit ?? e.debit}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Kredit</span>
                  <span className="mobile-card-value">{e.total_credit ?? e.credit}</span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
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
