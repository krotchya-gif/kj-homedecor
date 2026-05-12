'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Download, LandPlot } from 'lucide-react'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function CashMutationPage() {
  const [cashAccounts, setCashAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('cash_accounts')
      .select('*, account:accounts(code, name)')
      .order('bank_name')
    setCashAccounts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  function downloadPDF() {
    alert('PDF download - implement dengan jspdf atau @react-pdf/renderer')
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Mutasi Kas & Bank</h1>
          <p className="page-subtitle">Perubahan saldo kas dan bank</p>
        </div>
        <button onClick={downloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}>
          <Download size={16} /> Download PDF
        </button>
      </div>

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
        ) : cashAccounts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <LandPlot size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada akun kas/bank</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Bank</th>
                <th>No. Rekening</th>
                <th style={{ textAlign: 'right' }}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {cashAccounts.map(c => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{c.account?.code ?? '—'}</td>
                  <td style={{ fontWeight: '500' }}>{c.bank_name ?? '—'}</td>
                  <td style={{ fontFamily: 'monospace', color: '#6b7280' }}>{c.account_number ?? '—'}</td>
                  <td style={{ fontWeight: '700', textAlign: 'right', color: '#cc7030' }}>{formatRp(c.balance ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}