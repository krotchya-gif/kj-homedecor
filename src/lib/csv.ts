/**
 * CSV Utility — Export, Parse, and Template Generation
 */

/**
 * Convert array of objects to CSV string and trigger download
 */
export function exportToCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; label: string }[]
): void {
  const headers = columns.map((c) => c.label)
  const csvRows = rows.map((row) =>
    columns
      .map((col) => {
        const val = row[col.key]
        const str = val == null ? '' : String(val)
        // Escape fields that contain comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      })
      .join(',')
  )
  const csv = [headers.join(','), ...csvRows].join('\n')
  downloadCSV(csv, `export-${Date.now()}.csv`)
}

/**
 * Generate a blank CSV template with column headers
 */
export function generateCSVTemplate(columns: { key: string; label: string }[]): void {
  const headers = columns.map((c) => c.label)
  const csv = headers.join(',')
  downloadCSV(csv, `template-${Date.now()}.csv`)
}

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Parse a CSV File object to array of objects
 * Returns rows as string arrays (not parsed) — use with column mapping
 */
export async function parseCSV(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const text = await file.text()
  const lines = text.trim().split(/\r?\n/)
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseRow = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseRow(lines[0])
  const rows = lines.slice(1).map(parseRow)
  return { headers, rows }
}

/**
 * Auto-detect column mapping between CSV headers and expected DB columns
 * Returns: Map<DBColumnKey, CSVColumnIndex | null>
 */
export function autoDetectMapping(
  csvHeaders: string[],
  dbColumns: { key: string; label: string; aliases?: string[] }[]
): Map<string, number | null> {
  const mapping = new Map<string, number | null>()

  for (const col of dbColumns) {
    const allNames = [col.label, ...(col.aliases ?? [])].map((n) => n.toLowerCase().trim())
    const idx = csvHeaders.findIndex((h) => allNames.includes(h.toLowerCase().trim()))
    mapping.set(col.key, idx >= 0 ? idx : null)
  }

  return mapping
}
