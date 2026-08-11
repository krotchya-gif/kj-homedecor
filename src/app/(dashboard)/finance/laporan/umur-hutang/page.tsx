'use client'
import type { AutoTableDoc } from '@/lib/pdf-types'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
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
  amount?: number
  qty?: number
  status?: string
  order_number?: string
  payment_status?: string
  total_amount?: number
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

interface HutangRow {
  id?: string
  invoice_number?: string
  invoice_date?: string
  due_date?: string
  amount?: number
  paid_amount?: number
  return_amount?: number
  status?: string
  supplier?: { name?: string } | null
}

export default function UmurHutangPage() {
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState('2099-12-31')
  const [loading, setLoading] = useState(true)
  const [hutang, setHutang] = useState<LooseRow[]>([])

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    // BUG-015 fix: query pakai tanggal (invoice_date dalam rentang) + hanya yang belum lunas/batal
    const { data } = await supabase
      .from('hutang')
      .select('*, supplier:suppliers(name)')
      .in('status', ['pending', 'partial'])
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate)
      .order('invoice_date', { ascending: false })
    setHutang((data ?? []) as LooseRow[])
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

  // BUG-015 fix: as-of date = endDate (reproducible), bukan hari ini
  const asOf = endDate && endDate !== '2099-12-31' ? new Date(endDate + 'T23:59:59') : new Date()

  const enriched = hutang.map((h: HutangRow) => {
    // aging pakai due_date kalau ada, fallback invoice_date
    const anchor = h.due_date ?? h.invoice_date ?? ''
    const days = Math.floor((asOf.getTime() - new Date(anchor).getTime()) / (1000 * 60 * 60 * 24))
    const bucket = getBucket(days)
    const sisa = (h.amount ?? 0) - (h.paid_amount ?? 0) - (h.return_amount ?? 0)
    return { ...h, days, bucket, sisa }
  })

  const buckets: Record<string, number> = { '< 30 hari': 0, '30-60 hari': 0, '60-90 hari': 0, '> 90 hari': 0 }
  enriched.forEach((h) => {
    // BUG-015 fix: jumlahkan SISA tagihan, bukan amount penuh
    buckets[h.bucket] = (buckets[h.bucket] ?? 0) + (h.sisa > 0 ? h.sisa : 0)
  })

  const bucketData = Object.entries(buckets).map(([bucket, amount]) => ({ bucket, amount }))
  const totalHutang = Object.values(buckets).reduce((s, v) => s + v, 0)

  function downloadPDF() {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Umur Hutang', 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 28)
    doc.text('Umur Hutang per Pemasok', 14, 34)

    autoTable(doc, {
      startY: 40,
      head: [['Supplier', 'Invoice', 'Tanggal', 'Amount', 'Bucket']],
      headStyles: { fillColor: [220, 38, 38] },
      body: enriched.map((h) => [
        (h as unknown as { supplier?: { name?: string } | null }).supplier?.name ?? '—',
        h.invoice_number ?? (h.id ?? '').slice(0, 8),
        new Date(h.invoice_date ?? '').toLocaleDateString('id-ID'),
        formatRp(h.amount ?? 0),
        h.bucket
      ]),
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30 },
        3: { cellWidth: 40, halign: 'right' },
        4: { cellWidth: 30 }
      }
    })

    const finalY = (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 10
    autoTable(doc, {
      startY: finalY,
      head: [['Bucket', 'Total Amount']],
      headStyles: { fillColor: [220, 38, 38] },
      body: bucketData.map((d) => [d.bucket, formatRp(d.amount)]),
      foot: [['TOTAL', formatRp(totalHutang)]],
      footStyles: { fillColor: [254, 242, 242], textColor: [153, 27, 27], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 60, halign: 'right' }
      }
    })

    doc.save(`umur-hutang-${startDate}-${endDate}.pdf`)
  }

  return (
    <div>
      <BackButton href="/finance/laporan" />
      <PageHeader
        title="Umur Hutang"
        subtitle="Umur hutang per pemasok"
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

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : enriched.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data hutang</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Invoice</th>
                <th>Tanggal</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Bucket</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((h) => {
                const bucketColors: Record<string, string> = {
                  '< 30 hari': '#16a34a',
                  '30-60 hari': '#ca8a04',
                  '60-90 hari': '#ea580c',
                  '> 90 hari': '#dc2626'
                }
                return (
                  <tr key={h.id}>
                    <td style={{ fontWeight: '600' }}>{h.supplier?.name ?? '—'}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--neutral-600)' }}>
                      {h.invoice_number ?? (h.id ?? '').slice(0, 8)}
                    </td>
                    <td style={{ color: 'var(--neutral-600)' }}>{new Date(h.invoice_date ?? '').toLocaleDateString('id-ID')}</td>
                    <td style={{ fontWeight: '700', textAlign: 'right', color: '#cc7030' }}>
                      {formatRp(h.amount ?? 0)}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '0.25rem 0.625rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background:
                            h.days < 30 ? '#dcfce7' : h.days < 60 ? '#fef9c3' : h.days < 90 ? '#ffedd5' : '#fee2e2',
                          color: h.days < 30 ? '#166534' : h.days < 60 ? '#854d0e' : h.days < 90 ? '#9a3412' : '#991b1b'
                        }}
                      >
                        {h.bucket}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && enriched.length > 0 && (
        <div
          style={{
            marginTop: '1.5rem',
            background: 'var(--surface)',
            border: '1px solid #e5e7eb',
            borderRadius: '0.875rem',
            padding: '1.5rem'
          }}
        >
          <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', marginBottom: '1rem' }}>
            Ringkasan per Bucket
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            {bucketData.map((d) => {
              const colors: Record<string, { bg: string; text: string }> = {
                '< 30 hari': { bg: '#dcfce7', text: '#166534' },
                '30-60 hari': { bg: '#fef9c3', text: '#854d0e' },
                '60-90 hari': { bg: '#ffedd5', text: '#9a3412' },
                '> 90 hari': { bg: '#fee2e2', text: '#991b1b' }
              }
              const c = colors[d.bucket]
              return (
                <div
                  key={d.bucket}
                  style={{ background: c.bg, borderRadius: '0.75rem', padding: '1rem', textAlign: 'center' }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: c.text, marginBottom: '0.25rem' }}>
                    {d.bucket}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: c.text }}>{formatRp(d.amount)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
