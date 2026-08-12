'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Settings, Save, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { formatRp } from '@/lib/utils'



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
      supabase.from('piutang').select('amount, fee_amount, paid_amount, return_amount')
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
      (s: number, p: { amount?: number; fee_amount?: number; paid_amount?: number; return_amount?: number }) => s + (p.amount ?? 0) - (p.paid_amount ?? 0) - (p.return_amount ?? 0) - (p.fee_amount ?? 0),
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
    // F-6 fix (2026-08-12): HANYA lewat jurnal pembuka — TIDAK update balance langsung.
    // Sebelumnya: update balance manual + jurnal delta → balance double-count.
    // Sekarang RPC create_journal_atomic meng-update balance otomatis dari jurnal.
    for (const [id, balance] of Object.entries(cashForm)) {
      const { data: acc } = await supabase.from('cash_accounts').select('balance, account_id').eq('id', id).single()
      const currentBalance = Number(acc?.balance ?? 0)
      const newBalance = Number(balance) || 0
      const delta = newBalance - currentBalance
      if (delta === 0) continue
      if (!acc?.account_id) {
        hadError = { message: `Akun kas ${id.slice(0, 8)} belum punya akun COA` }
        continue
      }

      // Jurnal pembuka untuk SELISIH:
      //   delta > 0 (saldo naik) → Dr Kas / Cr Modal
      //   delta < 0 (saldo turun) → Cr Kas / Dr Modal
      try {
        const { createSimpleJournal } = await import('@/utils/journal/create')
        const modalId = '44444444-4444-4444-8444-444444444401' // Modal Pemilik
        await createSimpleJournal({
          transaction_type: 'opening_balance',
          reference_type: 'cash_account',
          reference_id: id,
          description: `Penyesuaian saldo kas/bank ${id.slice(0, 8)} (${delta > 0 ? 'naik' : 'turun'})`,
          amount: Math.abs(delta),
          debit_account_id: delta > 0 ? acc.account_id : modalId,
          credit_account_id: delta > 0 ? modalId : acc.account_id
        })
      } catch (jErr) {
        console.error('Gagal buat jurnal pembuka:', jErr)
        hadError = { message: 'Jurnal penyesuaian saldo gagal — saldo tidak berubah' }
      }
    }
    await fetchData()
    setSaving(false)
    // F-63 fix: jangan tampilkan toast sukses DAN error bersamaan
    if (hadError) {
      toast('error', '⚠️ ' + hadError.message)
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
