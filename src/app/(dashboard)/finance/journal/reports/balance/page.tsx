'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Download, BarChart3 } from 'lucide-react'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function BalanceSheetPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() })

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('accounts').select('*, journal_lines(debit, credit)').order('code')
    setAccounts(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const totalAssets = accounts.filter((a) => a.type === 'asset').reduce((s, a) => s + (a.balance ?? 0), 0)
  const totalLiabilities = accounts.filter((a) => a.type === 'liability').reduce((s, a) => s + (a.balance ?? 0), 0)
  const totalEquity = accounts.filter((a) => a.type === 'equity').reduce((s, a) => s + (a.balance ?? 0), 0)

  function downloadPDF() {
    alert('PDF download - implement dengan jspdf atau @react-pdf/renderer')
  }

  return (
    <div>
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h1 className="page-title">Laporan Neraca</h1>
          <p className="page-subtitle">Laporan posisi keuangan per periode</p>
        </div>
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
      </div>

      <div
        className="chart-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginTop: '1.5rem'
        }}
      >
        {/* ASSETS */}
        <div
          className="chart-card"
          style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.875rem', overflow: 'hidden' }}
        >
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#fef3c7' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#92400e' }}>ASET</h2>
          </div>
          <div className="data-table">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
            ) : (
              <table>
                <tbody>
                  {accounts
                    .filter((a) => a.type === 'asset')
                    .map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: '500' }}>
                          {a.code} {a.name}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatRp(a.balance ?? 0)}</td>
                      </tr>
                    ))}
                  <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                    <td style={{ fontWeight: '700' }}>TOTAL ASET</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#92400e' }}>{formatRp(totalAssets)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* LIABILITIES + EQUITY */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.875rem', overflow: 'hidden' }}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#fef3c7' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#92400e' }}>LIABILITAS</h2>
            </div>
            <div className="data-table">
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
              ) : (
                <table>
                  <tbody>
                    {accounts
                      .filter((a) => a.type === 'liability')
                      .map((a) => (
                        <tr key={a.id}>
                          <td style={{ fontWeight: '500' }}>
                            {a.code} {a.name}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatRp(a.balance ?? 0)}</td>
                        </tr>
                      ))}
                    <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                      <td style={{ fontWeight: '700' }}>TOTAL LIABILITAS</td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: '#dc2626' }}>
                        {formatRp(totalLiabilities)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div
            style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.875rem', overflow: 'hidden' }}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#fef3c7' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#92400e' }}>EKUITAS</h2>
            </div>
            <div className="data-table">
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
              ) : (
                <table>
                  <tbody>
                    {accounts
                      .filter((a) => a.type === 'equity')
                      .map((a) => (
                        <tr key={a.id}>
                          <td style={{ fontWeight: '500' }}>
                            {a.code} {a.name}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatRp(a.balance ?? 0)}</td>
                        </tr>
                      ))}
                    <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                      <td style={{ fontWeight: '700' }}>TOTAL EKUITAS</td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: '#16a34a' }}>
                        {formatRp(totalEquity)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
