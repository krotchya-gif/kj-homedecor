'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { BarChart3, Download, Package, ArrowDownLeft, ArrowUpRight, Loader2, FileDown } from 'lucide-react'
import { formatRp } from '@/lib/utils'
import { createReportDoc, addReportTable, addPageNumbers } from '@/lib/report-pdf'

interface InventoryMovement {
  id: string
  material_id: string
  type: string
  qty: number
  reason: string
  from_location: string | null
  to_location: string | null
  created_at: string
  created_by: string
  material?: { name: string; unit: string }
  staff?: { name: string }
  material_name?: string
  name?: string
  quantity?: number
  movement_type?: string
}

export default function GudangReportsPage() {
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<{ month: number; year: number }>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  })
  const [filterType, setFilterType] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadMovements()
  }, [period, filterType])

  async function loadMovements() {
    setLoading(true)
    let query = supabase
      .from('inventory_movements')
      .select('*, material:materials(name, unit), staff:users(name)')
      .gte('created_at', `${period.year}-${String(period.month).padStart(2, '0')}-01`)
      .lte('created_at', `${period.year}-${String(period.month).padStart(2, '0')}-31`)

    if (filterType) {
      query = query.eq('type', filterType)
    }

    const { data } = await query
    setMovements((data as InventoryMovement[]) ?? [])
    setLoading(false)
  }

  
  async function exportPDF() {
    const { doc, startY } = await createReportDoc({
      title: 'Laporan Gudang',
      period: `${MONTHS[period.month - 1]} ${period.year}`,
      subtitle: filterType ? `Filter tipe: ${typeLabels[filterType] ?? filterType}` : undefined
    })
    let y = startY

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Ringkasan', 14, y)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    y += 6
    doc.text(`Barang Masuk  : ${totalIn.toLocaleString()} unit`, 14, y)
    y += 5
    doc.text(`Barang Keluar : ${totalOut.toLocaleString()} unit`, 14, y)
    y += 5
    doc.text(`Transfer      : ${totalTransfer.toLocaleString()} unit`, 14, y)
    y += 5
    doc.text(`Total Movement: ${movements.length} transaksi`, 14, y)
    y += 8

    // Sesi 44: urutan deterministik (terbaru dulu) + lebar kolom 8 kolom diatur
    // supaya tidak terpotong + TOTAL qty.
    const rows = [...movements].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    const totalQty = rows.reduce((s, m) => s + m.qty, 0)
    addReportTable(doc, {
      startY: y,
      head: [['Tanggal', 'Material', 'Tipe', 'Qty', 'Dari', 'Ke', 'Alasan', 'Staff']],
      body: rows.map((m) => [
        new Date(m.created_at).toLocaleDateString('id-ID'),
        m.material?.name ?? '—',
        typeLabels[m.type] ?? m.type,
        String(m.qty),
        m.from_location ?? '—',
        m.to_location ?? '—',
        m.reason ?? '—',
        m.staff?.name ?? '—'
      ]),
      foot: [['', '', 'TOTAL', String(totalQty), '', '', '', '']],
      theme: 'striped',
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 30 },
        2: { cellWidth: 22 },
        3: { cellWidth: 14, halign: 'right' },
        4: { cellWidth: 22 },
        5: { cellWidth: 22 },
        6: { cellWidth: 32 },
        7: { cellWidth: 20 }
      }
    })

    await addPageNumbers(doc)
    doc.save(`kj-gudang-${period.year}-${String(period.month).padStart(2, '0')}.pdf`)
  }

  function exportCSV() {
    const headers = ['Tanggal', 'Material', 'Tipe', 'Qty', 'Lokasi Dari', 'Lokasi Ke', 'Alasan', 'Staff']
    const rows = movements.map((m) => [
      new Date(m.created_at).toLocaleDateString('id-ID'),
      m.material?.name ?? '—',
      m.type,
      m.qty,
      m.from_location ?? '—',
      m.to_location ?? '—',
      m.reason ?? '—',
      m.staff?.name ?? '—'
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kj-gudang-report-${period.year}-${period.month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const MONTHS = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember'
  ]

  // Stats
  const totalIn = movements.filter((m) => m.type === 'in').reduce((s, m) => s + m.qty, 0)
  const totalOut = movements.filter((m) => m.type === 'out').reduce((s, m) => s + m.qty, 0)
  const totalTransfer = movements
    .filter((m) => m.type === 'transfer_in' || m.type === 'transfer_out')
    .reduce((s, m) => s + m.qty, 0)

  const typeLabels: Record<string, string> = {
    in: 'Barang Masuk',
    out: 'Barang Keluar',
    transfer_in: 'Transfer Masuk',
    transfer_out: 'Transfer Keluar',
    return_in: 'Retur Masuk',
    dispose: 'Disposal'
  }

  return (
    <div>
      <PageHeader
        title="Laporan Gudang"
        subtitle="Riwayat pergerakan stok material"
        action={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={exportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.625rem 1.25rem',
                background: 'var(--surface)',
                color: 'var(--neutral-700)',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <Download size={16} /> Export CSV
            </button>
            <button
              onClick={exportPDF}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.625rem 1.25rem',
                background: '#cc7030',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <FileDown size={16} /> Export PDF
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select
          value={period.month}
          onChange={(e) => setPeriod((p) => ({ ...p, month: Number(e.target.value) }))}
          style={{
            padding: '0.625rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            outline: 'none',
            background: 'var(--surface)'
          }}
        >
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={period.year}
          onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))}
          style={{
            padding: '0.625rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            outline: 'none',
            background: 'var(--surface)'
          }}
        >
          {[2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: '0.625rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            outline: 'none',
            background: 'var(--surface)'
          }}
        >
          <option value="">Semua Tipe</option>
          <option value="in">Barang Masuk</option>
          <option value="out">Barang Keluar</option>
          <option value="transfer_in">Transfer Masuk</option>
          <option value="transfer_out">Transfer Keluar</option>
          <option value="return_in">Retur Masuk</option>
          <option value="dispose">Disposal</option>
        </select>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-label">Barang Masuk</div>
          <div className="stat-card-value" style={{ color: '#16a34a' }}>
            {totalIn.toLocaleString()}
          </div>
          <div className="stat-card-sub">Unit masuk bulan ini</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Barang Keluar</div>
          <div className="stat-card-value" style={{ color: '#ef4444' }}>
            {totalOut.toLocaleString()}
          </div>
          <div className="stat-card-sub">Unit keluar bulan ini</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Transfer</div>
          <div className="stat-card-value" style={{ color: '#3b82f6' }}>
            {totalTransfer.toLocaleString()}
          </div>
          <div className="stat-card-sub">Move antar lokasi</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Movement</div>
          <div className="stat-card-value">{movements.length}</div>
          <div className="stat-card-sub">Transaksi bulan ini</div>
        </div>
      </div>

      {/* Movements Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: 'var(--neutral-100)' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--neutral-700)', margin: 0 }}>Riwayat Pergerakan</h2>
        </div>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#cc7030' }} />
          </div>
        ) : movements.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <Package size={28} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Tidak ada data pergerakan bulan ini</p>
          </div>
        ) : (
          <>
      {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : movements.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={movements} keyOf={(m) => m.id} renderCard={(m) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Material</span>
                  <span className="mobile-card-value">{m.material_name ?? m.name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Qty</span>
                  <span className="mobile-card-value">{m.qty ?? m.quantity}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Tipe</span>
                  <span className="mobile-card-value">{m.type ?? m.movement_type}</span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Material</th>
                  <th>Tipe</th>
                  <th>Qty</th>
                  <th>Dari</th>
                  <th>Ke</th>
                  <th>Alasan</th>
                  <th>Staff</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {new Date(m.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </td>
                    <td style={{ fontWeight: '500' }}>{m.material?.name ?? '—'}</td>
                    <td>
                      <span
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: m.type === 'in' ? '#d1fae5' : m.type === 'out' ? '#fee2e2' : '#e0e7ff',
                          color: m.type === 'in' ? '#065f46' : m.type === 'out' ? '#991b1b' : '#3730a3'
                        }}
                      >
                        {typeLabels[m.type] ?? m.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600' }}>{m.qty.toLocaleString()}</td>
                    <td style={{ color: 'var(--neutral-600)', fontSize: '0.85rem' }}>{m.from_location ?? '—'}</td>
                    <td style={{ color: 'var(--neutral-600)', fontSize: '0.85rem' }}>{m.to_location ?? '—'}</td>
                    <td
                      style={{
                        color: 'var(--neutral-600)',
                        fontSize: '0.85rem',
                        maxWidth: 150,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {m.reason ?? '—'}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{m.staff?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  )
}
