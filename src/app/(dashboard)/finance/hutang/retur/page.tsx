'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { RotateCcw, Search } from 'lucide-react'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(n)

interface ReturHutang {
  id: string
  supplier_id: string
  invoice_number: string
  return_amount: number
  return_reason: string
  return_date: string
  status: string
  supplier?: { name: string }
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  processed: { bg: '#dbeafe', text: '#1e40af' },
  completed: { bg: '#d1fae5', text: '#065f46' },
  rejected: { bg: '#fee2e2', text: '#991b1b' }
}

export default function ReturHutangPage() {
  const [retur, setRetur] = useState<ReturHutang[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('hutang')
      .select('*, supplier:suppliers(name)')
      .gt('return_amount', 0)
      .order('created_at', { ascending: false })
    setRetur((data as ReturHutang[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = retur.filter(
    (r) =>
      r.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.invoice_number?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Retur Hutang</h1>
        <p className="page-subtitle">Daftar retur pembelian dari supplier</p>
      </div>

      <div style={{ position: 'relative', marginBottom: '1.25rem', maxWidth: 320 }}>
        <Search
          size={15}
          style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9ca3af'
          }}
        />
        <input
          type="text"
          placeholder="Cari supplier atau invoice..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.625rem 1rem 0.625rem 2.25rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            outline: 'none'
          }}
        />
      </div>

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <RotateCcw size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada retur</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Invoice</th>
                <th>Nilai Retur</th>
                <th>Alasan</th>
                <th>Tanggal Retur</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const sc = STATUS_COLORS[r.status] ?? STATUS_COLORS.pending
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: '500' }}>{r.supplier?.name ?? '—'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{r.invoice_number ?? '—'}</td>
                    <td
                      style={{
                        fontWeight: '600',
                        color: '#dc2626',
                        textAlign: 'right'
                      }}
                    >
                      {formatRp(r.return_amount ?? 0)}
                    </td>
                    <td
                      style={{
                        color: '#6b7280',
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {r.return_reason ?? '—'}
                    </td>
                    <td style={{ color: '#6b7280' }}>
                      {r.return_date ? new Date(r.return_date).toLocaleDateString('id-ID') : '—'}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: '600',
                          background: sc.bg,
                          color: sc.text,
                          textTransform: 'capitalize'
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
