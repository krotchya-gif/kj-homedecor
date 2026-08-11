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
  // Filter akun: null = SEMUA akun; kode = hanya akun terpilih (dropdown single)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

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

  const filtered = selectedCode === null ? accounts : accounts.filter((a) => (a.code ?? '') === selectedCode)
  const totalPreview = filtered.reduce((s, a) => s + (a.balance ?? 0), 0)
  const filterActive = selectedCode !== null

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

      {/* Filter akun (dropdown single select) */}
      <div className="section-card" style={{ marginTop: '0.75rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginBottom: '0.5rem'
          }}
        >
          <label htmlFor="ledger-account-filter" style={{ fontSize: '0.8rem', fontWeight: '700' }}>
            Filter Akun
            {filterActive && <span style={{ color: '#cc7030' }}> — {selectedCode}</span>}
          </label>
          {filterActive && (
            <button
              onClick={() => setSelectedCode(null)}
              style={{
                fontSize: '0.7rem',
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
        <select
          id="ledger-account-filter"
          value={selectedCode ?? ''}
          onChange={(e) => setSelectedCode(e.target.value || null)}
          style={{
            width: '100%',
            padding: '0.55rem 0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid #d1d5db',
            background: 'var(--surface, #fff)',
            color: 'var(--neutral-800)',
            fontSize: '0.875rem'
          }}
        >
          <option value="">— Semua Akun —</option>
          {accounts.map((a) => (
            <option key={a.id ?? a.code} value={a.code ?? ''}>
              {a.code} — {a.name} ({a.type})
            </option>
          ))}
        </select>
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
