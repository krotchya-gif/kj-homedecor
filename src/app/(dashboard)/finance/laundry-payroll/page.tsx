'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Wallet, CheckCircle2, Clock, TrendingUp, Download } from 'lucide-react'
import type { User, LaundryOrder, LaundryRate, LaundryPayroll } from '@/types'

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
]

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function LaundryPayrollPage() {
  const [staff, setStaff] = useState<User[]>([])
  const [orders, setOrders] = useState<LaundryOrder[]>([])
  const [rate, setRate] = useState<LaundryRate | null>(null)
  const [payrolls, setPayrolls] = useState<LaundryPayroll[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showPaidModal, setShowPaidModal] = useState<LaundryPayroll | null>(null)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const [staffRes, ordersRes, rateRes, payrollRes] = await Promise.all([
      supabase.from('users').select('*').eq('role', 'laundry').eq('status', 'active'),
      supabase.from('laundry_orders').select('*').eq('status', 'done'),
      supabase.from('laundry_rates').select('*').eq('is_active', true).single(),
      supabase.from('laundry_payroll').select('*').eq('period_month', selectedMonth).eq('period_year', selectedYear)
    ])
    setStaff((staffRes.data as User[]) ?? [])
    setOrders((ordersRes.data as LaundryOrder[]) ?? [])
    setRate(rateRes.data as LaundryRate | null)
    setPayrolls((payrollRes.data as LaundryPayroll[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [selectedMonth, selectedYear])

  async function generatePayroll() {
    const ratePerKg = rate?.rate_per_kg ?? 0
    for (const s of staff) {
      const staffOrders = orders.filter((o) => {
        if (o.assigned_to !== s.id) return false
        const d = new Date(o.completed_at ?? o.created_at)
        const startDate = new Date(selectedYear, selectedMonth - 1, 1)
        const endDate = new Date(selectedYear, selectedMonth, 1)
        return d >= startDate && d < endDate
      })
      const totalKg = staffOrders.reduce((sum, o) => sum + Number(o.kg), 0)
      const totalAmount = totalKg * ratePerKg
      if (totalKg === 0) continue

      const existing = payrolls.find((p) => p.staff_id === s.id)
      if (existing) {
        await supabase
          .from('laundry_payroll')
          .update({
            total_kg: totalKg,
            total_rate: ratePerKg,
            total_amount: totalAmount
          })
          .eq('id', existing.id)
      } else {
        await supabase.from('laundry_payroll').insert({
          staff_id: s.id,
          period_month: selectedMonth,
          period_year: selectedYear,
          total_kg: totalKg,
          total_rate: ratePerKg,
          total_amount: totalAmount,
          status: 'pending'
        })
      }
    }
    fetchData()
  }

  async function markAsPaid(payrollId: string) {
    setSaving(true)
    await supabase.from('laundry_payroll').update({ status: 'paid' }).eq('id', payrollId)
    setSaving(false)
    setShowPaidModal(null)
    fetchData()
  }

  function getStaffSummary(staffId: string) {
    const staffOrders = orders.filter(
      (o) =>
        o.assigned_to === staffId &&
        new Date(o.completed_at ?? o.created_at).getMonth() + 1 === selectedMonth &&
        new Date(o.completed_at ?? o.created_at).getFullYear() === selectedYear
    )
    const totalKg = staffOrders.reduce((sum, o) => sum + Number(o.kg), 0)
    const ratePerKg = rate?.rate_per_kg ?? 0
    const totalAmount = totalKg * ratePerKg
    const payroll = payrolls.find((p) => p.staff_id === staffId)
    return { staffOrders, totalKg, ratePerKg, totalAmount, payroll }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Laundry Payroll</h1>
          <p className="page-subtitle">Akumulasi upah laundry staff per bulan</p>
        </div>
        <button
          onClick={generatePayroll}
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
          <Wallet size={16} /> Generate Payroll
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          style={{
            padding: '0.625rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            outline: 'none',
            background: '#fff'
          }}
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          style={{
            padding: '0.625rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            outline: 'none',
            background: '#fff'
          }}
        >
          {[2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <div style={{ marginLeft: 'auto', fontSize: '0.875rem', color: '#6b7280' }}>
          Rate: <strong style={{ color: '#374151' }}>{rate ? fmt(rate.rate_per_kg) + '/kg' : '...'}</strong>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {(() => {
          const totalKgAll = staff.reduce((sum, s) => sum + getStaffSummary(s.id).totalKg, 0)
          const totalAmountAll = totalKgAll * (rate?.rate_per_kg ?? 0)
          const paidCount = payrolls.filter((p) => p.status === 'paid').length
          return (
            <>
              <div style={{ background: '#fef3c7', borderRadius: '0.75rem', padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#92400e' }}>{staff.length}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#92400e' }}>Total Staff</div>
              </div>
              <div style={{ background: '#dbeafe', borderRadius: '0.75rem', padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e40af' }}>
                  {totalKgAll.toFixed(1)} kg
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1e40af' }}>Total Kg (Bulan Ini)</div>
              </div>
              <div style={{ background: '#d1fae5', borderRadius: '0.75rem', padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#065f46' }}>{fmt(totalAmountAll)}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#065f46' }}>Total Upah (Bulan Ini)</div>
              </div>
            </>
          )
        })()}
      </div>

      {/* Staff List */}
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Memuat...</div>
      ) : staff.length === 0 ? (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#9ca3af',
            background: '#f9fafb',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb'
          }}
        >
          Tidak ada staff laundry
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {staff.map((s) => {
            const { totalKg, ratePerKg, totalAmount, payroll } = getStaffSummary(s.id)
            const isPaid = payroll?.status === 'paid'
            return (
              <div
                key={s.id}
                style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '1rem', marginBottom: '0.25rem' }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {totalKg > 0 ? `${totalKg.toFixed(1)} kg × ${fmt(ratePerKg)}` : 'Belum ada pesanan selesai'}
                    </div>
                    {payroll && (
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                        {payroll.status === 'paid' ? '✓ Lunas' : '⏳ Pending'}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: isPaid ? '#16a34a' : '#374151' }}>
                      {fmt(totalAmount)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Total Upah</div>
                    {!isPaid && totalAmount > 0 && (
                      <button
                        onClick={() => payroll && setShowPaidModal(payroll)}
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.375rem 0.75rem',
                          background: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Bayar
                      </button>
                    )}
                    {isPaid && (
                      <div
                        style={{
                          marginTop: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          color: '#16a34a',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}
                      >
                        <CheckCircle2 size={14} /> Lunas
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Paid Confirmation Modal */}
      {showPaidModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPaidModal(null)
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '0.875rem',
              padding: '2rem',
              width: '100%',
              maxWidth: 400,
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)'
            }}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>Konfirmasi Pembayaran</h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
              Yakin ingin menandai payroll ini sebagai <strong>Lunas</strong>?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowPaidModal(null)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  background: '#fff',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Batal
              </button>
              <button
                onClick={() => markAsPaid(showPaidModal.id)}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {saving ? 'Menyimpan...' : '✓ Bayar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
