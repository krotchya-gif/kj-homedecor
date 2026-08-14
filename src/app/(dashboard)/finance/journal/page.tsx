'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FileText, ExternalLink } from 'lucide-react'
import { formatRp, formatDateDDMMYYYY } from '@/lib/utils'
import Pagination from '@/components/ui/Pagination'

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
  lines?: { count?: number } | { count?: number }[] | number
}

const PAGE_SIZE = 50

export default function JournalPage() {
  const [entries, setEntries] = useState<LooseRow[]>([])
  const [loading, setLoading] = useState(true)
  // Sesi 45: pagination 50 baris/halaman (default) — jurnal lama tidak disembunyikan
  const [page, setPage] = useState(0)

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('journal_entries')
      .select('*, lines:journal_lines(count)')
      .order('entry_date', { ascending: false })
    setEntries((data ?? []) as LooseRow[])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    setPage(0)
  }, [entries.length])

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const pageEntries = entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const lineCount = (e: LooseRow): number => {
    const l = e.lines
    if (Array.isArray(l)) return l.length
    if (l && typeof l === 'object' && 'count' in l) return Number(l.count ?? 0)
    return 0
  }

  return (
    <div>
      <PageHeader
        title="Daftar Jurnal"
        subtitle="Jurnal otomatis dari sistem — detail per baris & PDF di Laporan"
        action={
          <a
            href="/finance/laporan/daftar-jurnal"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.625rem 1.25rem',
              background: 'var(--surface)',
              color: 'var(--neutral-700)',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontWeight: '600',
              fontSize: '0.875rem',
              textDecoration: 'none'
            }}
          >
            <ExternalLink size={16} /> Laporan Daftar Jurnal (PDF)
          </a>
        }
      />

      {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : pageEntries.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={pageEntries} keyOf={(e) => e.id} renderCard={(e) => (
            <div className="mobile-card">
              <div className="mobile-card-row">
                <span className="mobile-card-label">Tanggal</span>
                <span className="mobile-card-value">{formatDateDDMMYYYY(e.entry_date ?? e.created_at)}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Keterangan</span>
                <span className="mobile-card-value">{e.description ?? e.notes}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Debit</span>
                <span className="mobile-card-value">{formatRp(Number(e.total_debit ?? e.debit ?? 0))}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Kredit</span>
                <span className="mobile-card-value">{formatRp(Number(e.total_credit ?? e.credit ?? 0))}</span>
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
            <p>Belum ada jurnal</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Deskripsi</th>
                <th>Reference</th>
                <th style={{ textAlign: 'center' }}>Baris</th>
                <th style={{ textAlign: 'right' }}>Debit</th>
                <th style={{ textAlign: 'right' }}>Kredit</th>
              </tr>
            </thead>
            <tbody>
              {pageEntries.map((e) => (
                <tr key={e.id}>
                  <td style={{ color: 'var(--neutral-600)', whiteSpace: 'nowrap' }}>
                    {formatDateDDMMYYYY(e.entry_date ?? e.created_at)}
                  </td>
                  <td style={{ fontWeight: '500' }}>{e.description ?? '—'}</td>
                  <td style={{ textTransform: 'capitalize', color: 'var(--neutral-600)' }}>{e.reference_type ?? '—'}</td>
                  <td style={{ textAlign: 'center', color: 'var(--neutral-500)' }}>{lineCount(e)}</td>
                  <td style={{ textAlign: 'right', color: '#166534' }}>{formatRp(Number(e.total_debit ?? e.debit ?? 0))}</td>
                  <td style={{ textAlign: 'right', color: '#b91c1c' }}>{formatRp(Number(e.total_credit ?? e.credit ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* SESI 52 (Wave 3): pagination di LUAR .desktop-only — mobile juga butuh
          kontrol halaman (MobileCards di-slice pageEntries). Sebelumnya hanya
          tampil di desktop → user HP terkunci di 10 baris pertama. */}
      {!loading && entries.length > 0 && (
        <Pagination
          currentPage={page + 1}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p - 1)}
          pageSize={PAGE_SIZE}
          onPageSizeChange={() => setPage(0)}
          totalItems={entries.length}
          startIndex={page * PAGE_SIZE + 1}
          endIndex={Math.min((page + 1) * PAGE_SIZE, entries.length)}
        />
      )}
    </div>
  )
}
