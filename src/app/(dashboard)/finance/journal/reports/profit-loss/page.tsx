'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Download, TrendingUp } from 'lucide-react'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function ProfitLossPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('accounts').select('*').order('code')
    setAccounts(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const revenues = accounts.filter((a) => a.type === 'revenue')
  const expenses = accounts.filter((a) => a.type === 'expense')
  const totalRevenue = revenues.reduce((s, a) => s + (a.balance ?? 0), 0)
  const totalExpense = expenses.reduce((s, a) => s + (a.balance ?? 0), 0)
  const profit = totalRevenue - totalExpense

  function downloadPDF() {
    alert('PDF download - implement dengan jspdf atau @react-pdf/renderer')
  }

  return (
    <div>
      <PageHeader
        title="Laporan Laba Rugi"
        subtitle="Profit & Loss statement"
        action={
          <button
            onClick={downloadPDF}
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
            <Download size={16} /> Download PDF
          </button>
        }
      />

      <div
        className="chart-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginTop: '1.5rem'
        }}
      >
        <div
          className="chart-card"
          style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.875rem', overflow: 'hidden' }}
        >
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#d1fae5' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#065f46' }}>PENDAPATAN</h2>
          </div>
          <div className="data-table">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
            ) : (
              <table>
                <tbody>
                  {revenues.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: '500' }}>
                        {a.code} {a.name}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>
                        {formatRp(a.balance ?? 0)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                    <td style={{ fontWeight: '800' }}>TOTAL PENDAPATAN</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#16a34a' }}>
                      {formatRp(totalRevenue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.875rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#fef2f2' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#991b1b' }}>BIAYA</h2>
          </div>
          <div className="data-table">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
            ) : (
              <table>
                <tbody>
                  {expenses.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: '500' }}>
                        {a.code} {a.name}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '600', color: '#dc2626' }}>
                        {formatRp(a.balance ?? 0)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                    <td style={{ fontWeight: '800' }}>TOTAL BIAYA</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#dc2626' }}>
                      {formatRp(totalExpense)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: '1.5rem',
          background: '#1a0a00',
          borderRadius: '0.875rem',
          padding: '1.5rem',
          color: '#fff'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>LABA/RUGI PERIODE</span>
          <span style={{ fontSize: '1.5rem', fontWeight: '800', color: profit >= 0 ? '#4ade80' : '#f87171' }}>
            {formatRp(profit)}
          </span>
        </div>
      </div>
    </div>
  )
}
