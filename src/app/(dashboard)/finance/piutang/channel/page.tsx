'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Users, Search } from 'lucide-react'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

interface ChannelRow {
  id?: string
  channel?: string
  amount?: number
  paid_amount?: number
  return_amount?: number
  fee_amount?: number
  total_amount?: number
  total_paid?: number
  total_return?: number
  total_fee?: number
}

export default function ChannelPage() {
  const [channels, setChannels] = useState<ChannelRow[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('piutang')
      .select('channel, amount, fee_amount, paid_amount, return_amount')
      .order('channel')
    // Aggregate by channel
    const aggregated: Record<string, ChannelRow> = {}
    ;(data ?? []).forEach((p: ChannelRow) => {
      const ch = p.channel ?? 'offline'
      if (!aggregated[ch]) {
        aggregated[ch] = { channel: ch, total_amount: 0, total_paid: 0, total_return: 0, total_fee: 0 }
      }
      const row = aggregated[ch]!
      // F-71 fix: Number() eksplisit — mencegah string concat / float drift
      row.total_amount = (row.total_amount ?? 0) + Number(p.amount ?? 0)
      row.total_paid = (row.total_paid ?? 0) + Number(p.paid_amount ?? 0)
      row.total_return = (row.total_return ?? 0) + Number(p.return_amount ?? 0)
      row.total_fee = (row.total_fee ?? 0) + Number(p.fee_amount ?? 0)
    })
    setChannels(Object.values(aggregated))
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div>
      <PageHeader title="Piutang Channel" subtitle="Piutang per marketplace channel" />

            {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : channels.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={channels} keyOf={(c) => c.channel ?? 'offline'} renderCard={(c) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Nama</span>
                  <span className="mobile-card-value">{c.channel ?? 'offline'}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Total Piutang</span>
                  <span className="mobile-card-value">{formatRp(c.total_amount ?? 0)}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Sisa</span>
                  <span className="mobile-card-value">
                    {formatRp((c.total_amount ?? 0) - (c.total_paid ?? 0) - (c.total_return ?? 0) - (c.total_fee ?? 0))}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Fee</span>
                  <span className="mobile-card-value" style={{ color: '#dc2626' }}>
                    -{formatRp(c.total_fee ?? 0)}
                  </span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : channels.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <Users size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada data channel</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Channel</th>
                <th style={{ textAlign: 'right' }}>Total Piutang</th>
                <th style={{ textAlign: 'right' }}>Fee</th>
                <th style={{ textAlign: 'right' }}>Paid</th>
                <th style={{ textAlign: 'right' }}>Retur</th>
                <th style={{ textAlign: 'right' }}>Sisa</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => {
                const sisa = (c.total_amount ?? 0) - (c.total_paid ?? 0) - (c.total_return ?? 0) - (c.total_fee ?? 0)
                return (
                  <tr key={c.channel}>
                    <td style={{ fontWeight: '600', textTransform: 'capitalize' }}>{c.channel}</td>
                    <td style={{ fontWeight: '600', textAlign: 'right' }}>{formatRp(c.total_amount ?? 0)}</td>
                    <td style={{ color: '#dc2626', textAlign: 'right' }}>-{formatRp(c.total_fee ?? 0)}</td>
                    <td style={{ color: '#16a34a', textAlign: 'right' }}>{formatRp(c.total_paid ?? 0)}</td>
                    <td style={{ color: '#dc2626', textAlign: 'right' }}>{formatRp(c.total_return ?? 0)}</td>
                    <td style={{ fontWeight: '700', color: '#cc7030', textAlign: 'right' }}>{formatRp(sisa)}</td>
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
