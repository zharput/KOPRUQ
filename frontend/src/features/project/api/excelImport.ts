import type { BridgeRow, BridgeType, PierShape } from '../model/types'

/**
 * "From Excel" (2026-09-11) parsing logic - reads the sheet rows SheetJS
 * (`xlsx`) already turned into plain objects and maps them onto
 * `BridgeRow`. Only the 7 spreadsheet columns (No/KM/Crossing Type/
 * Estimated Length/Road Width/Terrain/Status) are matched by header name
 * (case-insensitive); Bridge Type/Span/Girder/Pier Shape aren't in that
 * spreadsheet, so imported rows get documented defaults (Precast Girder,
 * 30-35-40 m, 160-190 cm, Rectangular) meant to be corrected per-row
 * afterward via additional details, not invented per-bridge facts.
 *
 * <p>The actual file read (`XLSX.read`/`sheet_to_json`) stays in
 * `ProjectPanel.tsx`, which owns the upload UI and error/loading state -
 * this module is the pure "spreadsheet rows in, BridgeRow[] out" part.
 */

// Column header candidates matched case-insensitively against the imported sheet.
const COLUMN_ALIASES: Record<keyof Pick<BridgeRow, 'no' | 'km' | 'crossingType' | 'estimatedLengthM' | 'roadWidthM' | 'terrain' | 'status'>, string[]> = {
  no: ['no', 'no.', 'bridge', 'name'],
  km: ['km', 'chainage'],
  crossingType: ['crossing type', 'crossingtype'],
  estimatedLengthM: ['estimated length', 'length', 'estimatedlengthm'],
  roadWidthM: ['road width', 'road width ', 'width', 'roadwidthm'],
  terrain: ['terrain'],
  status: ['status'],
}

function cellValue(row: Record<string, unknown>, aliases: string[]): string {
  const key = Object.keys(row).find((k) => aliases.includes(k.trim().toLowerCase()))
  return key ? String(row[key] ?? '').trim() : ''
}

export function parseImportedBridges(sheetRows: Record<string, unknown>[]): BridgeRow[] {
  return sheetRows
    .map((row): BridgeRow | null => {
      const no = cellValue(row, COLUMN_ALIASES.no)
      if (!no) return null
      const lengthText = cellValue(row, COLUMN_ALIASES.estimatedLengthM)
      const widthText = cellValue(row, COLUMN_ALIASES.roadWidthM)
      return {
        no,
        km: cellValue(row, COLUMN_ALIASES.km) || '—',
        crossingType: cellValue(row, COLUMN_ALIASES.crossingType) || '—',
        estimatedLengthM: parseFloat(lengthText) || 0,
        roadWidthM: parseFloat(widthText) || 0,
        terrain: cellValue(row, COLUMN_ALIASES.terrain) || '—',
        status: cellValue(row, COLUMN_ALIASES.status) || '—',
        // Not in the imported spreadsheet - documented defaults, correct per-row afterward.
        bridgeType: 'Precast Girder' as BridgeType,
        spansM: [30, 35, 40],
        girderDepthCm: [160, 190],
        girderNote: null,
        pierShape: 'Rectangular' as PierShape,
      }
    })
    .filter((row): row is BridgeRow => row !== null)
}
