'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { RotateCcw, Search } from 'lucide-react'
import { formatRp } from '@/lib/utils'


interface Retur {
  id: string
  invoice_number?: string
  return_amount: number
  notes?: string
  status: string
  created_at?: string
  customer?: { name?: string } | null
}

export default function ReturPage() {
  const [retur, setRetur] = useState<Retur[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    // F-44 fix: `piutang` TIDAK punya kolom reason/return_date — pakai kolom nyata
    // (return_amount > 0, notes sebagai alasan, created_at sebagai tanggal)
    const { data } = await supabase
      .from('piutang')
      .select('id, invoice_number, return_amount, notes, status, created_at, customer:customers(name)')
      .gt('return_amount', 0)
      .order('created_at', { ascending: false })
    setRetur((data ?? []) as Retur[])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div>
      <PageHeader title="Retur Piutang" subtitle="Daftar retur piutang pelanggan" />

            {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : retur.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={retur} keyOf={(r) => r.id} renderCard={(r) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Jumlah</span>
                  <span className="mobile-card-value">{formatRp(r.return_amount ?? 0)}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Alasan</span>
                  <span className="mobile-card-value">{r.notes ?? '—'}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Tanggal</span>
                  <span className="mobile-card-value">{r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : '—'}</span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : retur.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <RotateCcw size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada retur</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Invoice</th>
                <th>Nilai Retur</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {retur.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: '500' }}>{r.customer?.name ?? '—'}</td>
                  <td style={{ fontFamily: 'monospace' }}>{r.invoice_number ?? '—'}</td>
                  <td style={{ fontWeight: '600', color: '#dc2626', textAlign: 'right' }}>
                    {formatRp(r.return_amount ?? 0)}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: '#fef3c7',
                        color: '#92400e'
                      }}
                    >
                      Retur
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
