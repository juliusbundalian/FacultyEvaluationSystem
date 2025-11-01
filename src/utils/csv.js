// Lightweight CSV parser used by the app.
// NOTE: This is intentionally small and dependency-free. It handles common simple CSV files
// with a header row and comma-separated values. It does not fully implement RFC4180
// (quoted fields with embedded commas/newlines). If you need that, replace this with PapaParse.

export function parseCSV(text) {
  if (!text || typeof text !== 'string') return { headers: [], rows: [] }

  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    // split on commas. This is simplistic (doesn't support quoted commas).
    const cols = lines[i].split(',').map((c) => c.trim())
    if (cols.length === 1 && cols[0] === '') continue
    const obj = {}
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = cols[j] ?? ''
    }
    rows.push(obj)
  }

  return { headers, rows }
}

export default parseCSV
