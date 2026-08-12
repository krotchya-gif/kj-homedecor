'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchAccountBalances, fetchAccountLines, type AccountLine } from '@/lib/ledger'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import BackButton from '@/components/ui/BackButton'
import DateRangePicker from '@/components/ui/DateRangePicker'
import ReportPDFButton from '@/components/ui/ReportPDFButton'
import { useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { formatRp } from '@/lib/utils'


interface LooseRow {
  id?: string
  code?: string
  name?: string
  type?: string
  balance?: number
  [k: string]: unknown
}

export default function BukuBesarPage({ variant = 'finance' }: { variant?: 'finance' | 'owner' } = {}) {
  const isOwner = variant === 'owner'
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState('2099-12-31')
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<LooseRow[]>([])
  // Filter akun: null = SEMUA akun; Set kode = beberapa akun terpilih (dropdown multi)
  const [selectedCodes, setSelectedCodes] = useState<Set<string> | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  // F-58 fix: detail transaksi per akun
  const [detailAccount, setDetailAccount] = useState<LooseRow | null>(null)
  const [detailLines, setDetailLines] = useState<AccountLine[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await fetchAccountBalances(supabase, startDate, endDate)
    setAccounts((data ?? []) as LooseRow[])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  function toggleAccount(code: string) {
    setSelectedCodes((prev) => {
      if (prev === null) {
        const s = new Set(accounts.map((a) => a.code ?? ''))
        s.delete(code)
        return s.size === accounts.length ? null : s.size === 0 ? null : s
      }
      const s = new Set(prev)
      if (s.has(code)) s.delete(code)
      else s.add(code)
      return s.size === accounts.length ? null : s.size === 0 ? null : s
    })
  }

  const filtered = selectedCodes === null ? accounts : accounts.filter((a) => selectedCodes.has(a.code ?? ''))
  const totalPreview = filtered.reduce((s, a) => s + (a.balance ?? 0), 0)
  const filterActive = selectedCodes !== null

  async function openDetail(a: LooseRow) {
    setDetailAccount(a)
    setDetailLoading(true)
    const { data, error } = await fetchAccountLines(supabase, String(a.id ?? ''), startDate, endDate)
    setDetailLines((data ?? []) as AccountLine[])
    if (error) {
      setDetailLines([])
    }
    setDetailLoading(false)
  }

  function downloadPDF() {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text(`Buku Besar${isOwner ? ' (Owner)' : ''}`, 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode: ${startDate} - ${endDate}`, 14, 28)
    if (filterActive) {
      doc.text(`Filter akun: ${filtered.length} dari ${accounts.length} akun`, 14, 34)
    }

    autoTable(doc, {
      startY: filterActive ? 38 : 35,
      head: [['Kode', 'Nama Akun', 'Tipe', 'Saldo']],
      headStyles: { fillColor: [37, 99, 235] },
      body: [
        ...filtered.map((a) => [a.code ?? '', a.name ?? '', a.type ?? '—', formatRp(a.balance ?? 0)]),
        ['', 'TOTAL', '', formatRp(totalPreview)]
      ],
      footStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' }
    })

    doc.save(`${isOwner ? 'owner-' : ''}buku-besar-${startDate}-${endDate}.pdf`)
  }

  return (
    <div>
      <BackButton href={isOwner ? '/owner/laporan' : '/finance/laporan'} />
      <PageHeader
        title="Buku Besar"
        subtitle={`General ledger per akun — filter beberapa akun & lihat total preview${isOwner ? ' - Tampilan Owner (Read Only)' : ''}`}
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

      {/* Filter akun (dropdown multiple select) */}
      <div className="section-card" style={{ marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }} ref={filterRef}>
            <button
              onClick={() => setFilterOpen((o) => !o)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 0.9rem',
                borderRadius: '0.5rem',
                border: filterActive ? '1px solid #cc7030' : '1px solid #d1d5db',
                background: filterActive ? 'rgba(204,112,48,0.08)' : 'var(--surface, #fff)',
                color: 'var(--neutral-800)',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <span>Filter Akun</span>
              <span
                style={{
                  background: filterActive ? '#cc7030' : '#e5e7eb',
                  color: filterActive ? '#fff' : 'var(--neutral-600)',
                  borderRadius: '999px',
                  padding: '0.05rem 0.5rem',
                  fontSize: '0.72rem',
                  fontWeight: '700'
                }}
              >
                {filterActive ? `${filtered.length}/${accounts.length}` : 'Semua'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--neutral-500)' }}>{filterOpen ? '▲' : '▼'}</span>
            </button>

            {filterOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  width: 340,
                  maxHeight: 320,
                  overflowY: 'auto',
                  background: 'var(--surface, #fff)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.75rem',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                  zIndex: 300,
                  padding: '0.5rem'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.35rem 0.5rem 0.6rem',
                    borderBottom: '1px solid #f1f5f9',
                    marginBottom: '0.35rem'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>Pilih Akun (boleh banyak)</span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={() => setSelectedCodes(null)}
                      style={{
                        fontSize: '0.68rem',
                        color: '#047857',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '700'
                      }}
                    >
                      Semua
                    </button>
                    {filterActive && (
                      <button
                        onClick={() => setSelectedCodes(new Set())}
                        style={{
                          fontSize: '0.68rem',
                          color: '#b91c1c',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: '700'
                        }}
                      >
                        Bersihkan
                      </button>
                    )}
                  </div>
                </div>
                {accounts.map((a) => {
                  const checked = selectedCodes === null || selectedCodes.has(a.code ?? '')
                  return (
                    <label
                      key={a.id ?? a.code}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.4rem 0.5rem',
                        borderRadius: '0.4rem',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAccount(a.code ?? '')}
                        style={{ accentColor: '#cc7030', cursor: 'pointer' }}
                      />
                      <span style={{ fontFamily: 'monospace', fontWeight: '600', whiteSpace: 'nowrap' }}>{a.code}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--neutral-400)', fontSize: '0.7rem' }}>
                        {a.type}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {filterActive && (
            <button
              onClick={() => setSelectedCodes(null)}
              style={{
                fontSize: '0.75rem',
                color: '#cc7030',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              ✕ Reset (semua akun)
            </button>
          )}
        </div>
      </div>

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            Belum ada data akun
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Akun</th>
                <th>Tipe</th>
                <th style={{ textAlign: 'right' }}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => openDetail(a)}
                  style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--neutral-100)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{a.code}</td>
                  <td style={{ fontWeight: '500' }}>{a.name}</td>
                  <td style={{ textTransform: 'capitalize', color: 'var(--neutral-600)' }}>{a.type}</td>
                  <td style={{ fontWeight: '700', textAlign: 'right', color: '#cc7030' }}>
                    {formatRp(a.balance ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--neutral-100)' }}>
                <td colSpan={3} style={{ fontWeight: '800', textAlign: 'right', fontSize: '0.85rem' }}>
                  TOTAL ({filtered.length} akun)
                </td>
                <td style={{ fontWeight: '800', textAlign: 'right', color: '#cc7030', fontSize: '0.9rem' }}>
                  {formatRp(totalPreview)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* F-58 fix: detail transaksi per akun */}
      <Modal open={!!detailAccount} onClose={() => setDetailAccount(null)} maxWidth={640} padding="1.5rem" zIndex={300}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--neutral-900)' }}>
            {detailAccount?.code} — {detailAccount?.name}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', marginTop: '0.2rem' }}>
            Detail transaksi periode {startDate} s/d {endDate}
          </div>
        </div>

        {detailLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : detailLines.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            Belum ada transaksi di periode ini
          </div>
        ) : (
          <div style={{ maxHeight: 420, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.6rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'var(--neutral-100)', position: 'sticky', top: 0 }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.6rem' }}>Tanggal</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.6rem' }}>Keterangan</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0.6rem' }}>Debit</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0.6rem' }}>Kredit</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0.6rem' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {detailLines.map((l, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.45rem 0.6rem', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                      {l.entry_date}
                    </td>
                    <td style={{ padding: '0.45rem 0.6rem', color: 'var(--neutral-700)' }}>
                      {l.description}
                      {l.reference_type ? (
                        <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--neutral-400)' }}>
                          ref: {l.reference_type}
                        </span>
                      ) : null}
                    </td>
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', color: '#166534' }}>
                      {l.debit > 0 ? formatRp(l.debit) : '—'}
                    </td>
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', color: '#b91c1c' }}>
                      {l.credit > 0 ? formatRp(l.credit) : '—'}
                    </td>
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: '700', color: '#cc7030' }}>
                      {formatRp(l.running_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  )
}
