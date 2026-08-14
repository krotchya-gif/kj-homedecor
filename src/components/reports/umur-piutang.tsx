'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import BackButton from '@/components/ui/BackButton'
import DateRangePicker from '@/components/ui/DateRangePicker'
import ReportPDFButton from '@/components/ui/ReportPDFButton'
import { formatRp, formatDateDDMMYYYY } from '@/lib/utils'
import { piutangSisa } from '@/lib/ledger'
import { createReportDoc, addReportTable, addPageNumbers } from '@/lib/report-pdf'


interface LooseRow {
  id?: string
  code?: string
  name?: string
  type?: string
  balance?: number
  date?: string
  entry_date?: string
  created_at?: string
  description?: string
  notes?: string
  reference_type?: string
  debit?: number
  credit?: number
  total_debit?: number
  total_credit?: number
  total?: number
  invoice_number?: string
  invoice_date?: string
  paid_amount?: number
  return_amount?: number
  amount?: number
  qty?: number
  status?: string
  order_number?: string
  payment_status?: string
  total_amount?: number
  dp_amount?: number
  lunas_amount?: number
  total_price?: number
  supplier_name?: string
  stock_gudang?: number
  min_stock_level?: number
  cost_per_unit?: number
  unit?: string
  bank_name?: string
  account_number?: string
  account_holder?: string
  account?: { code?: string; name?: string } | null
  [k: string]: unknown
}

