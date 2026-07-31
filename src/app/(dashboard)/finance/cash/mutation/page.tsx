'use client'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Search, ArrowLeftRight } from 'lucide-react'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(n)

export default function CashMutationPage() {
  const [cashAccounts, setCashAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [journals, setJournals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('cash_accounts')
      .select('*, account:accounts(name)')
      .eq('is_active', true)
      .then(({ data }) => {
        setCashAccounts(data ?? [])
        if (data && data.length > 0) setSelectedAccount(data[0].id)
      })
  }, [])

  useEffect(() => {
    if (!selectedAccount) return
    setLoading(true)
    const cashAcc = cashAccounts.find((c) => c.id === selectedAccount)
    if (!cashAcc) return

    let days = 365
    if (dateRange === '7') days = 7
    else if (dateRange === '30') days = 30
    else if (dateRange === '90') days = 90
    const since = new Date()
    since.setDate(since.getDate() - days)

    supabase
      .from('journal_lines')
      .select('*, entry:journal_entries!inner(entry_date, description, reference_type)')
      .eq('account_id', cashAcc.account_id)
      .gte('entry.entry_date', since.toISOString().split('T')[0])
      .order('entry_date', {
        referencedTable: 'journal_entries',
        ascending: true
      })
      .then(({ data }) => {
        setJournals(data ?? [])
        setLoading(false)
      })
  }, [selectedAccount, dateRange])

  const cashAcc = cashAccounts.find((c) => c.id === selectedAccount)

  const runningBalance = useMemo(() => {
    if (!journals.length) return []
    const openingBalance = cashAcc?.balance ?? 0
    // Calculate opening balance before the filtered period
    const result: any[] = []
    let balance = 0
    journals.forEach((j: any) => {
      const debit = Number(j.debit ?? 0)
      const credit = Number(j.credit ?? 0)
      balance += debit - credit
      result.push({
        ...j,
        runningBalance: balance
      })
    })
    return result
  }, [journals, cashAcc])

  return (
    <div>
      <PageHeader title="Mutasi Kas & Bank" subtitle="Riwayat transaksi per akun kas/bank/e-wallet" />

      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}
      >
        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          style={{
            padding: '0.625rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            outline: 'none',
            background: '#fff',
            minWidth: 250
          }}
        >
          {cashAccounts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.bank_name} — {c.account_number} ({formatRp(c.balance)})
            </option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {[
            { label: '7 Hari', value: '7' },
            { label: '30 Hari', value: '30' },
            { label: '3 Bulan', value: '90' },
            { label: 'Semua', value: 'all' }
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateRange(opt.value)}
              style={{
                padding: '0.5rem 0.875rem',
                border: `1px solid ${dateRange === opt.value ? '#cc7030' : '#d1d5db'}`,
                borderRadius: '0.375rem',
                background: dateRange === opt.value ? '#cc7030' : '#fff',
                color: dateRange === opt.value ? '#fff' : '#374151',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.78rem'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {cashAcc && (
        <div
          style={{
            background: 'linear-gradient(135deg, #1f2937, #374151)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            marginBottom: '1.25rem',
            color: '#fff'
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#9ca3af',
              marginBottom: '0.25rem'
            }}
          >
            {cashAcc.bank_name}
          </div>
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              marginBottom: '0.25rem'
            }}
          >
            {cashAcc.account_number} — {cashAcc.account_holder}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#34d399' }}>{formatRp(cashAcc.balance)}</div>
        </div>
      )}

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
        ) : runningBalance.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <ArrowLeftRight size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada mutasi</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Deskripsi</th>
                <th>Ref</th>
                <th>Debit</th>
                <th>Kredit</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {runningBalance.map((j: any, idx) => (
                <tr key={j.id ?? idx}>
                  <td style={{ color: '#6b7280' }}>
                    {j.entry?.entry_date ? new Date(j.entry.entry_date).toLocaleDateString('id-ID') : '—'}
                  </td>
                  <td style={{ fontWeight: '500' }}>{j.entry?.description ?? '—'}</td>
                  <td style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{j.entry?.reference_type ?? '—'}</td>
                  <td
                    style={{
                      fontWeight: '600',
                      color: '#16a34a',
                      textAlign: 'right'
                    }}
                  >
                    {Number(j.debit) > 0 ? formatRp(Number(j.debit)) : '—'}
                  </td>
                  <td
                    style={{
                      fontWeight: '600',
                      color: '#dc2626',
                      textAlign: 'right'
                    }}
                  >
                    {Number(j.credit) > 0 ? formatRp(Number(j.credit)) : '—'}
                  </td>
                  <td style={{ fontWeight: '700', textAlign: 'right' }}>{formatRp(j.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
