'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FileText } from 'lucide-react'

interface LooseRow {
  id: string
  entry_date?: string
  created_at?: string
  description?: string
  notes?: string
  reference_type?: string
  debit?: number
  credit?: number
  total_debit?: number
  total_credit?: number
}

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function AutoJournalPage() {
  const [entries, setEntries] = useState<LooseRow[]>([])
  const [loading, setLoading] = useState(true)
  // F-65 fix: pagination — tidak ada batas 50 yang menyembunyikan jurnal lama
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('journal_entries')
      .select('*, lines:journal_lines(count)')
      .order('entry_date', { ascending: false })
    setEntries((data ?? []) as LooseRow[])
    setPage(0)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const pageEntries = entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  const goto = (n: number) => setPage(Math.min(Math.max(0, n), pageCount - 1))

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
          <MobileCards items={entries} keyOf={(e) => e.id} renderCard={(e) => (
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
              {pageEntries.map((e) => (
                <tr key={e.id}>
                  <td style={{ color: 'var(--neutral-600)' }}>{e.entry_date ?? '—'}</td>
                  <td style={{ fontWeight: '500' }}>{e.description ?? '—'}</td>
                  <td style={{ textTransform: 'capitalize', color: 'var(--neutral-600)' }}>{e.reference_type ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>{formatRp(Number(e.total_debit ?? e.debit ?? 0))}</td>
                  <td style={{ textAlign: 'right' }}>{formatRp(Number(e.total_credit ?? e.credit ?? 0))}</td>
                </tr>
              ))}
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
