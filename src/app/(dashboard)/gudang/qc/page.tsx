'use client'
import type { OrderItem, Order, Customer } from '@/types'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Package, Upload, Camera } from 'lucide-react'
import { uploadToLocal } from '@/lib/upload'
import { useToast } from '@/components/ui/Toast'

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

interface QcItem extends OrderItem {
  order?: Order & { customer?: Customer } | null
}

interface ReturnRow {
  id: string
  order_id: string
  order_item_id?: string
  qty?: number
  quantity?: number
  condition?: string
  reason?: string
  notes?: string
  resolved_at?: string
  refund_amount?: number
  refund_status?: string
  order?: { id: string; order_number?: string; customer?: { name?: string } | null } | null
}

export default function GudangQCPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState<'qc' | 'retur'>('qc')
  const [items, setItems] = useState<QcItem[]>([])
  const [returns, setReturns] = useState<ReturnRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<QcItem | null>(null)
  const [qcForm, setQcForm] = useState({ result: 'pass', fail_reason: '', revision_notes: '' })
  const [saving, setSaving] = useState(false)

  // Retur tab state
  const [selectedReturn, setSelectedReturn] = useState<ReturnRow | null>(null)
  const [returForm, setReturForm] = useState({ condition: 'good', notes: '', photos: [] as string[] })
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const supabase = createClient()

  async function load() {
    setLoading(true)
    // QC per-item hanya relevan untuk order yang sudah LEWAT steam/QC penjahit (status=ready)
    // atau setelahnya (packed/shipped/done). Jangan tampilkan order yang masih di new/sorted/production/steam.
    const [itemsRes, returnsRes] = await Promise.all([
      supabase
        .from('order_items')
        .select('*, order:orders!inner(id, status, customer:customers(name)), product:products(name)')
        .in('order.status', ['ready', 'packed', 'shipped', 'done'])
        .order('created_at', { ascending: false }),
      supabase
        .from('returns')
        .select('*, order:orders(id, customer:customers(name))')
        .order('created_at', { ascending: false })
    ])
    setItems((itemsRes.data ?? []) as QcItem[])
    setReturns((returnsRes.data ?? []) as ReturnRow[])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  async function handleQC(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    const {
      data: { user }
    } = await supabase.auth.getUser()

    const { error: qcErr } = await supabase.from('qc_records').insert({
      order_id: selected.order_id,
      order_item_id: selected.id,
      result: qcForm.result,
      fail_reason: qcForm.fail_reason || null,
      revision_notes: qcForm.revision_notes || null,
      checked_by: user?.id ?? null,
      checked_at: new Date().toISOString()
    })
    if (qcErr) { setSaving(false); toast('error', 'Gagal simpan QC: ' + qcErr.message); return }

    if (qcForm.result === 'pass') {
      const { error: itemErr } = await supabase.from('order_items').update({ ready: true }).eq('id', selected.id)
      if (itemErr) { setSaving(false); toast('error', 'QC tercatat, tapi gagal update item: ' + itemErr.message); return }
      const { error: passLogErr } = await supabase.from('order_logs').insert({
        order_id: selected.order_id,
        action: 'qc_pass',
        notes: `QC Pass oleh Gudang — item: ${selected.product?.name ?? selected.custom_specs ?? selected.id.slice(0, 8)}`,
        staff_id: user?.id ?? null
      })
      if (passLogErr) { console.error('Gagal catat log QC pass:', passLogErr) }
    } else {
      const { error: failLogErr } = await supabase.from('order_logs').insert({
        order_id: selected.order_id,
        action: 'qc_fail',
        notes: `QC Fail — alasan: ${qcForm.fail_reason || 'n/a'}${qcForm.revision_notes ? ' | Catatan revisi: ' + qcForm.revision_notes : ''}`,
        staff_id: user?.id ?? null
      })
      if (failLogErr) { console.error('Gagal catat log QC fail:', failLogErr) }
    }

    setSaving(false)
    setSelected(null)
    setQcForm({ result: 'pass', fail_reason: '', revision_notes: '' })
    load()
  }

  async function handleReturResolve(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedReturn) return
    setSaving(true)
    const {
      data: { user }
    } = await supabase.auth.getUser()

    const isGood = returForm.condition === 'good'

    // Update return record — final condition determined by Gudang
    const { error: retUpdErr } = await supabase
      .from('returns')
      .update({
        condition: returForm.condition,
        notes: returForm.notes || null,
        photo_evidence: returForm.photos.length > 0 ? returForm.photos : null,
        resolved_at: new Date().toISOString()
      })
      .eq('id', selectedReturn.id)
    if (retUpdErr) { setSaving(false); toast('error', 'Gagal update return: ' + retUpdErr.message); return }

    // If good → stock in, if damaged → dispose
    if (isGood) {
      // Stock return into inventory - only the specific item from returns table
      const { data: itemsToReturn } = selectedReturn.order_item_id
        ? await supabase
            .from('order_items')
            .select('*, product:products(id,stock_toko)')
            .eq('order_id', selectedReturn.order_id)
            .eq('id', selectedReturn.order_item_id)
        : await supabase
            .from('order_items')
            .select('*, product:products(id,stock_toko)')
            .eq('order_id', selectedReturn.order_id)
      for (const item of itemsToReturn ?? []) {
        if (item.product_id) {
          const { error: movErr } = await supabase.from('inventory_movements').insert({
            product_id: item.product_id,
            type: 'return_in',
            qty: item.qty ?? 1,
            reason: `Return confirmed GOOD oleh Gudang — order ${selectedReturn.order_id.slice(0, 8)}`,
            created_by: user?.id ?? null
          })
          if (movErr) { setSaving(false); toast('error', 'Gagal catat stok masuk return: ' + movErr.message); return }
          // increment stock_toko
          const { data: prod } = await supabase.from('products').select('stock_toko').eq('id', item.product_id).single()
          if (prod) {
            const { error: prodErr } = await supabase
              .from('products')
              .update({ stock_toko: (prod.stock_toko ?? 0) + (item.qty ?? 1) })
              .eq('id', item.product_id)
            if (prodErr) { setSaving(false); toast('error', 'Stok tercatat, tapi gagal update stok produk: ' + prodErr.message); return }
          }
        }
      }
      const { error: stockLogErr } = await supabase.from('order_logs').insert({
        order_id: selectedReturn.order_id,
        action: 'return_stock_in',
        notes: `Return confirmed GOOD oleh Gudang — stock masuk ke toko. Foto: ${returForm.photos.length} bukti.`,
        staff_id: user?.id ?? null
      })
      if (stockLogErr) { console.error('Gagal catat log return stock:', stockLogErr) }
    } else {
      // For damaged dispose, we need to know which product - use order_item_id from returns
      const { data: returnItem } = await supabase
        .from('returns')
        .select('order_item_id, qty')
        .eq('id', selectedReturn.id)
        .single()
      if (returnItem?.order_item_id) {
        const { data: item } = await supabase
          .from('order_items')
          .select('product_id, qty')
          .eq('id', returnItem.order_item_id)
          .single()
        if (item?.product_id) {
          const { error: disposeErr } = await supabase.from('inventory_movements').insert({
            product_id: item.product_id,
            type: 'dispose',
            qty: item.qty ?? 1,
            reason: `Return confirmed DAMAGED oleh Gudang — disposed. Alasan return: ${selectedReturn.reason}`,
            created_by: user?.id ?? null
          })
          if (disposeErr) { setSaving(false); toast('error', 'Gagal catat disposal: ' + disposeErr.message); return }
        }
      } else {
        const { error: disposeErr } = await supabase.from('inventory_movements').insert({
          type: 'dispose',
          qty: selectedReturn.qty ?? 1,
          reason: `Return confirmed DAMAGED oleh Gudang — disposed. Alasan return: ${selectedReturn.reason}`,
          created_by: user?.id ?? null
        })
        if (disposeErr) { setSaving(false); toast('error', 'Gagal catat disposal: ' + disposeErr.message); return }
      }
      const { error: disposeLogErr } = await supabase.from('order_logs').insert({
        order_id: selectedReturn.order_id,
        action: 'return_disposed',
        notes: `Return confirmed DAMAGED oleh Gudang — disposed. Alasan return: ${selectedReturn.reason}.`,
        staff_id: user?.id ?? null
      })
      if (disposeLogErr) { console.error('Gagal catat log disposal:', disposeLogErr) }
    }

    setSaving(false)
    setSelectedReturn(null)
    setReturForm({ condition: 'good', notes: '', photos: [] })
    load()
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedReturn) return
    setUploadingPhoto(true)
    try {
      const result = await uploadToLocal(file, 'evidence', { compress: true, maxSizeMB: 1 })
      setReturForm((f) => ({ ...f, photos: [...f.photos, result.url] }))
    } catch (err) {
      console.error('Upload failed:', err)
      toast('error', 'Gagal upload foto')
    }
    setUploadingPhoto(false)
  }

  const pendingReturns = returns.filter((r) => !r.resolved_at)
  const resolvedReturns = returns.filter((r) => r.resolved_at)

  return (
    <div>
      <PageHeader
        title="QC Per-Item & Verifikasi Retur"
        subtitle={
          <>
            <strong>QC Per-Item</strong> untuk ceklist barang per item dari order yang sudah{' '}
            <strong>Siap (ready)</strong>.<strong> Retur Customer</strong> untuk verifikasi barang yang diretur.
            <br />
            <span style={{ color: '#ef4444', fontWeight: '600' }}>⚠️ Bukan</span> untuk QC jahitan penjahit — itu di{' '}
            <a href="/gudang/steam" style={{ color: '#cc7030', fontWeight: '600' }}>
              Steam & QC Jahitan
            </a>
            .
          </>
        }
      />

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem' }}>
        {[
          { key: 'qc', label: '🔍 QC Per-Item', count: items.filter((i) => !i.ready).length },
          { key: 'retur', label: '📦 Verifikasi Retur', count: pendingReturns.length }
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'qc' | 'retur')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === t.key ? '#cc7030' : 'transparent'}`,
              cursor: 'pointer',
              fontWeight: tab === t.key ? '700' : '500',
              color: tab === t.key ? '#cc7030' : 'var(--neutral-600)',
              fontSize: '0.9rem',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span
                style={{
                  background: t.key === 'retur' ? '#9333ea' : '#cc7030',
                  color: '#fff',
                  borderRadius: '999px',
                  fontSize: '0.65rem',
                  padding: '0.1rem 0.5rem',
                  fontWeight: '700'
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ========== QC TAB ========== */}
      {tab === 'qc' && (
        <>
          <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
            {[
              { label: 'Pending QC', val: items.filter((i) => !i.ready).length, color: '#ef4444' },
              { label: 'Ready', val: items.filter((i) => i.ready).length, color: '#22c55e' },
              { label: 'Total Items', val: items.length, color: 'var(--neutral-600)' }
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-card-label">{s.label}</div>
                <div className="stat-card-value" style={{ color: s.color }}>
                  {s.val}
                </div>
              </div>
            ))}
          </div>

                {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : pendingReturns.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={pendingReturns} keyOf={(r) => r.id} renderCard={(r) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Order</span>
                  <span className="mobile-card-value">{r.order?.order_number ?? r.order_id?.slice(0, 8)}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Alasan</span>
                  <span className="mobile-card-value">{r.reason}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Qty</span>
                  <span className="mobile-card-value">{r.qty ?? r.quantity}</span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
            ) : items.filter((i) => !i.ready).length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
                <CheckCircle2 size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
                <p>Semua item sudah QC pass ✅</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Pesanan</th>
                    <th>Pelanggan</th>
                    <th>Ukuran</th>
                    <th>Ready</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items
                    .filter((i) => !i.ready)
                    .map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: '500' }}>{item.product?.name ?? item.custom_specs ?? '—'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--neutral-600)' }}>
                          {item.order?.id?.slice(0, 8)}
                        </td>
                        <td>{item.order?.customer?.name ?? '—'}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>{item.size ?? '—'}</td>
                        <td>
                          <span style={{ color: 'var(--neutral-400)', fontSize: '0.8rem' }}>Pending</span>
                        </td>
                        <td>
                          <button
                            onClick={() => {
                              setSelected(item)
                              setQcForm({ result: 'pass', fail_reason: '', revision_notes: '' })
                            }}
                            style={{
                              padding: '0.3rem 0.75rem',
                              background: '#cc7030',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            QC Check
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ========== RETUR TAB ========== */}
      {tab === 'retur' && (
        <>
          <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
            {[
              { label: 'Pending Verifikasi', val: pendingReturns.length, color: '#f59e0b' },
              { label: 'Sudah Diproses', val: resolvedReturns.length, color: '#22c55e' },
              { label: 'Total Return', val: returns.length, color: 'var(--neutral-600)' }
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-card-label">{s.label}</div>
                <div className="stat-card-value" style={{ color: s.color }}>
                  {s.val}
                </div>
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
          ) : pendingReturns.length === 0 ? (
            <div className="data-table" style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
              <Package size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
              <p>Tidak ada return yang menunggu verifikasi</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingReturns.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.75rem',
                    padding: '1.25rem'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                        Return Order:{' '}
                        <span style={{ fontFamily: 'monospace', color: 'var(--neutral-600)' }}>{r.order?.id?.slice(0, 8)}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--neutral-600)' }}>
                        Pelanggan: <strong>{r.order?.customer?.name ?? '—'}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', marginTop: '0.2rem' }}>
                        Alasan: <span style={{ color: '#991b1b', fontWeight: '500' }}>{r.reason}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
                        Qty return: <strong>{r.qty ?? 1}</strong> &bull; Refund:{' '}
                        <strong style={{ color: '#cc7030' }}>
                          {(r.refund_amount ?? 0) > 0 ? fmt(r.refund_amount ?? 0) : 'Tidak ada'}
                        </strong>
                      </div>
                      {r.refund_status === 'pending' && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            background: '#fef3c7',
                            color: '#92400e',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            marginTop: '0.375rem'
                          }}
                        >
                          💰 Refund pending
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedReturn(r)
                        setReturForm({ condition: r.condition || 'good', notes: '', photos: [] })
                      }}
                      style={{
                        padding: '0.5rem 1.25rem',
                        background: '#9333ea',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      ✅ Verifikasi & Proses
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resolved returns history */}
          {resolvedReturns.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--neutral-600)', marginBottom: '0.75rem' }}>
                Sudah Diproses
              </h3>
      {/* Mobile: card list */}
      <div className="mobile-only">
        {resolvedReturns.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <MobileCards items={resolvedReturns} keyOf={(r) => r.id} renderCard={(r) => (
            <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Order</span>
                  <span className="mobile-card-value">{r.order?.order_number ?? r.order_id?.slice(0, 8)}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Alasan</span>
                  <span className="mobile-card-value">{r.reason}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Qty</span>
                  <span className="mobile-card-value">{r.qty ?? r.quantity}</span>
                </div>
            </div>
          )} />
        )}
      </div>
      <div className="data-table desktop-only">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Alasan</th>
                      <th>Kondisi Final</th>
                      <th>Qty</th>
                      <th>Resolved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolvedReturns.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--neutral-600)' }}>
                          {r.order?.id?.slice(0, 8)}
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>{r.reason}</td>
                        <td>
                          <span
                            style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              background: r.condition === 'good' ? '#d1fae5' : '#fef2f2',
                              color: r.condition === 'good' ? '#065f46' : '#991b1b'
                            }}
                          >
                            {r.condition === 'good' ? '✅ Bagus → Stock' : '❌ Rusak → Dispose'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--neutral-600)' }}>{r.qty}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>
                          {r.resolved_at ? new Date(r.resolved_at).toLocaleDateString('id-ID') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* QC Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} maxWidth={460} padding="2rem" zIndex={200}>
        {selected && (
          <>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>QC Check</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--neutral-600)', marginBottom: '1.25rem' }}>
              {selected.product?.name ?? selected.custom_specs} — {selected.size ?? 'tanpa ukuran'}
            </p>
            <form onSubmit={handleQC} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: 'var(--neutral-700)',
                    marginBottom: '0.5rem'
                  }}
                >
                  Hasil QC
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {[
                    { val: 'pass', label: '✅ Pass' },
                    { val: 'fail', label: '❌ Fail' },
                    { val: 'revision', label: '🔄 Revisi' }
                  ].map((opt) => (
                    <label
                      key={opt.val}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '0.875rem',
                        background:
                          qcForm.result === opt.val
                            ? opt.val === 'pass'
                              ? '#d1fae5'
                              : opt.val === 'fail'
                                ? '#fef2f2'
                                : '#fffbeb'
                            : 'var(--neutral-100)',
                        border: `1px solid ${qcForm.result === opt.val ? (opt.val === 'pass' ? '#22c55e' : opt.val === 'fail' ? '#ef4444' : '#f59e0b') : 'var(--neutral-200)'}`,
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem'
                      }}
                    >
                      <input
                        type="radio"
                        name="qcresult"
                        value={opt.val}
                        checked={qcForm.result === opt.val}
                        onChange={() => setQcForm((f) => ({ ...f, result: opt.val }))}
                        style={{ display: 'none' }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              {qcForm.result !== 'pass' && (
                <>
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
                      Alasan Gagal *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Jahitan tidak rapi, warna salah, dll..."
                      value={qcForm.fail_reason}
                      onChange={(e) => setQcForm((f) => ({ ...f, fail_reason: e.target.value }))}
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
                      Catatan Revisi
                    </label>
                    <textarea
                      placeholder="Instruksi perbaikan..."
                      value={qcForm.revision_notes}
                      onChange={(e) => setQcForm((f) => ({ ...f, revision_notes: e.target.value }))}
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
                </>
              )}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
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
                  {saving ? 'Menyimpan...' : 'Submit QC'}
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>

      {/* Retur Verification Modal */}
      <Modal open={!!selectedReturn} onClose={() => setSelectedReturn(null)} maxWidth={520} padding="2rem" zIndex={200}>
        {selectedReturn && (
          <>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.25rem' }}>📦 Verifikasi Return</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginBottom: '1.25rem' }}>
              Periksa kondisi fisik barang return. Foto wajib sebagai dokumentasi.
            </p>

            <div
              style={{
                background: 'var(--neutral-100)',
                borderRadius: '0.5rem',
                padding: '0.875rem',
                marginBottom: '1.25rem',
                fontSize: '0.82rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}
            >
              <div>
                <strong>Order:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedReturn.order_id}</span>
              </div>
              <div>
                <strong>Pelanggan:</strong> {selectedReturn.order?.customer?.name ?? '—'}
              </div>
              <div>
                <strong>Alasan return:</strong> {selectedReturn.reason}
              </div>
              <div>
                <strong>Qty:</strong> {selectedReturn.qty ?? 1}
              </div>
              {(selectedReturn.refund_amount ?? 0) > 0 && (
                <div>
                  <strong>Refund:</strong>{' '}
                  <span style={{ color: '#cc7030', fontWeight: '600' }}>{fmt(selectedReturn.refund_amount ?? 0)}</span> (
                  {selectedReturn.refund_status})
                </div>
              )}
            </div>

            <form onSubmit={handleReturResolve} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: 'var(--neutral-700)',
                    marginBottom: '0.5rem'
                  }}
                >
                  Kondisi Final *
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {[
                    {
                      val: 'good',
                      label: '✅ Bagus — masuk stock toko (+qty)',
                      bg: '#d1fae5',
                      border: '#22c55e',
                      text: '#065f46'
                    },
                    {
                      val: 'damaged',
                      label: '❌ Rusak — dispose (tidak bisa dijual)',
                      bg: '#fef2f2',
                      border: '#ef4444',
                      text: '#991b1b'
                    }
                  ].map((opt) => (
                    <label
                      key={opt.val}
                      onClick={() => setReturForm((f) => ({ ...f, condition: opt.val }))}
                      style={{
                        flex: 1,
                        cursor: 'pointer',
                        border: `2px solid ${returForm.condition === opt.val ? opt.border : 'var(--neutral-200)'}`,
                        borderRadius: '0.5rem',
                        padding: '0.75rem',
                        background: returForm.condition === opt.val ? opt.bg : '#fff',
                        textAlign: 'center'
                      }}
                    >
                      <input
                        type="radio"
                        name="returCond"
                        value={opt.val}
                        checked={returForm.condition === opt.val}
                        onChange={() => {}}
                        style={{ display: 'none' }}
                      />
                      <div style={{ fontSize: '0.82rem', fontWeight: '700', color: opt.text }}>{opt.label}</div>
                    </label>
                  ))}
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
                  Foto Dokumentasi (min. 2 foto) *
                </label>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {returForm.photos.map((url, idx) => (
                    <div key={idx} style={{ position: 'relative', width: 72, height: 72 }}>
                      <img
                        src={url}
                        alt={`Photo ${idx + 1}`}
                        style={{
                          width: 72,
                          height: 72,
                          objectFit: 'cover',
                          borderRadius: '0.5rem',
                          border: '1px solid #e5e7eb'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setReturForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }))}
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <label
                    style={{
                      width: 72,
                      height: 72,
                      border: '2px dashed #d1d5db',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      background: 'var(--neutral-100)'
                    }}
                  >
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                    {uploadingPhoto ? (
                      <span style={{ fontSize: '0.65rem', color: 'var(--neutral-400)' }}>...</span>
                    ) : (
                      <Camera size={18} style={{ color: 'var(--neutral-400)' }} />
                    )}
                  </label>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>
                  Wajib upload minimal 2 foto sebagai bukti dokumentasi return.
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
                  Catatan Verifikasi
                </label>
                <textarea
                  placeholder="Contoh: Ada noda di bagian bawah, warna sedikit berbeda dari foto produk..."
                  value={returForm.notes}
                  onChange={(e) => setReturForm((f) => ({ ...f, notes: e.target.value }))}
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

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedReturn(null)}
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
                  disabled={saving || returForm.photos.length < 2}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: returForm.photos.length < 2 ? 'var(--neutral-400)' : '#9333ea',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: returForm.photos.length < 2 ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {saving
                    ? 'Menyimpan...'
                    : returForm.photos.length < 2
                      ? `Upload foto dulu (${returForm.photos.length}/2)`
                      : 'Simpan & Proses'}
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  )
}