export default function UmurPiutangPage({ variant = 'finance' }: { variant?: 'finance' | 'owner' } = {}) {
  const isOwner = variant === 'owner'
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState('2099-12-31')
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<LooseRow[]>([])

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    // F-61 fix: sumber utama piutang = TABEL piutang (faktur manual + settlement
    // marketplace). Sesi 52: select invoice_number (dipakai PDF) + filter
    // invoice_date agar konsisten dengan aging & umur-hutang.
    const { data } = await supabase
      .from('piutang')
      .select('id, created_at, invoice_date, invoice_number, amount, fee_amount, paid_amount, return_amount, status, customer:customers(name)')
      .in('status', ['pending', 'partial'])
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate)
      .order('invoice_date', { ascending: false })
    setOrders((data ?? []) as LooseRow[])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  function getBucket(days: number): string {
    if (days < 30) return '< 30 hari'
    if (days < 60) return '30-60 hari'
    if (days < 90) return '60-90 hari'
    return '> 90 hari'
  }

  // BUG-015 fix: as-of date = endDate (reproducible)
  const asOf = endDate && endDate !== '2099-12-31' ? new Date(endDate + 'T23:59:59') : new Date()
  const buckets: Record<string, number> = { '< 30 hari': 0, '30-60 hari': 0, '60-90 hari': 0, '> 90 hari': 0 }

  orders.forEach((o) => {
    // aging pakai invoice_date kalau ada, fallback created_at
    const anchor = o.invoice_date ?? o.created_at ?? ''
    const days = Math.floor((asOf.getTime() - new Date(anchor).getTime()) / (1000 * 60 * 60 * 24))
    // F-69 fix: tanggal masa depan → days negatif, clamp ke 0
    const bucket = getBucket(Math.max(0, days))
    // BUG-015 fix: jumlahkan SISA tagihan (amount − paid − return − fee), bukan amount penuh.
    // Phase 4 (BUG-100): pakai helper piutangSisa (satu sumber kebenaran).
    const sisa = piutangSisa(o)
    buckets[bucket] += sisa
  })

  const bucketData = Object.entries(buckets).map(([bucket, amount]) => ({ bucket, amount }))
  const totalUnpaid = Object.values(buckets).reduce((s, v) => s + v, 0)

  async function downloadPDF() {
    const { doc, startY } = await createReportDoc({
      title: `Umur Piutang${isOwner ? ' (Owner)' : ''}`,
      period: `${startDate} s/d ${endDate}`,
      subtitle: 'Rincian sisa tagihan per pelanggan'
    })
    let y = startY

    // Detail per pelanggan (sesi 44: sebelumnya PDF hanya ringkasan bucket
    // padahal judulnya "per Pelanggan")
    const detailRows = orders
      .map((o) => {
        const anchor = o.invoice_date ?? o.created_at ?? ''
        const days = Math.max(0, Math.floor((asOf.getTime() - new Date(anchor).getTime()) / (1000 * 60 * 60 * 24)))
        return {
          nama: (o.customer as { name?: string } | null)?.name ?? '—',
          invoice: String(o.invoice_number ?? '—'),
          tanggal: formatDateDDMMYYYY(o.invoice_date ?? o.created_at ?? ''),
          sisa: piutangSisa(o),
          bucket: getBucket(days)
        }
      })
      .sort((a, b) => b.sisa - a.sisa)

    if (detailRows.length === 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(107, 114, 128)
      doc.text('Tidak ada piutang terbuka di periode ini.', 14, y)
      doc.setTextColor(0, 0, 0)
      y += 8
    } else {
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Rincian per Pelanggan', 14, y)
      y += 4
      y = addReportTable(doc, {
        startY: y,
        head: [['Pelanggan', 'No. Invoice', 'Tanggal', 'Sisa Tagihan', 'Umur']],
        body: detailRows.map((r) => [r.nama, r.invoice, r.tanggal, formatRp(r.sisa), r.bucket]),
        foot: [['TOTAL', '', '', formatRp(totalUnpaid), '']],
        theme: 'striped',
        columnStyles: { 3: { halign: 'right' } }
      })
      y += 8
    }

    // Ringkasan umur
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Distribusi Umur Piutang', 14, y)
    y += 4
    addReportTable(doc, {
      startY: y,
      head: [['Umur', 'Total Sisa Tagihan']],
      body: bucketData.map((d) => [d.bucket, formatRp(d.amount)]),
      foot: [['TOTAL', formatRp(totalUnpaid)]],
      theme: 'striped',
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 60, halign: 'right' }
      }
    })

    await addPageNumbers(doc)
    doc.save(`${isOwner ? 'owner-' : ''}umur-piutang-${startDate}-${endDate}.pdf`)
  }

  // Simple bar chart using divs
  const maxAmount = Math.max(...bucketData.map((d) => d.amount), 1)

  return (
    <div>
      <BackButton href={isOwner ? '/owner/laporan' : '/finance/laporan'} />
      <PageHeader
        title="Umur Piutang"
        subtitle={`Umur piutang per pelanggan${isOwner ? ' - Tampilan Owner (Read Only)' : ''}`}
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

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
      ) : (
        <>
          {/* Bar chart */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid #e5e7eb',
              borderRadius: '0.875rem',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}
          >
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', marginBottom: '1rem' }}>
              Distribusi Umur Piutang
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {bucketData.map((d) => {
                const pct = (d.amount / maxAmount) * 100
                const colors: Record<string, string> = {
                  '< 30 hari': '#22c55e',
                  '30-60 hari': '#eab308',
                  '60-90 hari': '#f97316',
                  '> 90 hari': '#ef4444'
                }
                return (
                  <div key={d.bucket}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)' }}>{d.bucket}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: colors[d.bucket] }}>
                        {formatRp(d.amount)}
                      </span>
                    </div>
                    <div style={{ background: 'var(--neutral-100)', borderRadius: '9999px', height: '12px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: colors[d.bucket],
                          borderRadius: '9999px',
                          transition: 'width 0.3s'
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Summary table */}
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Bucket</th>
                  <th style={{ textAlign: 'right' }}>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {bucketData.map((d) => {
                  const colors: Record<string, string> = {
                    '< 30 hari': '#16a34a',
                    '30-60 hari': '#ca8a04',
                    '60-90 hari': '#ea580c',
                    '> 90 hari': '#dc2626'
                  }
                  return (
                    <tr key={d.bucket}>
                      <td style={{ fontWeight: '600', color: colors[d.bucket] }}>{d.bucket}</td>
                      <td style={{ fontWeight: '700', textAlign: 'right' }}>{formatRp(d.amount)}</td>
                    </tr>
                  )
                })}
                <tr style={{ borderTop: '2px solid #e5e7eb', background: '#fef3c7' }}>
                  <td style={{ fontWeight: '800' }}>TOTAL</td>
                  <td style={{ fontWeight: '800', textAlign: 'right', color: '#92400e' }}>{formatRp(totalUnpaid)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
