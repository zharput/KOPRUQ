import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Pencil, Trash2 } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import { BRIDGE_TYPES, PIER_SHAPES, type BridgeRow, type BridgeType, type PierShape } from '../model/types'
import { parseImportedBridges } from '../api/excelImport'

/**
 * Project Information (2026-09-10 mockup, real corridor data - a 12-bridge
 * inventory spreadsheet the engineer shared): three project-wide settings
 * dropdowns (Design Code/Units/Design Criteria - retired from their own
 * sidebar leaves, folded in here), a Bridge Information table (one row
 * per bridge), and a per-bridge "additional details" card that opens when
 * a row is clicked. Concrete is deliberately NOT in additional details
 * (moved to the Materials screen instead, per the engineer's own
 * instruction) - additional details covers bridge type, span range,
 * girder depth range, and pier shape only.
 *
 * <p>Spans/girder depth are shown as **range sliders** (min/max), not
 * fixed values - the engineer's own framing ("aralık ve alternatif
 * değerler verilecek, o yüzden değerleri slider yap"): the spreadsheet's
 * "30-35-40"-style entries are alternative standard values within a
 * range, not a single number. The slider's min/max default to that
 * range; the original discrete alternatives are kept visible as a
 * caption underneath so no data is silently lost by collapsing to just
 * two numbers. **Presentation/local state only** - not wired into any
 * backend generation or analysis yet (same discipline as
 * LayoutDesignSpacePanel).
 *
 * <p>Superseded VIA-35/VIA-24 (the previous, smaller example table) -
 * this real 12-bridge dataset replaces it. VIA-35's own detailed facts
 * remain real and documented elsewhere (docs/roadmap.md) even though
 * they're not repeated in this table (VIA-35 isn't one of the 12 rows
 * the engineer gave here).
 *
 * <p>"From Excel" (2026-09-11) is a real import, not a placeholder -
 * uses SheetJS (`xlsx`, installed from the official cdn.sheetjs.com
 * tarball, not the vulnerable npm-registry release - see
 * docs/architecture.md) to read the first sheet of an uploaded
 * .xlsx/.xls file and replace the Bridge Information table. The pure
 * "sheet rows -> BridgeRow[]" mapping lives in `../api/excelImport.ts`
 * (architecture migration, 2026-09-12) - this component only owns the
 * upload button/file input and the read itself.
 *
 * <p>Row Edit/Delete + an "Add" form (2026-09-13, engineer's own
 * instruction - "köprü satırı silebileyim, satırın sonuna edit ve silme
 * butonu koy, en alta add butonu koy"): Edit/Delete only touch the
 * table's own 7 base columns (No/KM/Crossing Type/Estimated Length/Road
 * Width/Terrain/Status) - the per-bridge "additional details" (bridge
 * type/span/girder/pier) stay reachable by clicking the row, unchanged.
 * Add uses the same inline form as Edit (just blank), and fills the
 * fields the form doesn't ask for with the same documented defaults
 * already used for Excel-imported rows lacking them (`../api/
 * excelImport.ts`) - Precast Girder, 30-35-40 m spans, 160-190 cm
 * girder depth, Rectangular piers - not a new invented default.
 * Adding/deleting a row is just a `bridges` array length change, so
 * everything already derived from it (Project Dashboard's Route
 * Length/Number of Bridges) updates itself automatically - no extra
 * wiring needed, that was the whole point of lifting `bridges` to
 * `App.tsx` in the first place.
 *
 * <p>`bridges`/`designCode` are lifted to `App.tsx` (not local state
 * anymore) so `ProjectDashboardPanel` can show real, computed numbers
 * (bridge count, route length) from the same data - same pattern
 * already used for `GenerationSummary`/`layoutSeed`.
 */
interface BridgeBaseFields {
  no: string
  km: string
  crossingType: string
  estimatedLengthM: number
  roadWidthM: number
  terrain: string
  status: string
}

const BLANK_BASE_FIELDS: BridgeBaseFields = {
  no: '',
  km: '',
  crossingType: '',
  estimatedLengthM: 0,
  roadWidthM: 0,
  terrain: '',
  status: '',
}

