'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, Pencil, Trash2, Book } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const
const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  asset: { bg: '#dbeafe', text: '#1e40af' },
  liability: { bg: '#fef3c7', text: '#92400e' },
  equity: { bg: '#d1fae5', text: '#065f46' },
  revenue: { bg: '#e0e7ff', text: '#3730a3' },
  expense: { bg: '#fef2f2', text: '#991b1b' }
}

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

interface Account {
  id: string
  code: string
  name: string
  type: (typeof ACCOUNT_TYPES)[number]
  balance: number
  computed_balance?: number
  is_cash_account: boolean
  category_id?: string
  description?: string
}

export default function AccountsListPage() {
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Account | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'asset' as (typeof ACCOUNT_TYPES)[number],
    balance: '',
    is_cash_account: false,
    description: ''
  })

  const supabase = createClient()

  async function fetchAccounts() {
    setLoading(true)
    const { data: accountsData } = await supabase.from('accounts').select('*').order('code')

    // Compute balance from journal_lines for each account
    const accountsWithBalance = await Promise.all(
      (accountsData ?? []).map(async (acc: Account) => {
        const { data: lines } = await supabase.from('journal_lines').select('debit, credit').eq('account_id', acc.id)
        const totalDebit = (lines ?? []).reduce((s: number, l: any) => s + Number(l.debit ?? 0), 0)
        const totalCredit = (lines ?? []).reduce((s: number, l: any) => s + Number(l.credit ?? 0), 0)
        // For asset/expense: balance = debit - credit
        // For liability/equity/revenue: balance = credit - debit
        const isDebitNormal = ['asset', 'expense'].includes(acc.type)
        const computedBalance = isDebitNormal ? totalDebit - totalCredit : totalCredit - totalDebit
        return { ...acc, computed_balance: computedBalance + Number(acc.balance ?? 0) }
      })
    )

    setAccounts(accountsWithBalance as (Account & { computed_balance: number })[])
    setLoading(false)
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const filtered = accounts.filter(
    (a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditItem(null)
    setForm({ code: '', name: '', type: 'asset', balance: '', is_cash_account: false, description: '' })
    setShowForm(true)
  }

  function openEdit(a: Account) {
    setEditItem(a)
    setForm({
      code: a.code,
      name: a.name,
      type: a.type,
      balance: String(a.balance ?? 0),
      is_cash_account: a.is_cash_account ?? false,
      description: a.description ?? ''
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      code: form.code,
      name: form.name,
      type: form.type,
      balance: Number(form.balance) || 0,
      is_cash_account: form.is_cash_account,
      description: form.description || null
    }
    if (editItem) {
        // UPDATE optimistic
        const prev = accounts
        setAccounts((curr) => curr.map((x) => (x.id === editItem.id ? { ...x, ...payload } : x) as any))
        const { error } = await supabase.from('accounts').update(payload).eq('id', editItem.id)
        if (error) { setAccounts(prev); setSaving(false); toast('error', 'Gagal simpan: ' + error.message); return }
      } else {
        // CREATE optimistic: id sementara dulu, diganti id asli dari server
        const tempId = crypto.randomUUID()
        const tempItem = { id: tempId, ...payload }
        setAccounts((curr) => [tempItem, ...curr] as any)
        const { data, error } = await supabase.from('accounts').insert(payload).select('id').single()
        if (error) {
          setAccounts((curr) => curr.filter((x) => x.id !== tempId))
          setSaving(false)
          toast('error', 'Gagal simpan: ' + error.message)
          return
        }
        if (data?.id) {
          setAccounts((curr) => curr.map((x) => (x.id === tempId ? { ...x, id: data.id } : x)))
        }
      }
      setSaving(false)
      setShowForm(false)
      toast('success', editItem ? 'Berhasil diperbarui' : 'Berhasil ditambahkan')
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin hapus?')) return
      // Optimistic delete
      const prev = accounts
      setAccounts((curr) => curr.filter((x) => x.id !== id))
      const { error } = await supabase.from('accounts').delete().eq('id', id)
      if (error) { setAccounts(prev); toast('error', 'Gagal hapus: ' + error.message); return }
      toast('success', 'Berhasil dihapus')
  }

  return (
    <div>
      <PageHeader title="Daftar Akun" subtitle="Chart of Accounts - kode, nama, tipe, dan saldo" />

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
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
            placeholder="Cari kode atau nama..."
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
          onClick={openAdd}
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
          <Plus size={16} /> Tambah Akun
        </button>
      </div>

            {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={filtered} keyOf={(a) => a.id} renderCard={(a) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Kode</span>
                  <span className="mobile-card-value">a.code</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Nama</span>
                  <span className="mobile-card-value">a.name</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Tipe</span>
                  <span className="mobile-card-value">a.type</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Saldo</span>
                  <span className="mobile-card-value">a.balance ?? 0</span>
                </div>
                <div className="mobile-card-actions">
                  <button onClick={() => openEdit(a)} style={{ background: 'var(--neutral-100)', color: 'var(--neutral-700)', border: 'none', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDelete(a.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer' }}>Hapus</button>
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
            <Book size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada akun</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Akun</th>
                <th>Tipe</th>
                <th>Saldo</th>
                <th>Kas?</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const tc = TYPE_COLORS[a.type] ?? TYPE_COLORS.asset
                return (
                  <tr key={a.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{a.code}</td>
                    <td style={{ fontWeight: '500' }}>{a.name}</td>
                    <td>
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: tc.bg,
                          color: tc.text,
                          textTransform: 'capitalize'
                        }}
                      >
                        {a.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600', color: '#cc7030', textAlign: 'right' }}>
                      {formatRp(a.computed_balance ?? a.balance ?? 0)}
                    </td>
                    <td>{a.is_cash_account ? '✓' : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => openEdit(a)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--neutral-600)',
                            padding: '0.25rem'
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#dc2626',
                            padding: '0.25rem'
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} maxWidth={480} padding="2rem" zIndex={200}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>
          {editItem ? 'Edit Akun' : 'Tambah Akun'}
        </h2>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                Kode *
              </label>
              <input
                required
                type="text"
                placeholder="1-1100"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
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
                Tipe *
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as (typeof ACCOUNT_TYPES)[number] }))}
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
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t} style={{ textTransform: 'capitalize' }}>
                    {t}
                  </option>
                ))}
              </select>
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
              Nama Akun *
            </label>
            <input
              required
              type="text"
              placeholder="Nama lengkap akun"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                Saldo Awal
              </label>
              <input
                type="number"
                placeholder="0"
                value={form.balance}
                onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))}
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
            <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={form.is_cash_account}
                  onChange={(e) => setForm((f) => ({ ...f, is_cash_account: e.target.checked }))}
                />
                Akun Kas/Bank?
              </label>
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
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical'
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
                background: '#cc7030',
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
