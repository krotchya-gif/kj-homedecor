'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Search, Pencil, Trash2, LandPlot } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import ActionMenu from '@/components/ui/ActionMenu'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

interface Asset {
  id: string
  code: string | null
  name: string
  category: string | null
  location: string | null
  purchase_date: string | null
  purchase_value: number
  depreciation_rate: number
  current_value: number
  status: string
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#d1fae5', text: '#065f46' },
  disposed: { bg: '#fef3c7', text: '#92400e' },
  sold: { bg: '#dbeafe', text: '#1e40af' }
}

export default function AssetsPage() {
  const { toast } = useToast()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Asset | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: '',
    name: '',
    category: '',
    location: '',
    purchase_date: '',
    purchase_value: '',
    depreciation_rate: '',
    current_value: ''
  })

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('assets').select('*').order('code')
    setAssets((data as Asset[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code?.toLowerCase().includes(search.toLowerCase()) ||
      a.category?.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditItem(null)
    setForm({
      code: '',
      name: '',
      category: '',
      location: '',
      purchase_date: '',
      purchase_value: '',
      depreciation_rate: '',
      current_value: ''
    })
    setShowForm(true)
  }

  function openEdit(a: Asset) {
    setEditItem(a)
    setForm({
      code: a.code ?? '',
      name: a.name,
      category: a.category ?? '',
      location: a.location ?? '',
      purchase_date: a.purchase_date ?? '',
      purchase_value: String(a.purchase_value ?? 0),
      depreciation_rate: String(a.depreciation_rate ?? 0),
      current_value: String(a.current_value ?? 0)
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      code: form.code || null,
      name: form.name,
      category: form.category || null,
      location: form.location || null,
      purchase_date: form.purchase_date || null,
      purchase_value: Number(form.purchase_value) || 0,
      depreciation_rate: Number(form.depreciation_rate) || 0,
      current_value: Number(form.current_value) || 0
    }
    if (editItem) {
        // UPDATE optimistic
        const prev = assets
        setAssets((curr) => curr.map((x) => (x.id === editItem.id ? { ...x, ...payload } : x)))
        const { error } = await supabase.from('assets').update(payload).eq('id', editItem.id)
        if (error) { setAssets(prev); setSaving(false); toast('error', 'Gagal simpan: ' + error.message); return }
      } else {
        // CREATE optimistic: id sementara dulu, diganti id asli dari server
        const tempId = crypto.randomUUID()
        const tempItem = { id: tempId, status: 'active', ...payload }
        setAssets((curr) => [tempItem, ...curr])
        const { data, error } = await supabase.from('assets').insert(payload).select('id').single()
        if (error) {
          setAssets((curr) => curr.filter((x) => x.id !== tempId))
          setSaving(false)
          toast('error', 'Gagal simpan: ' + error.message)
          return
        }
        if (data?.id) {
          setAssets((curr) => curr.map((x) => (x.id === tempId ? { ...x, id: data.id } : x)))

          // F-11/F-51 fix (2026-08-11): pembelian aset wajib jurnal
          // Dr Peralatan Toko / Cr Kas (agar aset masuk neraca)
          const purchaseValue = Number(form.purchase_value) || 0
          if (purchaseValue > 0) {
            try {
              const { createSimpleJournal } = await import('@/utils/journal/create')
              await createSimpleJournal({
                transaction_type: 'asset_purchase',
                reference_type: 'asset',
                reference_id: data.id,
                description: `Pembelian aset ${form.name}`,
                amount: purchaseValue,
                debit_account_id: '22222222-2222-4222-8222-222222222208', // Peralatan Toko
                credit_account_id: '22222222-2222-4222-8222-222222222201' // Kas
              })
            } catch (jErr) {
              console.error('Gagal buat jurnal pembelian aset:', jErr)
            }
          }
        }
      }
      setSaving(false)
      setShowForm(false)
      toast('success', editItem ? 'Berhasil diperbarui' : 'Berhasil ditambahkan')
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin hapus?')) return
      // Optimistic delete
      const prev = assets
      setAssets((curr) => curr.filter((x) => x.id !== id))
      const { error } = await supabase.from('assets').delete().eq('id', id)
      if (error) {
        setAssets(prev)
        // F-66 fix: FK error dibungkus pesan ramah
        if (error.code === '23503') {
          toast('error', 'Aset tidak bisa dihapus — masih terhubung ke jurnal/transaksi. Arsipkan atau gunakan menu lain.')
        } else {
          toast('error', 'Gagal hapus: ' + error.message)
        }
        return
      }
      toast('success', 'Berhasil dihapus')
  }

  return (
    <div>
      <PageHeader title="MANAJEMEN ASET" subtitle="Daftar aset perusahaan" />

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
            placeholder="Cari aset..."
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
          <Plus size={16} /> Tambah Aset
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
                  <span className="mobile-card-value">{a.code}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Nama</span>
                  <span className="mobile-card-value">{a.name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Kategori</span>
                  <span className="mobile-card-value">{a.category}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Nilai</span>
                  <span className="mobile-card-value">{a.purchase_value}</span>
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
            <LandPlot size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada aset</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Aset</th>
                <th>Kategori</th>
                <th>Lokasi</th>
                <th style={{ textAlign: 'right' }}>Nilai Buku</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const sc = STATUS_COLORS[a.status] ?? STATUS_COLORS.active
                return (
                  <tr key={a.id}>
                    <td style={{ fontFamily: 'monospace' }}>{a.code ?? '—'}</td>
                    <td style={{ fontWeight: '500' }}>{a.name}</td>
                    <td style={{ color: 'var(--neutral-600)' }}>{a.category ?? '—'}</td>
                    <td style={{ color: 'var(--neutral-600)' }}>{a.location ?? '—'}</td>
                    <td style={{ fontWeight: '600', color: '#cc7030', textAlign: 'right' }}>
                      {formatRp(a.current_value ?? 0)}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: sc.bg,
                          color: sc.text,
                          textTransform: 'capitalize'
                        }}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td>
                    <ActionMenu
                      items={[
                        { label: 'Edit', icon: <Pencil size={14} />, onClick: () => openEdit(a) },
                        { label: 'Hapus', icon: <Trash2 size={14} />, onClick: () => handleDelete(a.id), danger: true }
                      ]}
                    />
                  </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} maxWidth={520} padding="2rem" zIndex={200}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>
          {editItem ? 'Edit Aset' : 'Tambah Aset'}
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
                Kode Aset
              </label>
              <input
                type="text"
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
                Kategori
              </label>
              <input
                type="text"
                placeholder="Contoh: Kendaraan, Elektronik"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
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
              Nama Aset *
            </label>
            <input
              required
              type="text"
              placeholder="Nama aset"
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
              Lokasi
            </label>
            <input
              type="text"
              placeholder="Lokasi aset"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
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
                Tgl Pembelian
              </label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))}
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
                Nilai Perolehan
              </label>
              <input
                type="number"
                placeholder="0"
                value={form.purchase_value}
                onChange={(e) => setForm((f) => ({ ...f, purchase_value: e.target.value }))}
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
                Rate Penyusutan (%)
              </label>
              <input
                type="number"
                placeholder="0"
                value={form.depreciation_rate}
                onChange={(e) => setForm((f) => ({ ...f, depreciation_rate: e.target.value }))}
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
                Nilai Buku
              </label>
              <input
                type="number"
                placeholder="0"
                value={form.current_value}
                onChange={(e) => setForm((f) => ({ ...f, current_value: e.target.value }))}
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
