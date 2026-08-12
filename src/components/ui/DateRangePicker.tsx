'use client'

import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onStartChange: (date: string) => void
  onEndChange: (date: string) => void
  className?: string
}

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
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

function formatDisplay(dateStr: string) {
  if (!dateStr || dateStr === '2099-12-31') return 'Semua'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatShort(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${MONTHS[d.getMonth()].substring(0, 3)}`
}

// BUG-075 fix (2026-08-13): format dari komponen tanggal LOKAL — jangan pakai
// toISOString().split('T')[0] yang mengubah ke UTC (di WIB UTC+7, pilih tgl 1 jadi 31,
// pilih tgl 10 jadi 9). Helper ini membaca getFullYear/getMonth/getDate langsung.
function toLocalDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  className = ''
}: DateRangePickerProps) {
  const [showStart, setShowStart] = useState(false)
  const [showEnd, setShowEnd] = useState(false)
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [selectingStart, setSelectingStart] = useState(true)
  const [tempStart, setTempStart] = useState(startDate)
  const [tempEnd, setTempEnd] = useState(endDate)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
  }

  function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay()
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else setViewMonth((m) => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else setViewMonth((m) => m + 1)
  }

  function selectDate(date: Date) {
    const dateStr = toLocalDateStr(date)
    if (selectingStart) {
      setTempStart(dateStr)
      setTempEnd(dateStr)
      setSelectingStart(false)
    } else {
      if (dateStr < tempStart) {
        setTempEnd(tempStart)
        setTempStart(dateStr)
      } else {
        setTempEnd(dateStr)
      }
      onStartChange(tempStart)
      onEndChange(dateStr)
      setShowStart(false)
      setShowEnd(false)
      setSelectingStart(true)
    }
  }

  function isInRange(date: Date) {
    const d = toLocalDateStr(date)
    return d >= tempStart && d <= tempEnd
  }

  function isSelected(date: Date) {
    const d = toLocalDateStr(date)
    return d === tempStart || d === tempEnd
  }

  function isToday(date: Date) {
    return date.toDateString() === today.toDateString()
  }

  function openCalendar(isStart: boolean) {
    if (isStart) {
      setShowStart(!showStart)
      setShowEnd(false)
      setSelectingStart(true)
    } else {
      setShowEnd(!showEnd)
      setShowStart(false)
      setSelectingStart(false)
    }
    setTempStart(startDate)
    setTempEnd(endDate === '2099-12-31' ? startDate : endDate)
  }

  function applyAndClose() {
    onStartChange(tempStart)
    onEndChange(tempEnd === startDate ? '2099-12-31' : tempEnd)
    setShowStart(false)
    setShowEnd(false)
  }

  // Quick presets
  function applyPreset(days: number) {
    const end = toLocalDateStr(today)
    const start = new Date(today)
    start.setDate(today.getDate() - days)
    onStartChange(toLocalDateStr(start))
    onEndChange(end)
  }

  function applyThisMonth() {
    const y = today.getFullYear()
    const m = today.getMonth()
    onStartChange(`${y}-${String(m + 1).padStart(2, '0')}-01`)
    const lastDay = new Date(y, m + 1, 0).getDate()
    onEndChange(`${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`)
  }

  function applyAll() {
    onStartChange('2020-01-01')
    onEndChange('2099-12-31')
  }

  const CalendarPicker = ({ onClose }: { onClose: () => void }) => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
    const cells: (Date | null)[] = []

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) cells.push(null)
    // Days
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d))

    return (
      <div className="section-card">
        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <button
            onClick={prevMonth}
            style={{ padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '0.5rem' }}
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            style={{ padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '0.5rem' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '0.5rem' }}>
          {DAYS.map((d) => (
            <div
              key={d}
              style={{
                textAlign: 'center',
                fontSize: '0.75rem',
                color: 'var(--neutral-400)',
                fontWeight: '500',
                padding: '0.25rem'
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {cells.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} />
            const selected = isSelected(date)
            const inRange = isInRange(date)
            const isT = isToday(date)
            return (
              <button
                key={date.toISOString()}
                onClick={() => selectDate(date)}
                style={{
                  padding: '0.5rem',
                  textAlign: 'center',
                  fontSize: '0.82rem',
                  fontWeight: selected ? '700' : '400',
                  background: inRange ? 'var(--neutral-200)' : selected ? '#cc7030' : 'transparent',
                  color: selected ? '#fff' : inRange ? 'var(--neutral-700)' : 'var(--neutral-700)',
                  border: isT && !selected ? '1px solid #cc7030' : 'none',
                  borderRadius: selected ? '0.5rem' : '0',
                  cursor: 'pointer'
                }}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>

        {/* Selected range display */}
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            background: 'var(--neutral-100)',
            borderRadius: '0.5rem',
            fontSize: '0.82rem',
            textAlign: 'center'
          }}
        >
          <span style={{ fontWeight: '600', color: '#cc7030' }}>{formatShort(tempStart)}</span>
          <span style={{ color: 'var(--neutral-400)', margin: '0 0.5rem' }}>—</span>
          <span style={{ fontWeight: '600', color: '#cc7030' }}>{formatShort(tempEnd)}</span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button
            onClick={applyAndClose}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: '#cc7030',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Terapkan
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 0.75rem',
              background: 'var(--neutral-100)',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Batal
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Selected range display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={16} className="text-gray-500" />
          <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--neutral-700)' }}>Periode:</span>
        </div>

        {/* Start date button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => openCalendar(true)}
            style={{
              padding: '0.625rem 1rem',
              background: 'var(--surface)',
              border: '1px solid var(--input-border)',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
              minWidth: '140px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ color: startDate && startDate !== '2020-01-01' ? 'var(--neutral-700)' : 'var(--neutral-400)' }}>
              {startDate && startDate !== '2020-01-01' ? formatShort(startDate) : 'Tanggal Mulai'}
            </span>
          </button>
          {showStart && <CalendarPicker onClose={() => setShowStart(false)} />}
        </div>

        <span style={{ color: 'var(--neutral-400)' }}>—</span>

        {/* End date button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => openCalendar(false)}
            style={{
              padding: '0.625rem 1rem',
              background: 'var(--surface)',
              border: '1px solid var(--input-border)',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
              minWidth: '140px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ color: endDate && endDate !== '2099-12-31' ? 'var(--neutral-700)' : 'var(--neutral-400)' }}>
              {endDate && endDate !== '2099-12-31' ? formatShort(endDate) : 'Tanggal Akhir'}
            </span>
          </button>
          {showEnd && <CalendarPicker onClose={() => setShowEnd(false)} />}
        </div>

        {/* Quick presets */}
        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '0.5rem' }}>
          <button
            onClick={() => applyPreset(7)}
            style={{
              padding: '0.5rem 0.875rem',
              background: 'var(--surface)',
              border: '1px solid var(--input-border)',
              borderRadius: '0.5rem',
              fontSize: '0.78rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            7 Hari
          </button>
          <button
            onClick={() => applyPreset(30)}
            style={{
              padding: '0.5rem 0.875rem',
              background: 'var(--surface)',
              border: '1px solid var(--input-border)',
              borderRadius: '0.5rem',
              fontSize: '0.78rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            30 Hari
          </button>
          <button
            onClick={applyThisMonth}
            style={{
              padding: '0.5rem 0.875rem',
              background: 'var(--surface)',
              border: '1px solid var(--input-border)',
              borderRadius: '0.5rem',
              fontSize: '0.78rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Bulan Ini
          </button>
          <button
            onClick={applyAll}
            style={{
              padding: '0.5rem 0.875rem',
              background: 'var(--surface)',
              border: '1px solid var(--input-border)',
              borderRadius: '0.5rem',
              fontSize: '0.78rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Semua
          </button>
        </div>
      </div>

      {/* Current display */}
      {startDate && endDate && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--neutral-600)' }}>
          Menampilkan: <span style={{ fontWeight: '600', color: 'var(--neutral-700)' }}>{formatDisplay(startDate)}</span> sampai{' '}
          <span style={{ fontWeight: '600', color: 'var(--neutral-700)' }}>{formatDisplay(endDate)}</span>
        </div>
      )}
    </div>
  )
}
