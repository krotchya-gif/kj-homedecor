'use client'

import { Download } from 'lucide-react'

interface ReportPDFButtonProps {
  onClick: () => void
  label?: string
  className?: string
  disabled?: boolean
}

export default function ReportPDFButton({
  onClick,
  label = 'Download PDF',
  className = '',
  disabled = false,
}: ReportPDFButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-5 py-2.5 bg-[#cc7030] text-white text-sm font-semibold rounded-lg hover:bg-[#b8652a] active:bg-[#a05823] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${className}`}
    >
      <Download size={18} />
      {label}
    </button>
  )
}