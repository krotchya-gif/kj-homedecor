'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Users, Search } from 'lucide-react'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function ChannelPage() {
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('piutang')
      .select('channel, amount, paid_amount, return_amount')
      .order('channel')
    // Aggregate by channel
    const aggregated: Record<string, any> = {}
    ;(data ?? []).forEach((p: any) => {
      const ch = p.channel ?? 'offline'
      if (!aggregated[ch]) {
        aggregated[ch] = { channel: ch, total_amount: 0, total_paid: 0, total_return: 0 }
      }
      aggregated[ch].total_amount += p.amount ?? 0
      aggregated[ch].total_paid += p.paid_amount ?? 0
      aggregated[ch].total_return += p.return_amount ?? 0
    })
    setChannels(Object.values(aggregated))
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Piutang Channel</h1>
        <p className="page-subtitle">Piutang per marketplace channel</p>
      </div>

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
        ) : channels.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <Users size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada data channel</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Channel</th>
                <th style={{ textAlign: 'right' }}>Total Piutang</th>
                <th style={{ textAlign: 'right' }}>Paid</th>
                <th style={{ textAlign: 'right' }}>Retur</th>
                <th style={{ textAlign: 'right' }}>Sisa</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => {
                const sisa = c.total_amount - c.total_paid - c.total_return
                return (
                  <tr key={c.channel}>
                    <td style={{ fontWeight: '600', textTransform: 'capitalize' }}>{c.channel}</td>
                    <td style={{ fontWeight: '600', textAlign: 'right' }}>{formatRp(c.total_amount)}</td>
                    <td style={{ color: '#16a34a', textAlign: 'right' }}>{formatRp(c.total_paid)}</td>
                    <td style={{ color: '#dc2626', textAlign: 'right' }}>{formatRp(c.total_return)}</td>
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