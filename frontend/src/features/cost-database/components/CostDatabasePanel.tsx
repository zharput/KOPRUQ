import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'

/**
 * Cost Database (2026-09-13, engineer's own instruction - "cost
 * database'e 'From Excel' butonu ekle"). No cost-data column schema has
 * been given yet (unlike Bridge Information's real, specific 7-column
 * spreadsheet), so this does not invent one - it's a generic
 * "upload any spreadsheet, show it as a table" import: whatever column
 * headers the uploaded sheet's first row has become the table's
 * columns, verbatim. Same SheetJS (`xlsx`) library already used and
 * `npm audit`-checked for Project Information's Bridge Information
 * import (see `features/project/api/excelImport.ts` and
 * docs/architecture.md).
 *
 * <p>Presentation/local state only - nothing is sent to a backend, the
 * imported rows only live in this component's own state for viewing.
 */
export default function CostDatabasePanel() {
  const [columns, setColumns] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleExcelFile(file: File) {
    setImportError(null)
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const sheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' })
      if (sheetRows.length === 0) {
        setImportError('No rows found in that sheet.')
        return
      }
      const headerColumns = Object.keys(sheetRows[0])
      setColumns(headerColumns)
      setRows(sheetRows)
      setFileName(file.name)
    } catch (e) {
      setImportError(e instanceof Error ? `Could not read that file: ${e.message}` : 'Could not read that file.')
    }
  }

  return (
    <div className="spn-workflow">
      <div className="spn-card">
        <div className="spn-card-header-row">
          <h2 className="spn-card-title">Cost Database</h2>
          <button type="button" className="spn-button-secondary" onClick={() => fileInputRef.current?.click()}>
            From Excel
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleExcelFile(file)
              e.target.value = ''
            }}
          />
        </div>
        <p className="spn-card-subtitle">
          No cost estimation method is agreed yet (P08) - this only imports and displays a spreadsheet as-is,
          whatever columns it has. Upload a cost spreadsheet to view it here.
        </p>
        {importError && <p className="spn-error">{importError}</p>}

        {columns.length > 0 ? (
          <>
            <p className="spn-card-subtitle">
              {fileName} - {rows.length} row(s).
            </p>
            <table className="spn-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c}>{String(row[c] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="spn-home-empty">(no data yet - use "From Excel" above)</p>
        )}
      </div>
    </div>
  )
}
