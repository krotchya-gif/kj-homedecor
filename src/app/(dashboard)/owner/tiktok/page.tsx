'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ShoppingBag, DollarSign, RefreshCw, Link2, Unlink, Loader2, ExternalLink, Search } from 'lucide-react'

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function TikTokDashboardPage() {
  const [settings, setSettings] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [statements, setStatements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ shop_name: '', app_key: '', app_secret: '', shop_cipher: '' })
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const supabase = createClient()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [settingsRes, ordersRes, statementsRes] = await Promise.all([
      supabase.from('tiktok_shop_settings').select('*'),
      supabase.from('tiktok_shop_orders').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('tiktok_shop_statements').select('*').order('created_at', { ascending: false }).limit(50),
    ])
    setSettings(settingsRes.data ?? [])
    setOrders(ordersRes.data ?? [])
    setStatements(statementsRes.data ?? [])
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/tiktok/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (json.oauth_url) {
      // Redirect to TikTok OAuth
      window.location.href = json.oauth_url
    } else {
      setSyncResult(json.error || 'Error saving settings')
    }
    setSaving(false)
  }

  async function handleSync(type: 'orders' | 'finance') {
    setSyncing(type)
    setSyncResult(null)

    const activeShop = settings.find(s => s.is_active)
    const res = await fetch(`/api/tiktok/sync-${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop_id: activeShop?.id,
        ...(dateRange.start ? { start_date: dateRange.start } : {}),
        ...(dateRange.end ? { end_date: dateRange.end } : {}),
        auto_create_piutang: type === 'finance',
      }),
    })
    const json = await res.json()
    setSyncResult(json.message || json.error || 'Sync completed')
    setSyncing(null)
    fetchData()
  }

  const totalSales = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0)
  const totalSettlements = statements.reduce((s, st) => s + Number(st.total_amount || 0), 0)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#cc7030' }} />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">TikTok Shop</h1>
        <p className="page-subtitle">Integrasi TikTok Shop — Order, Settlement, Rekonsiliasi</p>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Orders (Synced)</div>
          <div className="stat-card-value" style={{ color: '#cc7030' }}>{orders.length}</div>
          <div className="stat-card-sub">{formatRp(totalSales)} total sales</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Settlements</div>
          <div className="stat-card-value" style={{ color: '#2563eb' }}>{statements.length}</div>
          <div className="stat-card-sub">{formatRp(totalSettlements)} settled</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Shop Connected</div>
          <div className="stat-card-value" style={{ color: settings.find(s => s.is_active) ? '#16a34a' : '#ef4444' }}>
            {settings.find(s => s.is_active) ? 'Yes' : 'No'}
          </div>
          <div className="stat-card-sub">
            {settings.find(s => s.is_active)?.seller_name || settings.find(s => s.is_active)?.shop_name || '-'}
          </div>
        </div>
      </div>

      {/* Sync Controls */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>Sync Controls</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setShowAddForm(true)} style={{
              padding: '0.5rem 1rem', background: '#cc7030', color: '#fff', border: 'none',
              borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
            }}>
              <Link2 size={14} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
              {settings.length > 0 ? 'Add Shop' : 'Connect TikTok'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Start:</label>
            <input type="date" value={dateRange.start}
              onChange={e => setDateRange(d => ({ ...d, start: e.target.value }))}
              style={{ padding: '0.4rem 0.6rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.8rem' }}
            />
            <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>End:</label>
            <input type="date" value={dateRange.end}
              onChange={e => setDateRange(d => ({ ...d, end: e.target.value }))}
              style={{ padding: '0.4rem 0.6rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.8rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => handleSync('orders')} disabled={syncing !== null}
            style={{
              padding: '0.5rem 1rem', background: syncing === 'orders' ? '#e5e7eb' : '#f3f4f6',
              color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.5rem',
              fontSize: '0.8rem', fontWeight: '600', cursor: syncing !== null ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}
          >
            {syncing === 'orders' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
            Sync Orders
          </button>
          <button onClick={() => handleSync('finance')} disabled={syncing !== null}
            style={{
              padding: '0.5rem 1rem', background: syncing === 'finance' ? '#e5e7eb' : '#f3f4f6',
              color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.5rem',
              fontSize: '0.8rem', fontWeight: '600', cursor: syncing !== null ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}
          >
            {syncing === 'finance' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <DollarSign size={14} />}
            Sync Finance (Settlement)
          </button>
        </div>

        {syncResult && (
          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#166534' }}>
            {syncResult}
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShoppingBag size={16} />
          <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>Synced Orders</h2>
        </div>
        {orders.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
            <ShoppingBag size={24} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.85rem' }}>No orders synced yet. Click "Sync Orders" to import.</p>
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Buyer</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                      {o.tiktok_order_id?.slice(0, 16)}...
                    </td>
                    <td>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600',
                        background: o.order_status === 'DELIVERED' || o.order_status === 'COMPLETED' ? '#f0fdf4' : '#fef9c3',
                        color: o.order_status === 'DELIVERED' || o.order_status === 'COMPLETED' ? '#166534' : '#854d0e',
                      }}>
                        {o.order_status || '-'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600',
                        background: o.payment_status === 'PAID' ? '#f0fdf4' : '#fef9c3',
                        color: o.payment_status === 'PAID' ? '#166534' : '#854d0e',
                      }}>
                        {o.payment_status || '-'}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700' }}>{formatRp(Number(o.total_amount || 0))}</td>
                    <td>{o.buyer_name || '-'}</td>
                    <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {new Date(o.created_at).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Statements Table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <DollarSign size={16} />
          <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', margin: 0 }}>Settlements</h2>
        </div>
        {statements.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
            <DollarSign size={24} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.85rem' }}>No settlements synced yet. Click "Sync Finance" to import.</p>
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Statement ID</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Period</th>
                  <th>Piutang</th>
                </tr>
              </thead>
              <tbody>
                {statements.map((st) => (
                  <tr key={st.id}>
                    <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                      {st.statement_id?.slice(0, 16)}...
                    </td>
                    <td>{st.statement_type || '-'}</td>
                    <td style={{ fontWeight: '700', color: '#16a34a' }}>{formatRp(Number(st.total_amount || 0))}</td>
                    <td>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600',
                        background: st.status === 'SUCCESS' || st.status === 'PAID' ? '#f0fdf4' : '#fef9c3',
                        color: st.status === 'SUCCESS' || st.status === 'PAID' ? '#166534' : '#854d0e',
                      }}>
                        {st.status || '-'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {st.start_date ? new Date(st.start_date).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td>
                      {st.piutang_id ? (
                        <a href={`/finance/piutang`} style={{ color: '#cc7030', fontSize: '0.8rem', textDecoration: 'none' }}>
                          ✓ Linked
                        </a>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Shop Modal */}
      {showAddForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowAddForm(false)}>
          <div style={{
            background: '#fff', borderRadius: '0.75rem', padding: '1.5rem', width: '90%', maxWidth: 480,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 1rem' }}>
              {settings.length > 0 ? 'Add Another TikTok Shop' : 'Connect TikTok Shop'}
            </h3>

            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.3rem' }}>Shop Name</label>
                <input value={form.shop_name} onChange={e => setForm(f => ({ ...f, shop_name: e.target.value }))}
                  placeholder="TikTok Shop Saya"
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                  App Key * <span style={{ fontWeight: '400', color: '#9ca3af' }}>(dari TikTok Partner Center)</span>
                </label>
                <input value={form.app_key} required onChange={e => setForm(f => ({ ...f, app_key: e.target.value }))}
                  placeholder="Your TikTok Shop App Key"
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                  App Secret * <span style={{ fontWeight: '400', color: '#9ca3af' }}>(dari TikTok Partner Center)</span>
                </label>
                <input value={form.app_secret} required onChange={e => setForm(f => ({ ...f, app_secret: e.target.value }))}
                  type="password" placeholder="Your TikTok Shop App Secret"
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                  Shop Cipher <span style={{ fontWeight: '400', color: '#9ca3af' }}>(opsional)</span>
                </label>
                <input value={form.shop_cipher} onChange={e => setForm(f => ({ ...f, shop_cipher: e.target.value }))}
                  placeholder="Shop cipher (jika ada)"
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddForm(false)}
                  style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: '0.5rem 1.25rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving...' : 'Save & Connect'}
                </button>
              </div>
            </form>

            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f0f9ff', border: '1px solid #93c5fd', borderRadius: '0.5rem', fontSize: '0.75rem', color: '#1e40af' }}>
              <strong>Cara mendapatkan App Key & Secret:</strong>
              <ol style={{ margin: '0.3rem 0 0', paddingLeft: '1rem', lineHeight: 1.6 }}>
                <li>Buka <a href="https://partner.tiktokshop.com" target="_blank" style={{ color: '#cc7030' }} rel="noopener">TikTok Partner Center</a></li>
                <li>Buat aplikasi baru → dapatkan App Key & App Secret</li>
                <li>Set redirect URL: <code style={{ background: '#e0e7ff', padding: '0.1rem 0.3rem', borderRadius: '0.25rem' }}>https://kjhomedecor.com/api/tiktok/auth</code></li>
                <li>Masukkan App Key & Secret di sini, klik "Save & Connect"</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
