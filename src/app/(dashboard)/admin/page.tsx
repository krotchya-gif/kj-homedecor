'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Package,
  ShoppingCart,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Clock,
  CheckCheck,
  XOctagon,
  PackagePlus,
  Truck,
  DollarSign,
  FileEdit,
  RotateCcw,
  Ban,
} from 'lucide-react'

interface Order { id: string; status: string; payment_status: string }
interface PurchaseRequest { id: string; qty: number; estimated_cost: number; status: string; material?: { name: string } }
interface OrderLog { id: string; order_id: string; action: string; notes?: string; created_at: string; staff?: { name: string } }
interface StatData { orders: Order[]; totalOrders: number; totalCustomers: number; totalProducts: number; pendingPRs: PurchaseRequest[]; recentLogs: OrderLog[] }

const ACTION_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  created: { icon: <PackagePlus size={14} />, color: '#3b82f6' },
  sorted: { icon: <FileEdit size={14} />, color: '#8b5cf6' },
  payment_input: { icon: <DollarSign size={14} />, color: '#f59e0b' },
  payment_approved: { icon: <CheckCheck size={14} />, color: '#22c55e' },
  production_started: { icon: <TrendingUp size={14} />, color: '#06b6d4' },
  production_done: { icon: <CheckCircle2 size={14} />, color: '#16a34a' },
  qc_pass: { icon: <CheckCircle2 size={14} />, color: '#22c55e' },
  qc_fail: { icon: <XOctagon size={14} />, color: '#ef4444' },
  return_initiated: { icon: <RotateCcw size={14} />, color: '#f59e0b' },
  cancelled: { icon: <Ban size={14} />, color: '#dc2626' },
  shipped: { icon: <Truck size={14} />, color: '#0d9488' },
  install_started: { icon: <Calendar size={14} />, color: '#8b5cf6' },
  install_done: { icon: <CheckCircle2 size={14} />, color: '#22c55e' },
  done: { icon: <CheckCheck size={14} />, color: '#16a34a' },
  return_stock_in: { icon: <PackagePlus size={14} />, color: '#22c55e' },
  return_disposed: { icon: <XOctagon size={14} />, color: '#ef4444' },
  refund_issued: { icon: <DollarSign size={14} />, color: '#f59e0b' },
}

