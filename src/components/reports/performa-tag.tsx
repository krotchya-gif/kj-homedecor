'use client'
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

interface TagStat {
  total?: number
  qty?: number
  count?: number
}

export default function PerformaTagPage({ variant = 'finance' }: { variant?: 'finance' | 'owner' } = {}) {
  const isOwner = variant === 'owner'
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState('2099-12-31')
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<LooseRow[]>([])

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('source, total_amount, created_at')
      .gte('created_at', startDate)
      .lte('created_at', new Date(endDate + 'T23:59:59').toISOString())
      .order('created_at', { ascending: false })
    setOrders((data ?? []) as LooseRow[])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  // F-31 fix: group by kolom `source` (bukan source_tag yang tidak pernah diisi)
  const SOURCE_LABELS: Record<string, string> = {
    shopee: 'Shopee',
    tokopedia: 'Tokopedia',
    tiktok: 'TikTok',
    offline: 'Offline',
    landing_page: 'Landing Page',
    website: 'Website',
    manual: 'Manual',
    whatsapp: 'WhatsApp'
  }
  const tagStats = orders.reduce((acc: Record<string, TagStat>, o) => {
    const raw = String(o.source ?? '')
    const tag = raw ? SOURCE_LABELS[raw] ?? raw : 'Tanpa Tag'
    if (!acc[tag]) acc[tag] = { count: 0, total: 0 }
    const row = acc[tag]!
    row.count = (row.count ?? 0) + 1
    row.total = (row.total ?? 0) + (o.total_amount ?? 0)
    return acc
  }, {})

  const tagData = Object.entries(tagStats)
    .map(([tag, stats]: [string, TagStat]) => ({
      tag,
      count: stats.count,
      total: stats.total
    }))
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))

  const grandTotal = tagData.reduce((s, d) => s + (d.total ?? 0), 0)
  const grandCount = tagData.reduce((s, d) => s + (d.count ?? 0), 0)

  function downloadPDF() {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text(`Performa Per Tag${isOwner ? ' (Owner)' : ''}`, 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 28)
    doc.text('Ringkasan Laba Rugi per Tag/Marketplace', 14, 34)

    autoTable(doc, {
      startY: 40,
      head: [['Tag/Platform', 'Jumlah Order', 'Total Revenue']],
      headStyles: { fillColor: [236, 72, 153] },
      body: tagData.map((d) => [d.tag, (d.count ?? 0).toString(), formatRp(d.total ?? 0)]),
      foot: [['TOTAL', grandCount.toString(), formatRp(grandTotal)]],
      footStyles: { fillColor: [253, 242, 252], textColor: [131, 24, 67], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 50, halign: 'right' }
      }
    })

    doc.save(`${isOwner ? 'owner-' : ''}performa-tag-${startDate}-${endDate}.pdf`)
  }

  return (
    <div>
      <BackButton href={isOwner ? '/owner/laporan' : '/finance/laporan'} />
      <PageHeader
        title="Performa Per Tag"
        subtitle={`Ringkasan laba rugi per tag/marketplace${isOwner ? ' - Tampilan Owner (Read Only)' : ''}`}
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
        ) : tagData.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data order</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tag/Platform</th>
                <th style={{ textAlign: 'right' }}>Jumlah Order</th>
                <th style={{ textAlign: 'right' }}>Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {tagData.map((d) => (
                <tr key={d.tag}>
                  <td style={{ fontWeight: '600' }}>{d.tag}</td>
                  <td style={{ textAlign: 'right', color: 'var(--neutral-600)' }}>{(d.count ?? 0)}</td>
                  <td style={{ fontWeight: '700', textAlign: 'right', color: '#cc7030' }}>{formatRp(d.total ?? 0)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #e5e7eb', background: '#fdf2f8' }}>
                <td style={{ fontWeight: '800' }}>TOTAL</td>
                <td style={{ fontWeight: '800', textAlign: 'right', color: 'var(--neutral-600)' }}>{grandCount}</td>
                <td style={{ fontWeight: '800', textAlign: 'right', color: '#db2777' }}>{formatRp(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
