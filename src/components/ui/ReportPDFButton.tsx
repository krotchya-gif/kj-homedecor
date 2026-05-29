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
      className={`flex items-center gap-1.5 px-3 py-1.5 bg-[#cc7030] text-white text-xs font-semibold rounded-md hover:bg-[#b8652a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Download size={14} />
      {label}
    </button>
  )
}