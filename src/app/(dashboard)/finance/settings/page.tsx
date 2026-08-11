'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Settings, Save, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(n)

interface CashAccountRow {
  id: string
  name?: string
  balance?: number
  bank_name?: string
  account_number?: string
  account_holder?: string
}

export default function FinanceSettingsPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('saldo')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Opening balance form
  const [cashAccounts, setCashAccounts] = useState<CashAccountRow[]>([])
  const [hutangData, setHutangData] = useState({ total: 0, count: 0 })
  const [piutangData, setPiutangData] = useState({ total: 0, count: 0 })
  const [cashForm, setCashForm] = useState<Record<string, string>>({})

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const [cashRes, hutangRes, piutangRes] = await Promise.all([
      supabase.from('cash_accounts').select('*').eq('is_active', true).order('bank_name'),
      supabase.from('hutang').select('amount, paid_amount, return_amount'),
      supabase.from('piutang').select('amount, paid_amount, return_amount')
    ])
    setCashAccounts(cashRes.data ?? [])
    const initForm: Record<string, string> = {}
    ;((cashRes.data ?? []) as CashAccountRow[]).forEach((c) => {
      initForm[c.id] = String(c.balance ?? 0)
    })
    setCashForm(initForm)

    const hutTotal = (hutangRes.data ?? []).reduce(
      (s: number, h: { amount?: number; paid_amount?: number; return_amount?: number }) => s + (h.amount ?? 0) - (h.paid_amount ?? 0) - (h.return_amount ?? 0),
      0
    )
    setHutangData({ total: hutTotal, count: (hutangRes.data ?? []).length })

    const piuTotal = (piutangRes.data ?? []).reduce(
      (s: number, p: { amount?: number; paid_amount?: number; return_amount?: number }) => s + (p.amount ?? 0) - (p.paid_amount ?? 0) - (p.return_amount ?? 0),
      0
    )
    setPiutangData({ total: piuTotal, count: (piutangRes.data ?? []).length })

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function handleSaveCashBalances() {
    setSaving(true)
    let hadError: { message: string } | null = null
    const previous: Record<string, number> = {}
    // F-25 fix (2026-08-11): saldo awal via jurnal pembuka (Dr Kas / Cr Modal) —
    // agar neraca balance dari awal. Simpan nilai lama untuk delta.
    for (const [id, balance] of Object.entries(cashForm)) {
      const { data: acc } = await supabase.from('cash_accounts').select('balance, account_id').eq('id', id).single()
      previous[id] = Number(acc?.balance ?? 0)
      const { error } = await supabase
        .from('cash_accounts')
        .update({ balance: Number(balance) || 0 })
        .eq('id', id)
      if (error) hadError = error

      // Jurnal pembuka untuk SELISIH (Dr Kas / Cr Modal Pemilik — saldo awal)
      const newBalance = Number(balance) || 0
      const delta = newBalance - previous[id]
      if (delta !== 0 && acc?.account_id) {
        try {
          const { createSimpleJournal } = await import('@/utils/journal/create')
          await createSimpleJournal({
            transaction_type: 'opening_balance',
            reference_type: 'cash_account',
            reference_id: id,
            description: `Saldo awal kas/bank ${id.slice(0, 8)}`,
            amount: Math.abs(delta),
            debit_account_id: acc.account_id, // Dr Kas
            credit_account_id: '44444444-4444-4444-8444-444444444401' // Cr Modal Pemilik
          })
        } catch (jErr) {
          console.error('Gagal buat jurnal pembuka:', jErr)
        }
      }
    }
    await fetchData()
    setSaving(false)
    // F-63 fix: jangan tampilkan toast sukses DAN error bersamaan
    if (hadError) {
      toast('error', '⚠️ Beberapa saldo gagal disimpan: ' + hadError.message)
      return
    }
    toast('success', 'Saldo kas/bank berhasil disimpan!')
  }

  const tabs = [
    { id: 'saldo', label: 'Saldo Awal Kas/Bank' },
    { id: 'hutang', label: 'Hutang' },
    { id: 'piutang', label: 'Piutang' }
  ]

  return (
    <div>
      <PageHeader title="Pengaturan Keuangan" subtitle="Input saldo awal dan pengaturan akun keuangan" />

      <div
        style={{
          display: 'flex',
          gap: '0.375rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '0.75rem',
          flexWrap: 'wrap'
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: activeTab === tab.id ? '#cc7030' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--neutral-600)',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.85rem'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
      ) : (
        <>
          {activeTab === 'saldo' && (
            <div>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--neutral-600)',
                  marginBottom: '1rem'
                }}
              >
                Atur saldo awal untuk setiap akun kas, bank, dan e-wallet. Gunakan fitur ini saat pertama kali
                menggunakan sistem keuangan.
              </p>
                    {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : cashAccounts.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={cashAccounts} keyOf={(c) => c.id} renderCard={(c) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Bank</span>
                  <span className="mobile-card-value">{c.bank_name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">No. Rekening</span>
                  <span className="mobile-card-value">{c.account_number}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Saldo</span>
                  <span className="mobile-card-value">{c.balance}</span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
                <table>
                  <thead>
                    <tr>
                      <th>Nama Bank/Kas</th>
                      <th>No. Rekening</th>
                      <th>Atas Nama</th>
                      <th>Saldo Saat Ini</th>
                      <th style={{ width: 200 }}>Saldo Awal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashAccounts.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: '500' }}>{c.bank_name}</td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--neutral-600)' }}>{c.account_number ?? '—'}</td>
                        <td style={{ color: 'var(--neutral-600)' }}>{c.account_holder ?? '—'}</td>
                        <td style={{ fontWeight: '600', textAlign: 'right' }}>{formatRp(c.balance ?? 0)}</td>
                        <td>
                          <input
                            type="number"
                            value={cashForm[c.id] ?? '0'}
                            onChange={(e) =>
                              setCashForm((f) => ({
                                ...f,
                                [c.id]: e.target.value
                              }))
                            }
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.375rem',
                              fontSize: '0.85rem',
                              textAlign: 'right',
                              outline: 'none'
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={handleSaveCashBalances}
                disabled={saving}
                style={{
                  marginTop: '1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.625rem 1.5rem',
                  background: '#cc7030',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Saldo Awal'}
              </button>
            </div>
          )}

          {activeTab === 'hutang' && (
            <div>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--neutral-600)',
                  marginBottom: '1rem'
                }}
              >
                Ringkasan hutang supplier saat ini. Data ini berasal dari tagihan yang sudah dicatat di menu Hutang.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}
              >
                <div
                  style={{
                    background: '#fef3c7',
                    borderRadius: '0.75rem',
                    padding: '1.25rem'
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      color: '#92400e',
                      fontWeight: '600',
                      marginBottom: '0.25rem'
                    }}
                  >
                    Total Hutang
                  </div>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      color: '#92400e'
                    }}
                  >
                    {formatRp(hutangData.total)}
                  </div>
                </div>
                <div
                  style={{
                    background: '#dbeafe',
                    borderRadius: '0.75rem',
                    padding: '1.25rem'
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      color: '#1e40af',
                      fontWeight: '600',
                      marginBottom: '0.25rem'
                    }}
                  >
                    Jumlah Tagihan
                  </div>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      color: '#1e40af'
                    }}
                  >
                    {hutangData.count} tagihan
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--neutral-400)' }}>
                Untuk input saldo awal hutang, gunakan menu <strong>Hutang → Tambah Tagihan</strong>. Saldo awal
                otomatis tercatat dari tagihan yang sudah ada.
              </p>
            </div>
          )}

          {activeTab === 'piutang' && (
            <div>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--neutral-600)',
                  marginBottom: '1rem'
                }}
              >
                Ringkasan piutang pelanggan saat ini. Data ini berasal dari faktur yang sudah dicatat di menu Piutang.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}
              >
                <div
                  style={{
                    background: '#d1fae5',
                    borderRadius: '0.75rem',
                    padding: '1.25rem'
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      color: '#065f46',
                      fontWeight: '600',
                      marginBottom: '0.25rem'
                    }}
                  >
                    Total Piutang
                  </div>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      color: '#065f46'
                    }}
                  >
                    {formatRp(piutangData.total)}
                  </div>
                </div>
                <div
                  style={{
                    background: '#fce7f3',
                    borderRadius: '0.75rem',
                    padding: '1.25rem'
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      color: '#9d174d',
                      fontWeight: '600',
                      marginBottom: '0.25rem'
                    }}
                  >
                    Jumlah Faktur
                  </div>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      color: '#9d174d'
                    }}
                  >
                    {piutangData.count} faktur
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--neutral-400)' }}>
                Untuk input saldo awal piutang, gunakan menu <strong>Piutang → Faktur → Tambah Faktur</strong>. Saldo
                awal otomatis tercatat dari faktur yang sudah ada.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
