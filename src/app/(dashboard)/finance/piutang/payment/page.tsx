'use client'
import MobileCards from '@/components/ui/MobileCards'
import { PageHeader } from '@/components/ui/PageHeader'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { DollarSign, Search } from 'lucide-react'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

interface LooseRow {
  id: string
  payment_date?: string
  created_at?: string
  amount?: number
  notes?: string
  type?: string
  order?: { customer?: { name?: string } | null } | null
  staff?: { name?: string } | null
}

export default function PaymentPage() {
  const [payments, setPayments] = useState<LooseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    // F-40 fix: tanpa limit 50 — ambil semua & paginate client-side
    const { data } = await supabase
      .from('payments')
      .select('*, order:orders(customer:customers(name)), staff:users(name)')
      .order('created_at', { ascending: false })
    setPayments((data ?? []) as LooseRow[])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = payments.filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (p.order?.customer?.name ?? '').toLowerCase().includes(q) ||
      (p.type ?? '').toLowerCase().includes(q) ||
      (p.notes ?? '').toLowerCase().includes(q)
    )
  })

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  const goto = (n: number) => setPage(Math.min(Math.max(0, n), pageCount - 1))

  return (
    <div>
      <PageHeader title="Pembayaran Piutang" subtitle="Riwayat pembayaran piutang" />

      <div className="section-card" style={{ marginBottom: '0.75rem' }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Cari customer / tipe / catatan..."
            style={{
              width: '100%',
              padding: '0.55rem 0.9rem 0.55rem 2.2rem',
              borderRadius: '0.5rem',
              border: '1px solid #d1d5db',
              fontSize: '0.85rem'
            }}
          />
        </div>
      </div>

            {/* Mobile: card list */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat…</div>
        ) : pageItems.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada data</div>
        ) : (
          <>
            <MobileCards items={pageItems} keyOf={(p) => p.id} renderCard={(p) => (
              <div className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Tanggal</span>
                  <span className="mobile-card-value">{String(p.payment_date ?? p.created_at ?? '—')}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Customer</span>
                  <span className="mobile-card-value">{p.order?.customer?.name ?? '—'}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Jumlah</span>
                  <span className="mobile-card-value">{formatRp(Number(p.amount ?? 0))}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Catatan</span>
                  <span className="mobile-card-value">{p.notes}</span>
                </div>
              </div>
            )} />
            {pageCount > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', padding: '1rem 0' }}>
                <button onClick={() => goto(page - 1)} disabled={page === 0} style={{ padding: '0.4rem 0.8rem', borderRadius: '0.4rem', border: '1px solid #d1d5db', cursor: 'pointer', fontSize: '0.8rem' }}>‹ Prev</button>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>{page + 1} / {pageCount}</span>
                <button onClick={() => goto(page + 1)} disabled={page >= pageCount - 1} style={{ padding: '0.4rem 0.8rem', borderRadius: '0.4rem', border: '1px solid #d1d5db', cursor: 'pointer', fontSize: '0.8rem' }}>Next ›</button>
              </div>
            )}
          </>
        )}
      </div>
      <div className="data-table desktop-only">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
        ) : pageItems.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <DollarSign size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <p>Belum ada pembayaran</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Customer</th>
                  <th>Jumlah</th>
                  <th>Tipe</th>
                  <th>Staff</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--neutral-600)' }}>{new Date(p.created_at ?? '').toLocaleDateString('id-ID')}</td>
                    <td style={{ fontWeight: '500' }}>{p.order?.customer?.name ?? '—'}</td>
                    <td style={{ fontWeight: '600', color: '#16a34a', textAlign: 'right' }}>{formatRp(Number(p.amount ?? 0))}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.type ?? 'dp'}</td>
                    <td style={{ color: 'var(--neutral-600)' }}>{p.staff?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pageCount > 1 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', padding: '1rem 0' }}>
                <button onClick={() => goto(page - 1)} disabled={page === 0} style={{ padding: '0.4rem 0.8rem', borderRadius: '0.4rem', border: '1px solid #d1d5db', cursor: 'pointer', fontSize: '0.8rem' }}>‹ Prev</button>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>{page + 1} / {pageCount}</span>
                <button onClick={() => goto(page + 1)} disabled={page >= pageCount - 1} style={{ padding: '0.4rem 0.8rem', borderRadius: '0.4rem', border: '1px solid #d1d5db', cursor: 'pointer', fontSize: '0.8rem' }}>Next ›</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
