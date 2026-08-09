'use client'
import type { Survey } from '@/types'
import MobileCards from '@/components/ui/MobileCards'
import Pagination from '@/components/ui/Pagination'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import BackButton from '@/components/ui/BackButton'
import { formatSurveyText, buildWhatsAppUrl } from '@/lib/survey'
import { useToast } from '@/components/ui/Toast'

const STATUS_COLORS: Record<string, string> = {
  draft: '#b45309',
  tersimpan: '#1d4ed8',
  diproses: '#7c3aed',
  selesai: '#047857'
}

interface Row {
  id: string
  survey_number: string | null
  client_name: string
  survey_date: string
  status: string
  created_at: string
  surveyor: { name: string } | null
  rooms: { count: number }[] | null
}

export default function SurveyHistoryPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [rows, setRows] = useState<Row[]>([])

  // Toast sukses hapus (datang dari detail survey via ?deleted=1), lalu bersihkan param
  useEffect(() => {
    if (searchParams.get('deleted') === '1') {
      toast('success', 'Survey berhasil dihapus')
    }
  }, [searchParams, toast])

  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterClient, setFilterClient] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(0)
  const [PAGE_SIZE, setPageSize] = useState(20)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) })
    if (filterClient.trim()) params.set('client_name', filterClient.trim())
    if (filterDate) params.set('survey_date', filterDate)
    if (filterStatus) params.set('status', filterStatus)
    const res = await fetch(`/api/surveys?${params}`)
    const json = await res.json()
    if (res.ok) {
      setRows(json.data ?? [])
      setCount(json.count ?? 0)
    }
    setLoading(false)
  }, [filterClient, filterDate, filterStatus, page, PAGE_SIZE])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  async function copyRow(row: Row) {
    const res = await fetch(`/api/surveys/${row.id}`)
    const json = await res.json()
    if (res.ok && json.data) {
      await navigator.clipboard.writeText(formatSurveyText(json.data))
      toast('info', '✅ Hasil survey tersalin — tinggal Paste di WhatsApp.')
    }
  }

  return (
    <div>
      <BackButton href="/surveyor" />
      <PageHeader title="Riwayat Survey" subtitle={`${count} survey`} />

      {/* Filter */}
      <div className="section-card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <input
            placeholder="Cari nama client / alamat..."
            value={filterClient}
            onChange={(e) => {
              setFilterClient(e.target.value)
              setPage(0)
            }}
            style={inputStyle}
          />
          <input type="date" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setPage(0) }} style={inputStyle} />
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(0) }} style={inputStyle}>
            <option value="">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="tersimpan">Tersimpan</option>
            <option value="diproses">Diproses</option>
            <option value="selesai">Selesai</option>
          </select>
        </div>
      </div>

      {/* List */}
            {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={rows} keyOf={(r) => r.id} renderCard={(r) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">No Survey</span>
                  <span className="mobile-card-value">{r.survey_number ?? '—'}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Client</span>
                  <span className="mobile-card-value">{r.client_name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Tanggal</span>
                  <span className="mobile-card-value">{r.survey_date}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Status</span>
                  <span className="mobile-card-value">{r.status}</span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            Belum ada survey. Klik "Survey Baru" untuk membuat.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>No Survey</th>
                <th>Nama Client</th>
                <th>Surveyor</th>
                <th>Jml Ruangan</th>
                <th>Tanggal</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: '600', fontFamily: 'monospace' }}>{r.survey_number ?? '—'}</td>
                  <td>{r.client_name}</td>
                  <td>{r.surveyor?.name ?? '-'}</td>
                  <td>{r.rooms?.[0]?.count ?? 0}</td>
                  <td>{r.survey_date}</td>
                  <td>
                    <span
                      style={{
                        padding: '0.25rem 0.625rem',
                        borderRadius: '999px',
                        background: `${STATUS_COLORS[r.status] ?? '#6b7280'}18`,
                        color: STATUS_COLORS[r.status] ?? '#6b7280',
                        fontWeight: '600',
                        fontSize: '0.7rem',
                        textTransform: 'capitalize'
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Link href={`/surveyor/survey/${r.id}`} style={miniBtn('#374151')}>
                      Lihat
                    </Link>{' '}
                    <Link href={`/surveyor/survey/${r.id}/edit`} style={miniBtn('#7c3aed')}>
                      Edit
                    </Link>{' '}
                    <button onClick={() => copyRow(r)} style={miniBtn('#374151')}>
                      Copy
                    </button>{' '}
                    <a href={buildWhatsAppUrl({ ...(r as unknown as Survey), rooms: [] })} target="_blank" rel="noreferrer" style={miniBtn('#25D366')}>
                      WA
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <Pagination
          currentPage={page + 1}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p - 1)}
          pageSize={PAGE_SIZE}
          onPageSizeChange={(s) => {
            setPageSize(s)
            setPage(0)
          }}
          totalItems={count}
          startIndex={page * PAGE_SIZE + 1}
          endIndex={Math.min((page + 1) * PAGE_SIZE, count)}
        />
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  outline: 'none',
  background: 'var(--surface)'
}

function miniBtn(color: string): React.CSSProperties {
  return {
    padding: '0.375rem 0.625rem',
    border: 'none',
    borderRadius: '0.375rem',
    background: color,
    color: '#fff',
    fontSize: '0.7rem',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block'
  }
}