export default function ProjectPanel({
  bridges,
  setBridges,
  designCode,
  setDesignCode,
}: {
  bridges: BridgeRow[]
  setBridges: Dispatch<SetStateAction<BridgeRow[]>>
  designCode: string
  setDesignCode: Dispatch<SetStateAction<string>>
}) {
  const [units, setUnits] = useState('kN-m')
  const [designCriteria, setDesignCriteria] = useState('None')
  const [expandedNo, setExpandedNo] = useState<string | null>(null)
  const [editingNo, setEditingNo] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function updateBridge(no: string, patch: Partial<BridgeRow>) {
    setBridges((prev) => prev.map((b) => (b.no === no ? { ...b, ...patch } : b)))
  }

  function saveEditedBridge(originalNo: string, fields: BridgeBaseFields) {
    setBridges((prev) => prev.map((b) => (b.no === originalNo ? { ...b, ...fields } : b)))
    setEditingNo(null)
  }

  function deleteBridge(no: string) {
    if (!window.confirm(`Remove bridge "${no}" from the Bridge Information table?`)) return
    setBridges((prev) => prev.filter((b) => b.no !== no))
    if (expandedNo === no) setExpandedNo(null)
    if (editingNo === no) setEditingNo(null)
  }

  function addBridge(fields: BridgeBaseFields) {
    setBridges((prev) => [
      ...prev,
      {
        ...fields,
        bridgeType: 'Precast Girder',
        spansM: [30, 35, 40],
        girderDepthCm: [160, 190],
        girderNote: null,
        pierShape: 'Rectangular',
      },
    ])
    setAddingNew(false)
  }

  async function handleExcelFile(file: File) {
    setImportError(null)
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' })
      const imported = parseImportedBridges(rows)
      if (imported.length === 0) {
        setImportError('No bridge rows found - check the sheet has a "No" column with bridge names.')
        return
      }
      setBridges(imported)
      setExpandedNo(null)
    } catch (e) {
      setImportError(e instanceof Error ? `Could not read that file: ${e.message}` : 'Could not read that file.')
    }
  }

  const expanded = bridges.find((b) => b.no === expandedNo) ?? null
  const editing = bridges.find((b) => b.no === editingNo) ?? null

  return (
    <div className="spn-workflow">
      <div className="spn-card">
        <h2 className="spn-card-title">Project settings</h2>
        <div className="spn-field-grid">
          <label className="spn-field">
            <span>Design Code</span>
            <select className="spn-input" value={designCode} onChange={(e) => setDesignCode(e.target.value)}>
              <option>Eurocode</option>
            </select>
          </label>
          <label className="spn-field">
            <span>Units</span>
            <select className="spn-input" value={units} onChange={(e) => setUnits(e.target.value)}>
              <option>kN-m</option>
              <option>ton-m</option>
            </select>
          </label>
          <label className="spn-field">
            <span>Design Criteria</span>
            <select className="spn-input" value={designCriteria} onChange={(e) => setDesignCriteria(e.target.value)}>
              <option>None</option>
            </select>
          </label>
        </div>
      </div>

      <div className="spn-card">
        <div className="spn-card-header-row">
          <h2 className="spn-card-title">Bridge Information</h2>
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
        <p className="spn-card-subtitle">Click a bridge to view/edit its additional details below.</p>
        {importError && <p className="spn-error">{importError}</p>}
        <table className="spn-table">
          <thead>
            <tr>
              {['No', 'KM', 'Crossing Type', 'Estimated Length', 'Road Width', 'Terrain', 'Status', ''].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bridges.map((bridge) => (
              <tr
                key={bridge.no}
                onClick={() => setExpandedNo(expandedNo === bridge.no ? null : bridge.no)}
                className={expandedNo === bridge.no ? 'spn-row-selected' : undefined}
              >
                <td>{bridge.no}</td>
                <td>{bridge.km}</td>
                <td>{bridge.crossingType}</td>
                <td>{bridge.estimatedLengthM.toFixed(2)}</td>
                <td>{bridge.roadWidthM.toFixed(2)}</td>
                <td>{bridge.terrain}</td>
                <td>{bridge.status}</td>
                <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    className="spn-icon-button"
                    aria-label={`Edit ${bridge.no}`}
                    title="Edit"
                    onClick={() => {
                      setAddingNew(false)
                      setEditingNo(editingNo === bridge.no ? null : bridge.no)
                    }}
                  >
                    <Pencil size={14} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    className="spn-icon-button"
                    aria-label={`Delete ${bridge.no}`}
                    title="Delete"
                    style={{ marginLeft: 6 }}
                    onClick={() => deleteBridge(bridge.no)}
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          type="button"
          className="spn-button-secondary"
          style={{ marginTop: 12 }}
          onClick={() => {
            setEditingNo(null)
            setAddingNew(!addingNew)
          }}
        >
          + Add bridge
        </button>

        {addingNew && (
          <BridgeBaseFieldsForm
            title="Add bridge"
            initial={BLANK_BASE_FIELDS}
            onSave={addBridge}
            onCancel={() => setAddingNew(false)}
          />
        )}

        {editing && (
          <BridgeBaseFieldsForm
            title={`Edit ${editing.no}`}
            initial={editing}
            onSave={(fields) => saveEditedBridge(editing.no, fields)}
            onCancel={() => setEditingNo(null)}
          />
        )}
      </div>

      {expanded && (
        <div className="spn-card">
          <h2 className="spn-card-title">{expanded.no} - additional details</h2>

          <label className="spn-field" style={{ maxWidth: 280 }}>
            <span>Bridge Type</span>
            <select
              className="spn-input"
              value={expanded.bridgeType}
              onChange={(e) => updateBridge(expanded.no, { bridgeType: e.target.value as BridgeType })}
            >
              {BRIDGE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>

          <RangeSliderField
            label="Span length (m)"
            given={expanded.spansM}
            boundMin={10}
            boundMax={150}
            step={5}
            onChange={(spansM) => updateBridge(expanded.no, { spansM })}
          />

          {expanded.girderDepthCm ? (
            <RangeSliderField
              label="Girder depth (cm)"
              given={expanded.girderDepthCm}
              boundMin={50}
              boundMax={500}
              step={10}
              onChange={(girderDepthCm) => updateBridge(expanded.no, { girderDepthCm })}
            />
          ) : (
            <div className="spn-field" style={{ maxWidth: 280 }}>
              <span>Girder</span>
              <p className="spn-card-subtitle" style={{ marginTop: 4 }}>{expanded.girderNote}</p>
            </div>
          )}

          <label className="spn-field" style={{ maxWidth: 280 }}>
            <span>Pier Shape</span>
            <select
              className="spn-input"
              value={expanded.pierShape}
              onChange={(e) => updateBridge(expanded.no, { pierShape: e.target.value as PierShape })}
            >
              {PIER_SHAPES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <p className="spn-card-subtitle">
            Pier cross-section dimensions (B, H, wall/flange thickness, etc.) are defined per shape in Pier Families - not entered here.
          </p>
        </div>
      )}
    </div>
  )
}

/** Inline form for the Bridge Information table's own 7 base columns - shared by "Add bridge" and each row's "Edit". */
function BridgeBaseFieldsForm({
  title,
  initial,
  onSave,
  onCancel,
}: {
  title: string
  initial: BridgeBaseFields
  onSave: (fields: BridgeBaseFields) => void
  onCancel: () => void
}) {
  const [fields, setFields] = useState<BridgeBaseFields>(initial)

  function update<K extends keyof BridgeBaseFields>(key: K, value: string) {
    setFields((prev) => ({
      ...prev,
      [key]: key === 'estimatedLengthM' || key === 'roadWidthM' ? Number(value) : value,
    }))
  }

  const canSave = fields.no.trim().length > 0

  return (
    <div className="spn-card" style={{ marginTop: 12, background: 'var(--surface-2)' }}>
      <h3 className="spn-card-title">{title}</h3>
      <div className="spn-field-grid">
        <label className="spn-field">
          <span>No</span>
          <input className="spn-input" value={fields.no} onChange={(e) => update('no', e.target.value)} placeholder="e.g. VIA-13" />
        </label>
        <label className="spn-field">
          <span>KM</span>
          <input className="spn-input" value={fields.km} onChange={(e) => update('km', e.target.value)} placeholder="e.g. 25+000.000" />
        </label>
        <label className="spn-field">
          <span>Crossing Type</span>
          <input className="spn-input" value={fields.crossingType} onChange={(e) => update('crossingType', e.target.value)} placeholder="e.g. Valley" />
        </label>
        <label className="spn-field">
          <span>Estimated Length (m)</span>
          <input type="number" className="spn-input" value={fields.estimatedLengthM} onChange={(e) => update('estimatedLengthM', e.target.value)} />
        </label>
        <label className="spn-field">
          <span>Road Width (m)</span>
          <input type="number" className="spn-input" value={fields.roadWidthM} onChange={(e) => update('roadWidthM', e.target.value)} />
        </label>
        <label className="spn-field">
          <span>Terrain</span>
          <input className="spn-input" value={fields.terrain} onChange={(e) => update('terrain', e.target.value)} />
        </label>
        <label className="spn-field">
          <span>Status</span>
          <input className="spn-input" value={fields.status} onChange={(e) => update('status', e.target.value)} />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" className="spn-button-primary" disabled={!canSave} onClick={() => onSave(fields)}>
          Save
        </button>
        <button type="button" className="spn-button-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

/** Two single-handle sliders (min/max) standing in for a range control - see this file's own comment for why. */
function RangeSliderField({
  label,
  given,
  boundMin,
  boundMax,
  step,
  onChange,
}: {
  label: string
  given: number[]
  boundMin: number
  boundMax: number
  step: number
  onChange: (values: number[]) => void
}) {
  const min = Math.min(...given)
  const max = Math.max(...given)

  return (
    <div className="spn-field" style={{ maxWidth: 420 }}>
      <span>{label}</span>
      <div className="spn-slider-row">
        <span className="spn-slider-value">min {min}</span>
        <input
          type="range"
          min={boundMin}
          max={boundMax}
          step={step}
          value={min}
          onChange={(e) => onChange([Number(e.target.value), max])}
        />
      </div>
      <div className="spn-slider-row">
        <span className="spn-slider-value">max {max}</span>
        <input
          type="range"
          min={boundMin}
          max={boundMax}
          step={step}
          value={max}
          onChange={(e) => onChange([min, Number(e.target.value)])}
        />
      </div>
      <p className="spn-card-subtitle" style={{ marginTop: 2 }}>Given alternatives: {given.join(', ')}</p>
    </div>
  )
}
