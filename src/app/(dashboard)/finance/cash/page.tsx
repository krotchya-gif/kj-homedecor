'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, Pencil, Trash2, LandPlot } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import ActionMenu from '@/components/ui/ActionMenu'
import Pagination from '@/components/ui/Pagination'
import { formatRp } from '@/lib/utils'


interface CashAccount {
  id: string
  account_id: string | null
  bank_name: string
  account_number: string
  account_holder: string
  balance: number
  is_active: boolean
  account?: { code: string; name: string }
}

export default function CashPage() {
  const { toast } = useToast()
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([])
  const [accounts, setAccounts] = useState<{ id: string; name?: string; code?: string }[]>([])
const [loading, setLoading] = useState(true)
const [search, setSearch] = useState('')
const [page, setPage] = useState(0)
const [pageSize, setPageSize] = useState(10)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<CashAccount | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    account_id: '',
    bank_name: '',
    account_number: '',
    account_holder: ''
  })

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('cash_accounts').select('*, account:accounts(code, name)').order('bank_name')
    setCashAccounts((data as CashAccount[]) ?? [])
    const { data: acc } = await supabase
      .from('accounts')
      .select('id, code, name')
      .eq('is_cash_account', true)
      .order('code')
    setAccounts(acc ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = cashAccounts.filter(
    (c) => c.bank_name?.toLowerCase().includes(search.toLowerCase()) || c.account_number?.includes(search)
  )

  function openAdd() {
    setEditItem(null)
    setForm({ account_id: '', bank_name: '', account_number: '', account_holder: '' })
    setShowForm(true)
  }

  function openEdit(c: CashAccount) {
    setEditItem(c)
    setForm({
      account_id: c.account_id ?? '',
      bank_name: c.bank_name ?? '',
      account_number: c.account_number ?? '',
      account_holder: c.account_holder ?? ''
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    // F-22 fix: akun COA WAJIB (journal_lines.account_id NOT NULL)
    if (!form.account_id) {
      setSaving(false)
      toast('error', 'Akun COA wajib dipilih.')
      return
    }
    // F-20/F-25 fix: saldo TIDAK diinput manual — hanya bergerak via jurnal
    // (create_journal_atomic meng-update balance otomatis saat ada transaksi)
    const payload = {
      account_id: form.account_id,
      bank_name: form.bank_name,
      account_number: form.account_number,
      account_holder: form.account_holder || null
    }
    if (editItem) {
        // UPDATE optimistic
        const prev = cashAccounts
        setCashAccounts((curr) => curr.map((x) => (x.id === editItem.id ? ({ ...x, ...payload } as CashAccount) : x)))
        const { error } = await supabase.from('cash_accounts').update(payload).eq('id', editItem.id)
        if (error) { setCashAccounts(prev); setSaving(false); toast('error', 'Gagal simpan: ' + error.message); return }
      } else {
        // CREATE optimistic: id sementara dulu, diganti id asli dari server
        const tempId = crypto.randomUUID()
        const tempItem = { id: tempId, ...payload }
        setCashAccounts((curr) => [tempItem as CashAccount, ...curr])
        const { data, error } = await supabase.from('cash_accounts').insert(payload).select('id').single()
        if (error) {
          setCashAccounts((curr) => curr.filter((x) => x.id !== tempId))
          setSaving(false)
          toast('error', 'Gagal simpan: ' + error.message)
          return
        }
        if (data?.id) {
          setCashAccounts((curr) => curr.map((x) => (x.id === tempId ? { ...x, id: data.id } : x)))
        }
      }
      setSaving(false)
      setShowForm(false)
      toast('success', editItem ? 'Berhasil diperbarui' : 'Berhasil ditambahkan')
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin hapus?')) return
      // Optimistic delete
      const prev = cashAccounts
      setCashAccounts((curr) => curr.filter((x) => x.id !== id))
      const { error } = await supabase.from('cash_accounts').delete().eq('id', id)
      if (error) { setCashAccounts(prev); toast('error', 'Gagal hapus: ' + error.message); return }
      toast('success', 'Berhasil dihapus')
  }

  return (
    <div>
      <PageHeader title="KAS & BANK" subtitle="Pengelolaan kas dan rekening bank" />

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
            placeholder="Cari bank atau no rekening..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
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
          <Plus size={16} /> Tambah Kas/Bank
        </button>
      </div>

            {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={filtered.slice(page * pageSize, (page + 1) * pageSize)} keyOf={(c) => c.id} renderCard={(c) => (
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
                  <span className="mobile-card-value">{formatRp(c.balance ?? 0)}</span>
                </div>
                <div className="mobile-card-actions">
                  <button onClick={() => openEdit(c)} style={{ background: 'var(--neutral-100)', color: 'var(--neutral-700)', border: 'none', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDelete(c.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer' }}>Hapus</button>
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
            <LandPlot size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada akun kas/bank</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Bank</th>
                <th>No. Rekening</th>
                <th>Nama Pemilik</th>
                <th style={{ textAlign: 'right' }}>Saldo</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(page * pageSize, (page + 1) * pageSize).map((c) => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'monospace' }}>{c.account?.code ?? '—'}</td>
                  <td style={{ fontWeight: '600' }}>{c.bank_name ?? '—'}</td>
                  <td style={{ fontFamily: 'monospace' }}>{c.account_number ?? '—'}</td>
                  <td style={{ color: 'var(--neutral-600)' }}>{c.account_holder ?? '—'}</td>
                  <td style={{ fontWeight: '700', color: '#cc7030', textAlign: 'right' }}>
                    {formatRp(c.balance ?? 0)}
                  </td>
                  <td>
                    <ActionMenu
                      items={[
                        { label: 'Edit', icon: <Pencil size={14} />, onClick: () => openEdit(c) },
                        { label: 'Hapus', icon: <Trash2 size={14} />, onClick: () => handleDelete(c.id), danger: true }
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* SESI 52 (Wave 3): pagination di LUAR .desktop-only — mobile juga butuh
          kontrol halaman (MobileCards di-slice filtered). */}
      {filtered.length > 0 && (
        <div style={{ padding: '0 1.25rem 1rem' }}>
          <Pagination
            currentPage={page + 1}
            totalPages={Math.max(1, Math.ceil(filtered.length / pageSize))}
            onPageChange={(p) => setPage(p - 1)}
            pageSize={pageSize}
            onPageSizeChange={(s) => {
              setPageSize(s)
              setPage(0)
            }}
            totalItems={filtered.length}
            startIndex={page * pageSize + 1}
            endIndex={Math.min((page + 1) * pageSize, filtered.length)}
          />
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} maxWidth={480} padding="2rem" zIndex={200}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>
          {editItem ? 'Edit Kas/Bank' : 'Tambah Kas/Bank'}
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
              Akun COA *
            </label>
            <select
              required
              value={form.account_id}
              onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))}
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
              <option value="">— Pilih Akun —</option>
              {/* 088 (audit 2026-08-14): akun COA yang SUDAH dipetakan ke kas/bank
                  tidak ditawarkan saat TAMBAH (UNIQUE cash_accounts.account_id).
                  Saat EDIT, akun milik baris ini tetap tersedia. */}
              {(accounts ?? []).filter(
                (a) => editItem || !(cashAccounts ?? []).some((c) => c.account_id === a.id)
              ).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} - {a.name}
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
              Nama Bank *
            </label>
            <input
              required
              type="text"
              placeholder="BCA, Mandiri, BRI, dll"
              value={form.bank_name}
              onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
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
                No. Rekening
              </label>
              <input
                type="text"
                value={form.account_number}
                onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
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
                Nama Pemilik
              </label>
              <input
                type="text"
                value={form.account_holder}
                onChange={(e) => setForm((f) => ({ ...f, account_holder: e.target.value }))}
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
