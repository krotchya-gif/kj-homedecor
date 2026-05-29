'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onStartChange: (date: string) => void
  onEndChange: (date: string) => void
  className?: string
}

const PRESETS = [
  { label: '7 Hari', days: 7 },
  { label: '30 Hari', days: 30 },
  { label: 'Bulan Ini', days: 0, special: 'this_month' },
  { label: 'Semua', days: 0, special: 'all' },
]

export default function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  className = '',
}: DateRangePickerProps) {
  const [showPresets, setShowPresets] = useState(false)

  function applyPreset(preset: typeof PRESETS[0]) {
    const today = new Date()
    let start = ''
    let end = ''

    if (preset.special === 'this_month') {
      const y = today.getFullYear()
      const m = today.getMonth()
      start = `${y}-${String(m + 1).padStart(2, '0')}-01`
      end = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`
    } else if (preset.special === 'all') {
      start = '2020-01-01'
      end = '2099-12-31'
    } else {
      const startD = new Date(today)
      startD.setDate(today.getDate() - preset.days)
      start = startD.toISOString().split('T')[0]
      end = today.toISOString().split('T')[0]
    }

    onStartChange(start)
    onEndChange(end)
    setShowPresets(false)
  }

  function formatDisplayDate(dateStr: string) {
    if (!dateStr || dateStr === '2099-12-31') return 'Semua'
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Periode:</span>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => applyPreset(preset)}
            className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:border-orange-400 transition-colors shadow-sm"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Date inputs */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartChange(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
        />
        <span className="text-sm text-gray-400">—</span>
        <input
          type="date"
          value={endDate === '2099-12-31' ? '' : endDate}
          onChange={(e) => onEndChange(e.target.value || '2099-12-31')}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
        />
      </div>

      {/* Display info */}
      {startDate && endDate && (
        <span className="text-sm text-gray-500 font-medium">
          ({formatDisplayDate(startDate)} — {formatDisplayDate(endDate)})
        </span>
      )}
    </div>
  )
}