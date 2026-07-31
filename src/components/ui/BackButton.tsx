'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  label?: string
  href?: string
  className?: string
}

export default function BackButton({ label = 'Kembali', href, className = '' }: BackButtonProps) {
  const router = useRouter()

  if (href) {
    return (
      <a
        href={href}
        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-orange-400 transition-colors shadow-sm ${className}`}
      >
        <ArrowLeft size={16} />
        {label}
      </a>
    )
  }

  return (
    <button
      onClick={() => router.back()}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-orange-400 transition-colors shadow-sm ${className}`}
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  )
}
