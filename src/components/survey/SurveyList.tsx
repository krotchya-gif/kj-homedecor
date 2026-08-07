'use client'

import { useCallback, useEffect, useState } from 'react'
import Pagination from '@/components/ui/Pagination'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatSurveyText, buildWhatsAppUrl } from '@/lib/survey'
import { useToast } from '@/components/ui/Toast'
import MobileCards from '@/components/ui/MobileCards'

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
  surveyor: { name: string } | null
  rooms: { count: number }[] | null
}

interface Props {
  basePath: '/admin' | '/owner'
}

export default function SurveyList({ basePath }: Props) {
  const { toast } = useToast()
  const [rows, setRows] = useState<Row[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterClient, setFilterClient] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSurveyor, setFilterSurveyor] = useState('')
  const [page, setPage] = useState(0)
  const [PAGE_SIZE, setPageSize] = useState(20)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) })
    if (filterClient.trim()) params.set('client_name', filterClient.trim())
    if (filterDate) params.set('survey_date', filterDate)
    if (filterStatus) params.set('status', filterStatus)
    if (filterSurveyor) params.set('surveyor_id', filterSurveyor)
    const res = await fetch(`/api/surveys?${params}`)
    const json = await res.json()
    if (res.ok) {
      setRows(json.data ?? [])
      setCount(json.count ?? 0)
    }
    setLoading(false)
  }, [filterClient, filterDate, filterStatus, filterSurveyor, page])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  async function handleDelete(row: Row) {
    if (!confirm(`Hapus survey ${row.survey_number ?? ''} milik ${row.client_name}?`)) return
    // Optimistic delete + rollback
    const prev = rows
    setRows((curr) => curr.filter((r) => r.id !== row.id))
    setCount((c) => Math.max(0, c - 1))
    const res = await fetch(`/api/surveys/${row.id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) {
      setRows(prev)
      setCount((c) => c + 1)
      toast('error', json.error?.message ?? 'Gagal hapus')
      return
    }
    toast('success', `Survey ${row.survey_number ?? ''} berhasil dihapus`)
  }

  async function copyRow(row: Row) {
    const res = await fetch(`/api/surveys/${row.id}`)
    const json = await res.json()
    if (res.ok && json.data) {
      await navigator.clipboard.writeText(formatSurveyText(json.data))
      toast('info', '✅ Hasil survey tersalin.')
    }
  }

  return (
    <div>
      <PageHeader title="Data Survey" subtitle={`${count} survey dari semua surveyor`} />

      {/* Filter */}
      <div className="section-card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
          <input
            placeholder="Cari nama client / alamat..."
            value={filterClient}
            onChange={(e) => { setFilterClient(e.target.value); setPage(0) }}
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
          <input
            placeholder="Filter ID surveyor..."
            value={filterSurveyor}
            onChange={(e) => { setFilterSurveyor(e.target.value); setPage(0) }}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada survey.</div>
        ) : (
          <MobileCards
            items={rows}
            keyOf={(r) => r.id}
            renderCard={(r) => (
              <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">No Survey</span>
                  <span className="mobile-card-value" style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                    {r.survey_number ?? '—'}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Client</span>
                  <span className="mobile-card-value">{r.client_name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Surveyor</span>
                  <span className="mobile-card-value" style={{ fontWeight: '400' }}>{r.surveyor?.name ?? '-'}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Tanggal</span>
                  <span className="mobile-card-value" style={{ fontWeight: '400' }}>{r.survey_date}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Status</span>
                  <span className="mobile-card-value">
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
                  </span>
                </div>
                <div className="mobile-card-actions">
                  <Link href={`/surveyor/survey/${r.id}`} style={{ background: 'var(--neutral-100)', color: '#374151', textDecoration: 'none' }}>
                    Lihat
                  </Link>
                  <Link href={`/surveyor/survey/${r.id}/edit`} style={{ background: '#f3e8ff', color: '#7c3aed', textDecoration: 'none' }}>
                    Edit
                  </Link>
                  <button onClick={() => copyRow(r)} style={{ background: 'var(--neutral-100)', color: '#374151', border: 'none', cursor: 'pointer' }}>
                    Copy
                  </button>
                  <a href={buildWhatsAppUrl({ ...(r as any), rooms: [] } as any)} target="_blank" rel="noreferrer" style={{ background: '#dcfce7', color: '#166534', textDecoration: 'none' }}>
                    WA
                  </a>
                  <button onClick={() => handleDelete(r)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer' }}>
                    Hapus
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </div>
      <div className="data-table desktop-only">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada survey.</div>
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
                    <a href={buildWhatsAppUrl({ ...(r as any), rooms: [] } as any)} target="_blank" rel="noreferrer" style={miniBtn('#25D366')}>
                      WA
                    </a>{' '}
                    <button onClick={() => handleDelete(r)} style={miniBtn('#dc2626')}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
