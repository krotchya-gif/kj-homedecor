'use client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Wallet, CheckCircle2, Clock, TrendingUp, Download } from 'lucide-react'
import type { User, LaundryOrder, LaundryRate, LaundryPayroll } from '@/types'
import { useToast } from '@/components/ui/Toast'
import { createSimpleJournal } from '@/utils/journal/create'

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
  const { toast } = useToast()
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
      supabase.from('laundry_rates').select('*').eq('is_active', true).maybeSingle(),
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
        const { error: updErr } = await supabase
          .from('laundry_payroll')
          .update({
            total_kg: totalKg,
            total_rate: ratePerKg,
            total_amount: totalAmount
          })
          .eq('id', existing.id)
        if (updErr) { toast('error', 'Gagal update payroll: ' + updErr.message); return }
      } else {
        const { error } = await supabase.from('laundry_payroll').insert({
          staff_id: s.id,
          period_month: selectedMonth,
          period_year: selectedYear,
          total_kg: totalKg,
          total_rate: ratePerKg,
          total_amount: totalAmount,
          status: 'pending'
        })
        if (error) { toast('error', 'Gagal simpan payroll: ' + error.message); return }
      }
    }
    fetchData()
  }

  async function markAsPaid(payrollId: string) {
    setSaving(true)
    // Optimistic update + rollback
    const prev = payrolls
    setPayrolls((curr) => curr.map((p) => (p.id === payrollId ? { ...p, status: 'paid' } : p)))
    const { error } = await supabase.from('laundry_payroll').update({ status: 'paid' }).eq('id', payrollId)
    if (error) { setPayrolls(prev); setSaving(false); toast('error', 'Gagal mark paid: ' + error.message); return }
    // F-11 fix (2026-08-11): gaji dibayar wajib jurnal Dr Beban Gaji / Cr Kas
    const target = payrolls.find((p) => p.id === payrollId)
    const staffName = staff.find((s) => s.id === target?.staff_id)?.name ?? ''
    if (target && target.total_amount > 0) {
      try {
        await createSimpleJournal({
          transaction_type: 'expense_paid',
          reference_type: 'laundry_payroll',
          reference_id: payrollId,
          description: `Pembayaran gaji laundry ${staffName} (${target.period_month}/${target.period_year})`,
          amount: target.total_amount
        })
      } catch (jErr) {
        console.error('Gagal buat jurnal payroll:', jErr)
        toast('warning', 'Payroll ditandai lunas, TAPI jurnal GAGAL. Periksa mapping akun.')
      }
    }
    setSaving(false)
    setShowPaidModal(null)
    toast('success', 'Payroll ditandai lunas')
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
      <PageHeader
        title="Laundry Payroll"
        subtitle="Akumulasi upah laundry staff per bulan"
        action={
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
        }
      />

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
            background: 'var(--surface)'
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
            background: 'var(--surface)'
          }}
        >
          {[2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <div style={{ marginLeft: 'auto', fontSize: '0.875rem', color: 'var(--neutral-600)' }}>
          Rate: <strong style={{ color: 'var(--neutral-700)' }}>{rate ? fmt(rate.rate_per_kg) + '/kg' : '...'}</strong>
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
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
      ) : staff.length === 0 ? (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            color: 'var(--neutral-400)',
            background: 'var(--neutral-100)',
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
                style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem' }}
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
                    <div style={{ fontWeight: '600', color: 'var(--neutral-800)', fontSize: '1rem', marginBottom: '0.25rem' }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
                      {totalKg > 0 ? `${totalKg.toFixed(1)} kg × ${fmt(ratePerKg)}` : 'Belum ada pesanan selesai'}
                    </div>
                    {payroll && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.25rem' }}>
                        {payroll.status === 'paid' ? '✓ Lunas' : '⏳ Pending'}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: isPaid ? '#16a34a' : 'var(--neutral-700)' }}>
                      {fmt(totalAmount)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>Total Upah</div>
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
      <Modal open={!!showPaidModal} onClose={() => setShowPaidModal(null)} maxWidth={400} padding="2rem" zIndex={200}>
        {showPaidModal && (
          <>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>Konfirmasi Pembayaran</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--neutral-600)', marginBottom: '1.5rem' }}>
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
                  background: 'var(--surface)',
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
          </>
        )}
      </Modal>
    </div>
  )
}
