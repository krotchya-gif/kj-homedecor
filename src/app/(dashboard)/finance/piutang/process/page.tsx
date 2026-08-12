'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { RefreshCw, Undo2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

interface LooseRow {
  id: string
  invoice_number?: string
  amount?: number
  paid_amount?: number
  return_amount?: number
  fee_amount?: number
  status?: string
  customer?: { name?: string } | null
}

export default function ProcessReturPage() {
  const { toast } = useToast()
  const [piutang, setPiutang] = useState<LooseRow[]>([])
  const [loading, setLoading] = useState(true)
  // BUG-014 fix: modal retur + handler
  const [returItem, setReturItem] = useState<LooseRow | null>(null)
  const [returForm, setReturForm] = useState({ amount: '', reason: '' })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    // F-41 fix: hanya tampilkan piutang aktif (pending/partial), bukan paid/cancelled
    const { data } = await supabase
      .from('piutang')
      .select('*, customer:customers(name)')
      .in('status', ['pending', 'partial'])
      .order('created_at', { ascending: false })
    setPiutang((data ?? []) as LooseRow[])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  function openRetur(p: LooseRow) {
    const sisa = (p.amount ?? 0) - (p.paid_amount ?? 0) - (p.return_amount ?? 0) - (p.fee_amount ?? 0)
    setReturItem(p)
    setReturForm({ amount: String(sisa > 0 ? sisa : ''), reason: '' })
  }

  // BUG-014 fix (2026-08-11): proses retur — kurangi piutang + catat jurnal balik
  async function handleRetur(e: React.FormEvent) {
    e.preventDefault()
    if (!returItem) return
    setSaving(true)
    const amount = Number(returForm.amount)
    const sisa = (returItem.amount ?? 0) - (returItem.paid_amount ?? 0) - (returItem.return_amount ?? 0)
    if (!returForm.amount || isNaN(amount) || amount <= 0) {
      setSaving(false)
      toast('error', 'Nominal retur wajib diisi dan lebih dari 0.')
      return
    }
    if (amount > sisa) {
      setSaving(false)
      toast('error', `Nominal retur melebihi sisa tagihan (${formatRp(sisa)}).`)
      return
    }
    const newReturn = (returItem.return_amount ?? 0) + amount
    const newSisa = (returItem.amount ?? 0) - (returItem.paid_amount ?? 0) - newReturn - (returItem.fee_amount ?? 0)
    const newStatus = newSisa <= 0 ? 'paid' : returItem.status === 'paid' ? 'partial' : (returItem.status ?? 'pending')

    const { error: updErr } = await supabase
      .from('piutang')
      .update({ return_amount: newReturn, status: newStatus, remaining: newSisa })
      .eq('id', returItem.id)
      .eq('return_amount', returItem.return_amount ?? 0)
    if (updErr) {
      setSaving(false)
      toast('error', 'Gagal simpan retur (mungkin diubah finance lain): ' + updErr.message)
      return
    }

    // F-14 fix: retur piutang wajib jurnal Dr Penjualan Retur / Cr Piutang Customer
    // (barang diretur → tagihan dikurangi, uang belum tentu keluar).
    try {
      const { createSimpleJournal } = await import('@/utils/journal/create')
      await createSimpleJournal({
        transaction_type: 'sales_return',
        reference_type: 'piutang_retur',
        reference_id: returItem.id,
        description: `Retur piutang ${returItem.invoice_number ?? 'Faktur'} — ${returItem.customer?.name ?? ''} Rp${amount.toLocaleString('id-ID')}`,
        amount,
        credit_account_id: '22222222-2222-4222-8222-222222222205', // Piutang Customer
        idempotency_key: `piutang_retur:${returItem.id}:${crypto.randomUUID()}`
      })
    } catch (jErr) {
      console.error('Gagal buat jurnal retur piutang:', jErr)
      toast('warning', 'Retur tercatat, TAPI jurnal GAGAL. Periksa mapping akun di /finance/accounts/mapping.')
    }

    setSaving(false)
    setReturItem(null)
    setReturForm({ amount: '', reason: '' })
    toast('success', `Retur piutang ${formatRp(amount)} dicatat!`)
    fetchData()
  }

  return (
    <div>
      <PageHeader title="Proses Retur" subtitle="Proses retur piutang (kurangi tagihan saat barang diretur)" />

            {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : piutang.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={piutang} keyOf={(p) => p.id} renderCard={(p) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Invoice</span>
                  <span className="mobile-card-value">{p.invoice_number}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Jumlah</span>
                  <span className="mobile-card-value">{formatRp(p.amount ?? 0)}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Sisa</span>
                  <span className="mobile-card-value">{formatRp((p.amount ?? 0) - (p.paid_amount ?? 0) - (p.return_amount ?? 0) - (p.fee_amount ?? 0))}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Status</span>
                  <span className="mobile-card-value">{p.status}</span>
                </div>
                <div className="mobile-card-actions">
                  <button onClick={() => openRetur(p)} style={{ background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    Proses Retur
                  </button>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : piutang.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <RefreshCw size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada data</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Invoice</th>
                <th>Jumlah</th>
                <th>Retur</th>
                <th>Sisa</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {piutang.map((p) => {
                const sisa = (p.amount ?? 0) - (p.paid_amount ?? 0) - (p.return_amount ?? 0) - (p.fee_amount ?? 0)
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: '500' }}>{p.customer?.name ?? '—'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{p.invoice_number ?? '—'}</td>
                    <td style={{ textAlign: 'right' }}>{formatRp(p.amount ?? 0)}</td>
                    <td style={{ color: '#dc2626', textAlign: 'right' }}>{formatRp(p.return_amount ?? 0)}</td>
                    <td style={{ fontWeight: '600', textAlign: 'right' }}>{formatRp(sisa)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.status ?? '—'}</td>
                    <td>
                      <button
                        onClick={() => openRetur(p)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.25rem 0.625rem',
                          background: '#3b82f6',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <Undo2 size={13} /> Proses Retur
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal retur */}
      <Modal
        open={!!returItem}
        onClose={() => {
          setReturItem(null)
          setReturForm({ amount: '', reason: '' })
        }}
        maxWidth={420}
        padding="1.5rem"
      >
        <form onSubmit={handleRetur}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem' }}>↩️ Proses Retur Piutang</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', marginBottom: '1rem' }}>
            {returItem?.customer?.name ?? '—'} — {returItem?.invoice_number ?? 'Faktur'} · Sisa{' '}
            <strong style={{ color: '#cc7030' }}>
              {formatRp((returItem?.amount ?? 0) - (returItem?.paid_amount ?? 0) - (returItem?.return_amount ?? 0))}
            </strong>
          </p>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.3rem' }}>
            Nominal Retur *
          </label>
          <input
            type="number"
            required
            min={1}
            value={returForm.amount}
            onChange={(e) => setReturForm((f) => ({ ...f, amount: e.target.value }))}
            style={{
              width: '100%',
              padding: '0.625rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              marginBottom: '0.85rem',
              outline: 'none'
            }}
          />
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.3rem' }}>
            Alasan
          </label>
          <textarea
            value={returForm.reason}
            onChange={(e) => setReturForm((f) => ({ ...f, reason: e.target.value }))}
            rows={2}
            placeholder="Alasan retur (opsional)"
            style={{
              width: '100%',
              padding: '0.625rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              marginBottom: '1rem',
              outline: 'none',
              resize: 'vertical'
            }}
          />
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => {
                setReturItem(null)
                setReturForm({ amount: '', reason: '' })
              }}
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
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              {saving ? 'Menyimpan...' : 'Catat Retur'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
