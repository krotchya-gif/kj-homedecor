'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface BookingCalendarProps {
  selectedDate: string | null
  onDateSelect: (date: string) => void
  occupiedDates: Set<string>
  occupiedSlots?: Set<string>
}

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export default function BookingCalendar({
  selectedDate,
  onDateSelect,
  occupiedDates,
  occupiedSlots,
}: BookingCalendarProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(y => y - 1)
    } else {
      setCurrentMonth(m => m - 1)
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(y => y + 1)
    } else {
      setCurrentMonth(m => m + 1)
    }
  }

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
  }

  function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay()
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  function formatDate(day: number) {
    const m = String(currentMonth + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${currentYear}-${m}-${d}`
  }

  function getDateOccupiedLevel(dateStr: string): 'none' | 'low' | 'medium' | 'high' {
    if (!occupiedDates.has(dateStr)) return 'none'
    if (!occupiedSlots) return 'medium'
    const count = occupiedSlots.size
    if (count >= 8) return 'high'
    if (count >= 4) return 'medium'
    return 'low'
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="booking-calendar">
      <div className="booking-calendar-header">
        <button onClick={prevMonth} className="cal-nav-btn" aria-label="Prev month">
          <ChevronLeft size={16} />
        </button>
        <span className="cal-month-label">
          {MONTHS[currentMonth]} {currentYear}
        </span>
        <button onClick={nextMonth} className="cal-nav-btn" aria-label="Next month">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="cal-grid">
        {DAYS.map(d => (
          <div key={d} className="cal-day-header">{d}</div>
        ))}
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="cal-cell cal-cell-empty" />
          const dateStr = formatDate(day)
          const isToday = dateStr === formatDate(today.getDate())
          const isSelected = dateStr === selectedDate
          const isPast = dateStr < formatDate(today.getDate())
          const level = getDateOccupiedLevel(dateStr)

          return (
            <button
              key={dateStr}
              onClick={() => !isPast && onDateSelect(dateStr)}
              disabled={isPast}
              className={[
                'cal-cell',
                'cal-date-btn',
                isToday ? 'cal-today' : '',
                isSelected ? 'cal-selected' : '',
                isPast ? 'cal-past' : '',
                level !== 'none' ? `cal-occupied-${level}` : '',
              ].filter(Boolean).join(' ')}
              title={level !== 'none' ? `Terbooking ${occupiedSlots?.size || ''} slot` : 'Tersedia'}
            >
              {day}
              {level !== 'none' && (
                <span className={`cal-dot cal-dot-${level}`} />
              )}
            </button>
          )
        })}
      </div>

      <div className="cal-legend">
        <span className="cal-legend-item"><span className="cal-dot cal-dot-low" /> Sebagian</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot-medium" /> Sibuk</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot-high" /> Penuh</span>
      </div>
    </div>
  )
}