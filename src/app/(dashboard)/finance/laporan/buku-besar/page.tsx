'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchAccountBalances } from '@/lib/ledger'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import BackButton from '@/components/ui/BackButton'
import DateRangePicker from '@/components/ui/DateRangePicker'
import ReportPDFButton from '@/components/ui/ReportPDFButton'
import { useRef } from 'react'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

interface LooseRow {
  id?: string
  code?: string
  name?: string
  type?: string
  balance?: number
  [k: string]: unknown
}

export default function BukuBesarPage() {
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState('2099-12-31')
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<LooseRow[]>([])
  // Filter akun: null = SEMUA akun; Set kode = beberapa akun terpilih (dropdown multi)
  const [selectedCodes, setSelectedCodes] = useState<Set<string> | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

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
  }, [])

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

  function downloadPDF() {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Buku Besar', 14, 20)
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

    doc.save(`buku-besar-${startDate}-${endDate}.pdf`)
  }

  return (
    <div>
      <BackButton href="/finance/laporan" />
      <PageHeader
        title="Buku Besar"
        subtitle="General ledger per akun — filter beberapa akun & lihat total preview"
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
                <tr key={a.id}>
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
    </div>
  )
}
