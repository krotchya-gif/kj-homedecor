'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, TrendingUp, Search, X } from 'lucide-react'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

interface CashAccount {
  id: string
  account_id: string
  bank_name: string
  account_number: string
  account_holder: string
  balance: number
}

export default function IncomePage() {
  const [incomes, setIncomes] = useState<any[]>([])
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([])
  const [revenueAccounts, setRevenueAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    cash_account_id: '', revenue_account_id: '', amount: '', description: '', entry_date: '',
  })

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const [cashRes, revRes, journalRes] = await Promise.all([
      supabase.from('cash_accounts').select('*, account:accounts(name)').eq('is_active', true),
      supabase.from('accounts').select('id, code, name').eq('type', 'revenue').order('code'),
      supabase.from('journal_entries')
        .select('*, lines:journal_lines(*), cash_account:cash_accounts!inner(account_id, bank_name, account_number)')
        .eq('reference_type', 'pemasukan')
        .order('entry_date', { ascending: false })
        .limit(200),
    ])
    setCashAccounts((cashRes.data as CashAccount[]) ?? [])
    setRevenueAccounts(revRes.data ?? [])
    setIncomes(journalRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filtered = incomes.filter(i =>
    i.description?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const amount = Number(form.amount) || 0
    const cashAcc = cashAccounts.find(c => c.id === form.cash_account_id)
    if (!cashAcc) return

    const res = await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: form.description || 'Pemasukan manual',
        entry_date: form.entry_date || new Date().toISOString().split('T')[0],
        reference_type: 'pemasukan',
        lines: [
          { account_id: cashAcc.account_id, debit: amount, credit: 0 },
          { account_id: form.revenue_account_id, debit: 0, credit: amount },
        ],
      }),
    })
    const json = await res.json()
    if (!json.error) {
      // Update cash account balance
      await supabase.rpc('update_cash_account_balance', { p_id: form.cash_account_id, p_amount: amount })
    }
    setSaving(false)
    setShowForm(false)
    fetchData()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Pemasukan</h1>
        <p className="page-subtitle">Catat pemasukan non-order (jual aset, refund, dll)</p>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="Cari deskripsi..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.625rem 1rem 0.625rem 2.25rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
        </div>
        <button onClick={() => { setShowForm(true) }} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}>
          <Plus size={16} /> Tambah Pemasukan
        </button>
      </div>

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <TrendingUp size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada pemasukan</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Deskripsi</th>
                <th>Akun Kas</th>
                <th>Akun Pendapatan</th>
                <th>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((j: any) => {
                const cashLine = j.lines?.find((l: any) => l.debit > 0)
                const revLine = j.lines?.find((l: any) => l.credit > 0)
                return (
                  <tr key={j.id}>
                    <td style={{ color: '#6b7280' }}>{new Date(j.entry_date).toLocaleDateString('id-ID')}</td>
                    <td style={{ fontWeight: '500' }}>{j.description}</td>
                    <td style={{ color: '#6b7280', fontSize: '0.82rem' }}>{cashLine?.account_id?.substring(0, 8) ?? '—'}</td>
                    <td style={{ color: '#6b7280', fontSize: '0.82rem' }}>{revLine?.account_id?.substring(0, 8) ?? '—'}</td>
                    <td style={{ fontWeight: '600', color: '#16a34a', textAlign: 'right' }}>{formatRp(cashLine?.debit ?? 0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ background: '#fff', borderRadius: '0.875rem', padding: '2rem', width: '100%', maxWidth: 480, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Tambah Pemasukan</h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Sumber Kas / Bank *</label>
                <select required value={form.cash_account_id} onChange={(e) => setForm(f => ({ ...f, cash_account_id: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }}>
                  <option value="">— Pilih Akun Kas —</option>
                  {cashAccounts.map(c => <option key={c.id} value={c.id}>{c.bank_name} — {c.account_number} ({formatRp(c.balance)})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Akun Pendapatan *</label>
                <select required value={form.revenue_account_id} onChange={(e) => setForm(f => ({ ...f, revenue_account_id: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', background: '#fff' }}>
                  <option value="">— Pilih Akun —</option>
                  {revenueAccounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Jumlah (Rp) *</label>
                  <input type="number" required placeholder="0" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Tanggal</label>
                  <input type="date" value={form.entry_date} onChange={(e) => setForm(f => ({ ...f, entry_date: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Deskripsi</label>
                <input type="text" required value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Misal: Jual aset, refund supplier..."
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: '#fff', cursor: 'pointer', fontWeight: '600' }}>Batal</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.75rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
