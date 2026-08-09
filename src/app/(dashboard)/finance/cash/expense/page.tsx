'use client'
import type { JournalEntry, JournalLine } from '@/types'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, TrendingDown, Search, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(n)

interface CashAccount {
  id: string
  account_id: string
  bank_name: string
  account_number: string
  account_holder: string
  balance: number
}

export default function ExpensePage() {
  const { toast } = useToast()
  const [expenses, setExpenses] = useState<JournalEntry[]>([])
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([])
  const [expenseAccounts, setExpenseAccounts] = useState<{ id: string; name?: string; code?: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    cash_account_id: '',
    expense_account_id: '',
    amount: '',
    description: '',
    entry_date: ''
  })

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const [cashRes, expRes, journalRes] = await Promise.all([
      supabase.from('cash_accounts').select('*, account:accounts(name)').eq('is_active', true),
      supabase.from('accounts').select('id, code, name').eq('type', 'expense').order('code'),
      supabase
        .from('journal_entries')
        .select('*, lines:journal_lines(*)')
        .eq('reference_type', 'pengeluaran')
        .order('entry_date', { ascending: false })
        .limit(200)
    ])
    setCashAccounts((cashRes.data as CashAccount[]) ?? [])
    setExpenseAccounts(expRes.data ?? [])
    setExpenses(journalRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = expenses.filter((i) => i.description?.toLowerCase().includes(search.toLowerCase()))

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const amount = Number(form.amount) || 0
    const cashAcc = cashAccounts.find((c) => c.id === form.cash_account_id)
    if (!cashAcc) return

    const res = await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: form.description || 'Pengeluaran',
        entry_date: form.entry_date || new Date().toISOString().split('T')[0],
        reference_type: 'pengeluaran',
        lines: [
          { account_id: form.expense_account_id, debit: amount, credit: 0 },
          { account_id: cashAcc.account_id, debit: 0, credit: amount }
        ]
      })
    })
    const json = await res.json()
    if (!json.error) {
      const { error: rpcErr } = await supabase.rpc('update_cash_account_balance', {
        p_id: form.cash_account_id,
        p_amount: -amount
      })
      if (rpcErr) { console.error('RPC update_cash_account_balance gagal:', rpcErr); toast('warning', '⚠️ Jurnal tercatat, tapi saldo kas TIDAK ter-update: ' + rpcErr.message) }
    }
    setSaving(false)
    setShowForm(false)
    fetchData()
  }

  return (
    <div>
      <PageHeader title="Pengeluaran" subtitle="Catat biaya operasional harian" />

      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--neutral-400)'
            }}
          />
          <input
            type="text"
            placeholder="Cari deskripsi..."
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
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.625rem 1.25rem',
            background: '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: '600',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          <Plus size={16} /> Tambah Pengeluaran
        </button>
      </div>

            {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={filtered} keyOf={(j) => j.id} renderCard={(j) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Tanggal</span>
                  <span className="mobile-card-value">{j.entry_date ?? j.date}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Keterangan</span>
                  <span className="mobile-card-value">{j.description ?? j.notes}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Jumlah</span>
                  <span className="mobile-card-value">{j.debit ?? j.amount}</span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <TrendingDown size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada pengeluaran</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Deskripsi</th>
                <th>Akun Beban</th>
                <th>Sumber Kas</th>
                <th>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((j: JournalEntry) => {
                const expenseLine = j.lines?.find((l: JournalLine) => l.debit > 0)
                const cashLine = j.lines?.find((l: JournalLine) => l.credit > 0)
                return (
                  <tr key={j.id}>
                    <td style={{ color: 'var(--neutral-600)' }}>{new Date(j.entry_date ?? j.date ?? '').toLocaleDateString('id-ID')}</td>
                    <td style={{ fontWeight: '500' }}>{j.description}</td>
                    <td style={{ color: 'var(--neutral-600)', fontSize: '0.82rem' }}>
                      {expenseLine?.account_id?.substring(0, 8) ?? '—'}
                    </td>
                    <td style={{ color: 'var(--neutral-600)', fontSize: '0.82rem' }}>
                      {cashLine?.account_id?.substring(0, 8) ?? '—'}
                    </td>
                    <td
                      style={{
                        fontWeight: '600',
                        color: '#dc2626',
                        textAlign: 'right'
                      }}
                    >
                      {formatRp(cashLine?.credit ?? 0)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} maxWidth={480} padding="2rem" zIndex={200}>
        <h2
          style={{
            fontSize: '1.1rem',
            fontWeight: '700',
            marginBottom: '1.5rem'
          }}
        >
          Tambah Pengeluaran
        </h2>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'var(--neutral-700)',
                marginBottom: '0.3rem'
              }}
            >
              Akun Beban *
            </label>
            <select
              required
              value={form.expense_account_id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  expense_account_id: e.target.value
                }))
              }
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                background: 'var(--surface)'
              }}
            >
              <option value="">— Pilih Akun Beban —</option>
              {expenseAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'var(--neutral-700)',
                marginBottom: '0.3rem'
              }}
            >
              Sumber Dana (Kas/Bank) *
            </label>
            <select
              required
              value={form.cash_account_id}
              onChange={(e) => setForm((f) => ({ ...f, cash_account_id: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                background: 'var(--surface)'
              }}
            >
              <option value="">— Pilih Akun Kas —</option>
              {cashAccounts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.bank_name} — {c.account_number} ({formatRp(c.balance)})
                </option>
              ))}
            </select>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem'
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: 'var(--neutral-700)',
                  marginBottom: '0.3rem'
                }}
              >
                Jumlah (Rp) *
              </label>
              <input
                type="number"
                required
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: 'var(--neutral-700)',
                  marginBottom: '0.3rem'
                }}
              >
                Tanggal
              </label>
              <input
                type="date"
                value={form.entry_date}
                onChange={(e) => setForm((f) => ({ ...f, entry_date: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'var(--neutral-700)',
                marginBottom: '0.3rem'
              }}
            >
              Deskripsi *
            </label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Misal: Listrik, ATK, Transport..."
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                background: 'var(--surface)',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
