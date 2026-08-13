'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import BackButton from '@/components/ui/BackButton'
import DateRangePicker from '@/components/ui/DateRangePicker'
import ReportPDFButton from '@/components/ui/ReportPDFButton'
import { formatRp } from '@/lib/utils'
import Pagination from '@/components/ui/Pagination'


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

const PAGE_SIZE = 50

export default function KronologiOmzetPage({ variant = 'finance' }: { variant?: 'finance' | 'owner' } = {}) {
  const isOwner = variant === 'owner'
  const [startDate, setStartDate] = useState('2020-01-01')
  const [endDate, setEndDate] = useState('2099-12-31')
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<LooseRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)

  const supabase = createClient()

  // Phase 4 (BUG-098): ganti .limit(200) → pagination server-side (range + count exact).
  // Sebelumnya laporan periode lama selalu terpotong di 200 order → angka omzet salah.
  async function fetchData() {
    setLoading(true)
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const { data, count } = await supabase
      .from('orders')
      .select('id, order_number, created_at, total_amount, payment_status', { count: 'exact' })
      .gte('created_at', startDate)
      .lte('created_at', new Date(endDate + 'T23:59:59').toISOString())
      .order('created_at', { ascending: false })
      .range(from, to)
    setOrders((data ?? []) as LooseRow[])
    setTotal(count ?? 0)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [startDate, endDate, page])

  function downloadPDF() {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text(`Kronologi Omzet${isOwner ? ' (Owner)' : ''}`, 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 28)
    doc.text('Omzet Penjualan per Periode', 14, 34)

    autoTable(doc, {
      startY: 40,
      head: [['Order ID', 'Tanggal', 'Total', 'Status']],
      headStyles: { fillColor: [217, 119, 6] },
      body: orders.map((o) => [
        o.order_number ?? (o.id ?? 'N/A').slice(0, 8),
        new Date(o.created_at ?? '').toLocaleDateString('id-ID'),
        formatRp(o.total_amount ?? 0),
        o.payment_status ?? '—'
      ]),
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold' },
        1: { cellWidth: 35 },
        2: { cellWidth: 45, halign: 'right' },
        3: { cellWidth: 45 }
      }
    })

    doc.save(`${isOwner ? 'owner-' : ''}kronologi-omzet-${startDate}-${endDate}.pdf`)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <BackButton href={isOwner ? '/owner/laporan' : '/finance/laporan'} />
      <PageHeader
        title="Kronologi Omzet"
        subtitle={`Omzet penjualan per periode${isOwner ? ' - Tampilan Owner (Read Only)' : ''}`}
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
        ) : orders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data order</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Tanggal</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                    {o.order_number ?? (o.id ?? 'N/A').slice(0, 8)}
                  </td>
                  <td style={{ color: 'var(--neutral-600)' }}>{new Date(o.created_at ?? '').toLocaleDateString('id-ID')}</td>
                  <td style={{ fontWeight: '600', textAlign: 'right', color: '#cc7030' }}>
                    {formatRp(o.total_amount ?? 0)}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background:
                          o.payment_status === 'paid'
                            ? '#dcfce7'
                            : o.payment_status === 'pending'
                              ? '#fef9c3'
                              : 'var(--neutral-100)',
                        color:
                          o.payment_status === 'paid'
                            ? '#166534'
                            : o.payment_status === 'pending'
                              ? '#854d0e'
                              : 'var(--neutral-600)'
                      }}
                    >
                      {o.payment_status ?? '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {total > PAGE_SIZE && (
          <div style={{ padding: '0 1.25rem 1rem' }}>
            <Pagination
              currentPage={page + 1}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p - 1)}
              pageSize={PAGE_SIZE}
              onPageSizeChange={() => setPage(0)}
              totalItems={total}
              startIndex={page * PAGE_SIZE + 1}
              endIndex={Math.min((page + 1) * PAGE_SIZE, total)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
