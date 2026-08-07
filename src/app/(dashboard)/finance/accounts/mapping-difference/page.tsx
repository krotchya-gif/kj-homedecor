'use client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, Pencil, Trash2, GitBranch } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface Mapping {
  id: string
  transaction_type: string
  debit_account_id: string
  credit_account_id: string
  description?: string
  debit_account?: { code: string; name: string }
  credit_account?: { code: string; name: string }
}

export default function MappingDifferencePage() {
  const { toast } = useToast()
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Mapping | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    transaction_type: 'exchange_rate_diff',
    debit_account_id: '',
    credit_account_id: '',
    description: ''
  })

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('account_mappings')
      .select(
        '*, debit_account:accounts!debit_account_id(code, name), credit_account:accounts!credit_account_id(code, name)'
      )
      .eq('transaction_type', 'exchange_rate_diff')
      .order('transaction_type')
    setMappings((data as Mapping[]) ?? [])
    const { data: acc } = await supabase.from('accounts').select('id, code, name, type').order('code')
    setAccounts(acc ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  function openAdd() {
    setEditItem(null)
    setForm({ transaction_type: 'exchange_rate_diff', debit_account_id: '', credit_account_id: '', description: '' })
    setShowForm(true)
  }

  function openEdit(m: Mapping) {
    setEditItem(m)
    setForm({
      transaction_type: m.transaction_type,
      debit_account_id: m.debit_account_id,
      credit_account_id: m.credit_account_id,
      description: m.description ?? ''
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      transaction_type: 'exchange_rate_diff',
      debit_account_id: form.debit_account_id || null,
      credit_account_id: form.credit_account_id || null,
      description: form.description || 'Pemetaan selisih kurs/selisih harga'
    }
    if (editItem) {
        // UPDATE optimistic
        const prev = mappings
        setMappings((curr) => curr.map((x) => (x.id === editItem.id ? { ...x, ...payload } : x) as any))
        const { error } = await supabase.from('account_mappings').update(payload).eq('id', editItem.id)
        if (error) { setMappings(prev); setSaving(false); toast('error', 'Gagal simpan: ' + error.message); return }
      } else {
        // CREATE optimistic: id sementara dulu, diganti id asli dari server
        const tempId = crypto.randomUUID()
        const tempItem = { id: tempId, ...payload }
        setMappings((curr) => [tempItem, ...curr] as any)
        const { data, error } = await supabase.from('account_mappings').insert(payload).select('id').single()
        if (error) {
          setMappings((curr) => curr.filter((x) => x.id !== tempId))
          setSaving(false)
          toast('error', 'Gagal simpan: ' + error.message)
          return
        }
        if (data?.id) {
          setMappings((curr) => curr.map((x) => (x.id === tempId ? { ...x, id: data.id } : x)))
        }
      }
      setSaving(false)
      setShowForm(false)
      toast('success', editItem ? 'Berhasil diperbarui' : 'Berhasil ditambahkan')
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin hapus?')) return
      // Optimistic delete
      const prev = mappings
      setMappings((curr) => curr.filter((x) => x.id !== id))
      const { error } = await supabase.from('account_mappings').delete().eq('id', id)
      if (error) { setMappings(prev); toast('error', 'Gagal hapus: ' + error.message); return }
      toast('success', 'Berhasil dihapus')
  }

  return (
    <div>
      <PageHeader title="Pemetaan Akun Selisih" subtitle="Mapping untuk selisih kurs dan selisih harga" />

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
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
          <Plus size={16} /> Tambah Mapping Selisih
        </button>
      </div>

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : mappings.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <GitBranch size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada mapping selisih</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tipe</th>
                <th>Akun Debit</th>
                <th>Akun Kredit</th>
                <th>Deskripsi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: '600' }}>Selisih Kurs/Harga</td>
                  <td>
                    {m.debit_account ? <span style={{ fontFamily: 'monospace' }}>{m.debit_account.code}</span> : '—'}{' '}
                    {m.debit_account?.name ?? ''}
                  </td>
                  <td>
                    {m.credit_account ? <span style={{ fontFamily: 'monospace' }}>{m.credit_account.code}</span> : '—'}{' '}
                    {m.credit_account?.name ?? ''}
                  </td>
                  <td style={{ color: 'var(--neutral-600)' }}>{m.description ?? '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => openEdit(m)}
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
                        onClick={() => handleDelete(m.id)}
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
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} maxWidth={480} padding="2rem" zIndex={200}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Tambah Mapping Selisih</h2>
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
                Akun Debit (Selisih Masuk)
              </label>
              <select
                value={form.debit_account_id}
                onChange={(e) => setForm((f) => ({ ...f, debit_account_id: e.target.value }))}
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
                {accounts.map((a) => (
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
                Akun Kredit (Selisih Keluar)
              </label>
              <select
                value={form.credit_account_id}
                onChange={(e) => setForm((f) => ({ ...f, credit_account_id: e.target.value }))}
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
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
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
              Deskripsi
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Contoh: Selisih kurs marketplace"
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
