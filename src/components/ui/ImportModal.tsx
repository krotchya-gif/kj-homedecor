'use client'

import { useState, useCallback, useRef } from 'react'
import { X, Upload, FileText, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react'
import { parseCSV, autoDetectMapping } from '@/lib/csv'

interface Column {
  key: string
  label: string
  aliases?: string[]
  required?: boolean
}

interface ImportModalProps {
  open: boolean
  onClose: () => void
  /** CSV column headers → DB column key mapping */
  columns: Column[]
  /** Custom field resolver for complex FK lookups (e.g., category name → id) */
  resolveField?: (key: string, value: string) => string | number | boolean | null
  /** Called with mapped rows for final import */
  onImport: (
    rows: Record<string, string | number | boolean | null>[]
  ) => Promise<{ inserted: number; updated: number; errors: string[] }>
  entityName?: string
}

export default function ImportModal({
  open,
  onClose,
  columns,
  resolveField,
  onImport,
  entityName = 'data'
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Map<string, number | null>>(new Map())
  const [parsed, setParsed] = useState<Record<string, string | number | boolean | null>[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ inserted: number; updated: number; errors: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (f: File) => {
      setFile(f)
      setErrors([])
      setResult(null)
      try {
        const { headers, rows } = await parseCSV(f)
        setCsvHeaders(headers)
        setCsvRows(rows)
        const autoMap = autoDetectMapping(headers, columns)
        setMapping(autoMap)
        // Parse preview rows
        const preview = rows.slice(0, 5).map((row) => {
          const obj: Record<string, string | number | boolean | null> = {}
          autoMap.forEach((colIdx, key) => {
            if (colIdx !== null && colIdx >= 0) {
              const raw = row[colIdx] ?? ''
              const resolved = resolveField ? resolveField(key, raw) : raw
              obj[key] = resolved
            } else {
              obj[key] = null
            }
          })
          return obj
        })
        setParsed(preview)
      } catch (e) {
        setErrors([`Gagal parse CSV: ${e instanceof Error ? e.message : String(e)}`])
      }
    },
    [columns, resolveField]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const f = e.dataTransfer.files[0]
      if (f && f.name.endsWith('.csv')) handleFile(f)
      else setErrors(['File harus format .csv'])
    },
    [handleFile]
  )

  const handleMappingChange = (key: string, csvColIdx: number | null) => {
    const newMap = new Map(mapping)
    newMap.set(key, csvColIdx)
    setMapping(newMap)
    // Update preview with new mapping
    const updated = csvRows.slice(0, 5).map((row) => {
      const obj: Record<string, string | number | boolean | null> = {}
      newMap.forEach((colIdx, k) => {
        if (colIdx !== null && colIdx >= 0) {
          const raw = row[colIdx] ?? ''
          const resolved = resolveField ? resolveField(k, raw) : raw
          obj[k] = resolved
        } else {
          obj[k] = null
        }
      })
      return obj
    })
    setParsed(updated)
  }

  const allMapped = columns
    .filter((c) => c.required)
    .every((c) => mapping.get(c.key) !== null && mapping.get(c.key) !== undefined)

  async function handleImport() {
    if (!allMapped) {
      setErrors(['Pastikan semua kolom wajib sudah di-map'])
      return
    }
    setImporting(true)
    setErrors([])
    try {
      const allRows = csvRows.map((row) => {
        const obj: Record<string, string | number | boolean | null> = {}
        mapping.forEach((colIdx, key) => {
          if (colIdx !== null && colIdx >= 0) {
            const raw = row[colIdx] ?? ''
            const resolved = resolveField ? resolveField(key, raw) : raw
            obj[key] = resolved
          } else {
            obj[key] = null
          }
        })
        return obj
      })
      const res = await onImport(allRows)
      setResult(res)
    } catch (e) {
      setErrors([e instanceof Error ? e.message : String(e)])
    } finally {
      setImporting(false)
    }
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !importing) onClose()
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '0.875rem',
          width: '100%',
          maxWidth: 800,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.25)'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e5e7eb'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={20} style={{ color: '#cc7030' }} />
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>Import {entityName}</h2>
          </div>
          {!importing && (
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
          {/* Success Result */}
          {result && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
                <span style={{ fontWeight: '700', color: '#166534' }}>Import Selesai</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#166534' }}>
                {result.inserted > 0 && <div>✅ {result.inserted} data baru ditambahkan</div>}
                {result.updated > 0 && <div>🔄 {result.updated} data diperbarui</div>}
                {result.errors.length > 0 && (
                  <details style={{ marginTop: '0.5rem' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{result.errors.length} error(s)</summary>
                    {result.errors.slice(0, 10).map((e, i) => (
                      <div key={i} style={{ marginLeft: '1rem', fontSize: '0.8rem', color: '#dc2626' }}>
                        • {e}
                      </div>
                    ))}
                    {result.errors.length > 10 && (
                      <div style={{ marginLeft: '1rem', fontSize: '0.8rem' }}>
                        ...and {result.errors.length - 10} more
                      </div>
                    )}
                  </details>
                )}
              </div>
              <button
                onClick={onClose}
                style={{
                  marginTop: '1rem',
                  padding: '0.5rem 1rem',
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Tutup
              </button>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.75rem',
                padding: '1rem',
                marginBottom: '1rem'
              }}
            >
              {errors.map((e, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}
                >
                  <AlertCircle size={14} style={{ color: '#dc2626', marginTop: 3, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', color: '#dc2626' }}>{e}</span>
                </div>
              ))}
            </div>
          )}

          {/* Step 1: File Upload */}
          {!file && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #d1d5db',
                borderRadius: '0.75rem',
                padding: '3rem',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              <Upload size={32} style={{ color: 'var(--neutral-400)', margin: '0 auto 1rem' }} />
              <div style={{ fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.25rem' }}>Upload file CSV</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--neutral-400)' }}>Drag & drop atau klik untuk pilih file</div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
                style={{ display: 'none' }}
              />
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {file && csvHeaders.length > 0 && !result && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
                <span style={{ fontSize: '0.875rem', color: '#166534' }}>
                  File: <strong>{file.name}</strong> ({csvRows.length} baris)
                </span>
                <button
                  onClick={() => {
                    setFile(null)
                    setCsvHeaders([])
                    setCsvRows([])
                    setMapping(new Map())
                    setParsed([])
                  }}
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    color: '#dc2626'
                  }}
                >
                  Ganti file
                </button>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.75rem' }}>
                  Map Kolom CSV → Sistem
                  <span style={{ fontWeight: 400, color: 'var(--neutral-400)', marginLeft: '0.5rem' }}>
                    (Pilih kolom CSV untuk setiap kolom sistem)
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '0.75rem'
                  }}
                >
                  {columns.map((col) => (
                    <div key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: col.required ? '#cc7030' : 'var(--neutral-600)'
                          }}
                        >
                          {col.label} {col.required && '*'}
                        </div>
                      </div>
                      <select
                        value={mapping.get(col.key) ?? ''}
                        onChange={(e) => handleMappingChange(col.key, e.target.value ? Number(e.target.value) : null)}
                        style={{
                          flex: 1,
                          padding: '0.375rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.8rem'
                        }}
                      >
                        <option value="">— skip —</option>
                        {csvHeaders.map((h, i) => (
                          <option key={i} value={i}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {parsed.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.5rem' }}>
                    Preview (5 baris pertama)
                  </div>
                  <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead>
                        <tr>
                          {columns
                            .filter((c) => mapping.get(c.key) !== null)
                            .map((c) => (
                              <th
                                key={c.key}
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  background: 'var(--neutral-100)',
                                  borderBottom: '1px solid #e5e7eb',
                                  textAlign: 'left',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {c.label}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.map((row, i) => (
                          <tr key={i}>
                            {columns
                              .filter((c) => mapping.get(c.key) !== null)
                              .map((c) => (
                                <td
                                  key={c.key}
                                  style={{ padding: '0.375rem 0.75rem', borderBottom: '1px solid #f3f4f6' }}
                                >
                                  {String(row[c.key] ?? '—')}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={!allMapped || importing}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: !allMapped ? 'var(--neutral-300)' : importing ? '#f59e0b' : '#cc7030',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: allMapped && !importing ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {importing ? '⏳ Mengimport...' : `Import ${csvRows.length} Baris`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
