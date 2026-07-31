'use client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { RefreshCw, Search, X, Check } from 'lucide-react'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(n)

export default function ProsesReturPage() {
  const [hutang, setHutang] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showRetur, setShowRetur] = useState(false)
  const [returItem, setReturItem] = useState<any>(null)
  const [returForm, setReturForm] = useState({
    amount: '',
    reason: '',
    date: ''
  })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('hutang')
      .select('*, supplier:suppliers(name)')
      .order('created_at', { ascending: false })
    setHutang(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = hutang.filter(
    (h) =>
      h.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
      h.invoice_number?.toLowerCase().includes(search.toLowerCase())
  )

  function openReturForm(h: any) {
    setReturItem(h)
    const sisa = (h.amount ?? 0) - (h.paid_amount ?? 0) - (h.return_amount ?? 0)
    setReturForm({
      amount: String(sisa),
      reason: '',
      date: new Date().toISOString().split('T')[0]
    })
    setShowRetur(true)
  }

  async function handleRetur(e: React.FormEvent) {
    e.preventDefault()
    if (!returItem) return
    setSaving(true)
    const returAmount = Number(returForm.amount) || 0
    const newReturnAmount = (returItem.return_amount ?? 0) + returAmount
    const sisa = (returItem.amount ?? 0) - (returItem.paid_amount ?? 0) - newReturnAmount

    const { error } = await supabase
      .from('hutang')
      .update({
        return_amount: newReturnAmount,
        return_reason: returForm.reason || null,
        return_date: returForm.date || null,
        status: sisa <= 0 ? 'paid' : 'partial'
      })
      .eq('id', returItem.id)

    if (!error) {
      // Create journal entry for the return
      const accountRes = await supabase.from('accounts').select('id').eq('code', '5-1000').single()
      const cashAccountRes = await supabase.from('cash_accounts').select('account_id').limit(1).single()

      if (accountRes.data && cashAccountRes.data) {
        await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: `Retur pembelian - ${returItem.supplier?.name ?? ''} ${returItem.invoice_number ?? ''}`,
            entry_date: returForm.date,
            reference_type: 'retur_hutang',
            reference_id: returItem.id,
            lines: [
              {
                account_id: cashAccountRes.data.account_id,
                debit: returAmount,
                credit: 0
              },
              { account_id: accountRes.data.id, debit: 0, credit: returAmount }
            ]
          })
        })
      }
    }

    setSaving(false)
    setShowRetur(false)
    fetchData()
  }

  return (
    <div>
      <PageHeader title="Proses Retur Hutang" subtitle="Proses retur pembelian supplier" />

      <div style={{ position: 'relative', marginBottom: '1.25rem', maxWidth: 320 }}>
        <Search
          size={15}
          style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9ca3af'
          }}
        />
        <input
          type="text"
          placeholder="Cari supplier atau invoice..."
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

      <div className="data-table">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <RefreshCw size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada tagihan</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Invoice</th>
                <th>Tagihan</th>
                <th>Sudah Dibayar</th>
                <th>Retur</th>
                <th>Sisa</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => {
                const sisa = (h.amount ?? 0) - (h.paid_amount ?? 0) - (h.return_amount ?? 0)
                const bisaRetur = sisa > 0 && h.status !== 'paid' && h.status !== 'cancelled'
                return (
                  <tr key={h.id}>
                    <td style={{ fontWeight: '500' }}>{h.supplier?.name ?? '—'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{h.invoice_number ?? '—'}</td>
                    <td style={{ fontWeight: '600', textAlign: 'right' }}>{formatRp(h.amount ?? 0)}</td>
                    <td style={{ color: '#16a34a', textAlign: 'right' }}>{formatRp(h.paid_amount ?? 0)}</td>
                    <td style={{ color: '#dc2626', textAlign: 'right' }}>{formatRp(h.return_amount ?? 0)}</td>
                    <td
                      style={{
                        fontWeight: '700',
                        color: '#cc7030',
                        textAlign: 'right'
                      }}
                    >
                      {formatRp(sisa)}
                    </td>
                    <td>
                      {bisaRetur ? (
                        <button
                          onClick={() => openReturForm(h)}
                          style={{
                            padding: '0.25rem 0.625rem',
                            background: '#dc2626',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Retur
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={showRetur && !!returItem}
        onClose={() => setShowRetur(false)}
        maxWidth={420}
        padding="2rem"
        zIndex={200}
      >
        {returItem && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
              }}
            >
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Proses Retur</h2>
              <button
                onClick={() => setShowRetur(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div
              style={{
                background: '#f9fafb',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                marginBottom: '1rem',
                fontSize: '0.85rem'
              }}
            >
              <div style={{ color: '#6b7280', marginBottom: '0.25rem' }}>
                Supplier: <strong>{returItem.supplier?.name ?? '—'}</strong>
              </div>
              <div style={{ color: '#6b7280', marginBottom: '0.25rem' }}>
                Invoice: <strong>{returItem.invoice_number ?? '—'}</strong>
              </div>
              <div style={{ color: '#6b7280' }}>
                Sisa Tagihan:{' '}
                <strong style={{ color: '#cc7030' }}>
                  {formatRp((returItem.amount ?? 0) - (returItem.paid_amount ?? 0) - (returItem.return_amount ?? 0))}
                </strong>
              </div>
            </div>
            <form onSubmit={handleRetur} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.3rem'
                  }}
                >
                  Jumlah Retur (Rp) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={returForm.amount}
                  onChange={(e) => setReturForm((f) => ({ ...f, amount: e.target.value }))}
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
                    color: '#374151',
                    marginBottom: '0.3rem'
                  }}
                >
                  Tanggal Retur
                </label>
                <input
                  type="date"
                  value={returForm.date}
                  onChange={(e) => setReturForm((f) => ({ ...f, date: e.target.value }))}
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
                    color: '#374151',
                    marginBottom: '0.3rem'
                  }}
                >
                  Alasan Retur
                </label>
                <textarea
                  value={returForm.reason}
                  onChange={(e) => setReturForm((f) => ({ ...f, reason: e.target.value }))}
                  rows={2}
                  placeholder="Misal: barang cacat, salah kirim..."
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
                  onClick={() => setShowRetur(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem'
                  }}
                >
                  <X size={16} /> Batal
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
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem'
                  }}
                >
                  <Check size={16} /> {saving ? 'Memproses...' : 'Proses Retur'}
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  )
}
