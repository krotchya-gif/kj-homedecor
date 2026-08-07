'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Pagination — nomor halaman + dropdown limit (baris per halaman).
 * Best practice: nomor halaman dengan ellipsis windowing (1 2 3 … 9 10),
 * prev/next icon, dan select limit di samping.
 */
export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  totalItems,
  startIndex,
  endIndex
}: {
  currentPage: number
  totalPages: number
  onPageChange: (p: number) => void
  pageSize: number
  onPageSizeChange: (s: number) => void
  pageSizeOptions?: number[]
  totalItems?: number
  startIndex?: number
  endIndex?: number
}) {
  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage > 3) pages.push('...')
    const from = Math.max(2, currentPage - 1)
    const to = Math.min(totalPages - 1, currentPage + 1)
    for (let i = from; i <= to; i++) pages.push(i)
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  const btnBase: React.CSSProperties = {
    minWidth: 34,
    minHeight: 34,
    padding: '0 0.5rem',
    borderRadius: '0.5rem',
    fontSize: '0.8rem',
    fontWeight: '600',
    border: '1px solid var(--neutral-200)',
    background: 'var(--surface)',
    color: 'var(--neutral-600)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginTop: '1rem'
      }}
    >
      <div style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>
        Menampilkan{' '}
        {startIndex ?? (totalItems ? (currentPage - 1) * pageSize + 1 : 0)}–
        {endIndex ?? Math.min(currentPage * pageSize, totalItems ?? 0)} dari {totalItems ?? 0}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
          Baris per halaman
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{
              padding: '0.375rem 0.5rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--neutral-200)',
              background: 'var(--surface)',
              fontSize: '0.8rem',
              color: 'var(--neutral-700)',
              cursor: 'pointer',
              minHeight: 34
            }}
          >
            {pageSizeOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          <button
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            style={{ ...btnBase, opacity: currentPage <= 1 ? 0.4 : 1, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>
          {pages.map((pg, i) =>
            pg === '...' ? (
              <span key={`e${i}`} style={{ padding: '0 0.25rem', color: 'var(--neutral-400)' }}>
                …
              </span>
            ) : (
              <button
                key={pg}
                onClick={() => onPageChange(pg)}
                disabled={pg === currentPage}
                style={{
                  ...btnBase,
                  background: pg === currentPage ? '#cc7030' : 'var(--surface)',
                  color: pg === currentPage ? '#fff' : 'var(--neutral-600)',
                  borderColor: pg === currentPage ? '#cc7030' : 'var(--neutral-200)',
                  cursor: pg === currentPage ? 'default' : 'pointer'
                }}
              >
                {pg}
              </button>
            )
          )}
          <button
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            style={{ ...btnBase, opacity: currentPage >= totalPages ? 0.4 : 1, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
            aria-label="Halaman selanjutnya"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