const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function AdminDashboardPage() {
  const [data, setData] = useState<StatData | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: ordersData, count: totalOrders }, { data: customersData, count: totalCustomers }, { data: productsData, count: totalProducts }, { data: pendingPRs }, { data: recentLogs }] = await Promise.all([
      supabase.from('orders').select('id, status, payment_status', { count: 'exact' }),
      supabase.from('customers').select('id', { count: 'exact' }),
      supabase.from('products').select('id', { count: 'exact' }),
      supabase.from('purchase_requests').select('*, material:materials(name)').eq('status', 'pending'),
      supabase.from('order_logs').select('*, staff:users(name)').order('created_at', { ascending: false }).limit(20),
    ])
    setData({
      orders: ordersData ?? [],
      totalOrders: totalOrders ?? 0,
      totalCustomers: totalCustomers ?? 0,
      totalProducts: totalProducts ?? 0,
      pendingPRs: pendingPRs ?? [],
      recentLogs: recentLogs ?? [],
    })
    setLoading(false)
  }

  async function approvePR(id: string) {
    setApproving(id)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('purchase_requests').update({ status: 'approved', approved_by: user?.id }).eq('id', id)
    setApproving(null)
    loadData()
  }

  async function rejectPR(id: string) {
    if (!confirm('Tolak PR ini?')) return
    setRejecting(id)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('purchase_requests').update({ status: 'rejected', approved_by: user?.id }).eq('id', id)
    setRejecting(null)
    loadData()
  }

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#cc7030' }} />
      </div>
    )
  }

  const { orders, totalOrders, totalCustomers, totalProducts, pendingPRs, recentLogs } = data
  const newOrders = orders.filter((o) => o.status === 'new').length
  const pendingPayment = orders.filter((o) => o.payment_status === 'pending').length
  const doneOrders = orders.filter((o) => o.status === 'done').length

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard Admin</h1>
        <p className="page-subtitle">Selamat datang di KJ Homedecor Management System</p>
      </div>

      {/* Stat Cards — Improved */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Total Orders */}
        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-card-label">Total Pesanan</div>
              <div className="stat-card-value" style={{ color: '#3b82f6' }}>{totalOrders}</div>
              <div className="stat-card-sub" style={{ color: '#f59e0b' }}>{newOrders} pesanan baru</div>
            </div>
            <div style={{ background: '#eff6ff', borderRadius: '0.5rem', padding: '0.5rem' }}>
              <ShoppingCart size={20} style={{ color: '#3b82f6' }} />
            </div>
          </div>
        </div>

        {/* Pending Payment */}
        <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-card-label">Menunggu Bayar</div>
              <div className="stat-card-value" style={{ color: '#ef4444' }}>{pendingPayment}</div>
              <div className="stat-card-sub">Perlu konfirmasi Finance</div>
            </div>
            <div style={{ background: '#fef2f2', borderRadius: '0.5rem', padding: '0.5rem' }}>
              <Clock size={20} style={{ color: '#ef4444' }} />
            </div>
          </div>
        </div>

        {/* Done Orders */}
        <div className="stat-card" style={{ borderLeft: '4px solid #22c55e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-card-label">Selesai</div>
              <div className="stat-card-value" style={{ color: '#22c55e' }}>{doneOrders}</div>
              <div className="stat-card-sub">Pesanan completed</div>
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: '0.5rem', padding: '0.5rem' }}>
              <CheckCheck size={20} style={{ color: '#22c55e' }} />
            </div>
          </div>
        </div>

        {/* Total Customers */}
        <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-card-label">Total Pelanggan</div>
              <div className="stat-card-value" style={{ color: '#8b5cf6' }}>{totalCustomers}</div>
              <div className="stat-card-sub">Terdaftar</div>
            </div>
            <div style={{ background: '#f5f3ff', borderRadius: '0.5rem', padding: '0.5rem' }}>
              <Users size={20} style={{ color: '#8b5cf6' }} />
            </div>
          </div>
        </div>

        {/* Total Products */}
        <div className="stat-card" style={{ borderLeft: '4px solid #cc7030' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-card-label">Total Produk</div>
              <div className="stat-card-value" style={{ color: '#cc7030' }}>{totalProducts}</div>
              <div className="stat-card-sub">Di katalog</div>
            </div>
            <div style={{ background: '#fff7ed', borderRadius: '0.5rem', padding: '0.5rem' }}>
              <Package size={20} style={{ color: '#cc7030' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: pendingPRs.length > 0 ? '1fr' : '1fr', gap: '1.5rem' }}>
        {/* PR Approval Section */}
        {pendingPRs.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle size={18} color="#f59e0b" />
              <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                Purchase Request Pending ({pendingPRs.length})
              </h2>
            </div>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Qty</th>
                    <th>Estimasi Cost</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPRs.map(pr => (
                    <tr key={pr.id}>
                      <td style={{ fontWeight: '600' }}>{pr.material?.name ?? '—'}</td>
                      <td style={{ color: '#6b7280' }}>{pr.qty}</td>
                      <td style={{ fontWeight: '600', color: '#cc7030' }}>
                        {formatRp(pr.estimated_cost)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => approvePR(pr.id)}
                            disabled={approving === pr.id}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.75rem', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.78rem', fontWeight: '600', cursor: approving === pr.id ? 'not-allowed' : 'pointer', opacity: approving === pr.id ? 0.6 : 1 }}
                          >
                            <CheckCircle2 size={12} /> {approving === pr.id ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => rejectPR(pr.id)}
                            disabled={rejecting === pr.id}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.75rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.78rem', fontWeight: '600', cursor: rejecting === pr.id ? 'not-allowed' : 'pointer', opacity: rejecting === pr.id ? 0.6 : 1 }}
                          >
                            <XCircle size={12} /> {rejecting === pr.id ? '...' : 'Tolak'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Activity Log — Improved */}
      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151' }}>Aktivitas Staff Terbaru</h2>
          <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Update real-time dari semua proses</span>
        </div>
        {recentLogs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.75rem', fontSize: '0.875rem' }}>
            Belum ada aktivitas tercatat
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            {recentLogs.map((log) => {
              const actionStyle = ACTION_ICONS[log.action] ?? { icon: <Clock size={14} />, color: '#9ca3af' }
              return (
                <div key={log.id} style={{ display: 'flex', gap: '0.875rem', padding: '0.75rem 1.25rem', borderBottom: '1px solid #f3f4f6', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: actionStyle.color + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, color: actionStyle.color
                  }}>
                    {actionStyle.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.82rem', color: '#374151' }}>
                        {log.action.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      {log.staff && (
                        <span style={{ fontSize: '0.72rem', color: '#6b7280', background: '#f3f4f6', padding: '0.1rem 0.5rem', borderRadius: '999px' }}>
                          {log.staff.name}
                        </span>
                      )}
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                        {new Date(log.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {log.notes && (
                      <div style={{ fontSize: '0.78rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.notes}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}