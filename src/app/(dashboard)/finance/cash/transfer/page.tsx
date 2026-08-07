'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, ArrowLeftRight, Search, X, History } from 'lucide-react'

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
  balance: number
}

export default function TransferPage() {
  const { toast } = useToast()
  const [transfers, setTransfers] = useState<any[]>([])
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    description: '',
    entry_date: ''
  })

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const [cashRes, journalRes] = await Promise.all([
      supabase.from('cash_accounts').select('*, account:accounts(name)').eq('is_active', true),
      supabase
        .from('journal_entries')
        .select('*, lines:journal_lines(*)')
        .eq('reference_type', 'transfer')
        .order('entry_date', { ascending: false })
        .limit(200)
    ])
    setCashAccounts((cashRes.data as CashAccount[]) ?? [])
    setTransfers(journalRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = transfers.filter((t) => t.description?.toLowerCase().includes(search.toLowerCase()))

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const amount = Number(form.amount) || 0
    const fromAcc = cashAccounts.find((c) => c.id === form.from_account_id)
    const toAcc = cashAccounts.find((c) => c.id === form.to_account_id)
    if (!fromAcc || !toAcc) return

    const res = await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: form.description || 'Transfer kas',
        entry_date: form.entry_date || new Date().toISOString().split('T')[0],
        reference_type: 'transfer',
        lines: [
          { account_id: toAcc.account_id, debit: amount, credit: 0 },
          { account_id: fromAcc.account_id, debit: 0, credit: amount }
        ]
      })
    })
    const json = await res.json()
    if (!json.error) {
      // Update both balances directly
      const { error: fromErr } = await supabase
        .from('cash_accounts')
        .update({ balance: fromAcc.balance - amount })
        .eq('id', form.from_account_id)
      if (fromErr) { console.error('Update balance akun asal gagal:', fromErr); toast('warning', '⚠️ Jurnal tercatat, tapi saldo akun asal tidak ter-update: ' + fromErr.message) }
      const { error: toErr } = await supabase
        .from('cash_accounts')
        .update({ balance: toAcc.balance + amount })
        .eq('id', form.to_account_id)
      if (toErr) { console.error('Update balance akun tujuan gagal:', toErr); toast('warning', '⚠️ Jurnal tercatat, tapi saldo akun tujuan tidak ter-update: ' + toErr.message) }
    } else {
      toast('error', 'Gagal transfer: ' + (json.error?.message ?? 'Terjadi kesalahan'))
      setSaving(false)
      return
    }
    setSaving(false)
    setShowForm(false)
    fetchData()
    toast('success', 'Transfer kas berhasil dicatat')
  }

  return (
    <div>
      <PageHeader title="Transfer Kas" subtitle="Pemindahan saldo antar akun kas/bank/e-wallet" />

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
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: '600',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          <Plus size={16} /> Transfer Baru
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
                  <span className="mobile-card-value">{j.amount}</span>
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
            <History size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada transfer</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Deskripsi</th>
                <th>Dari</th>
                <th>Ke</th>
                <th>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((j: any) => {
                const creditLine = j.lines?.find((l: any) => l.credit > 0)
                const debitLine = j.lines?.find((l: any) => l.debit > 0)
                return (
                  <tr key={j.id}>
                    <td style={{ color: 'var(--neutral-600)' }}>{new Date(j.entry_date).toLocaleDateString('id-ID')}</td>
                    <td style={{ fontWeight: '500' }}>{j.description}</td>
                    <td style={{ color: '#dc2626', fontSize: '0.82rem' }}>
                      {creditLine?.account_id?.substring(0, 8) ?? '—'}
                    </td>
                    <td style={{ color: '#16a34a', fontSize: '0.82rem' }}>
                      {debitLine?.account_id?.substring(0, 8) ?? '—'}
                    </td>
                    <td style={{ fontWeight: '700', textAlign: 'right' }}>{formatRp(creditLine?.credit ?? 0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} maxWidth={480} padding="2rem" zIndex={200}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Transfer Antar Kas</h2>
          <button
            onClick={() => setShowForm(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--neutral-600)'
            }}
          >
            <X size={20} />
          </button>
        </div>
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
              Dari Akun *
            </label>
            <select
              required
              value={form.from_account_id}
              onChange={(e) => setForm((f) => ({ ...f, from_account_id: e.target.value }))}
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
              <option value="">— Pilih Akun Asal —</option>
              {cashAccounts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.bank_name} — {c.account_number} ({formatRp(c.balance)})
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
              Ke Akun *
            </label>
            <select
              required
              value={form.to_account_id}
              onChange={(e) => setForm((f) => ({ ...f, to_account_id: e.target.value }))}
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
              <option value="">— Pilih Akun Tujuan —</option>
              {cashAccounts
                .filter((c) => c.id !== form.from_account_id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.bank_name} — {c.account_number} ({formatRp(c.balance)})
                  </option>
                ))}
            </select>
            {form.from_account_id && form.from_account_id === form.to_account_id && (
              <p
                style={{
                  color: '#dc2626',
                  fontSize: '0.78rem',
                  marginTop: '0.25rem'
                }}
              >
                Akun asal dan tujuan harus berbeda
              </p>
            )}
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
              Deskripsi
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Misal: Setor tunai ke bank"
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
              disabled={saving || form.from_account_id === form.to_account_id}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              {saving ? 'Menyimpan...' : 'Transfer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
