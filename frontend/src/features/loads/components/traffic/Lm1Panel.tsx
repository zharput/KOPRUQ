import { useState, type Dispatch, type SetStateAction } from 'react'
import type { LaneFactor, Lm1Parameters } from '../../api/trafficLoadsService'
import type { ProjectUnits } from '../../../graph/domain/quantities'
import { formatLoadValue, loadUnit, type LoadQuantity } from '../../model/loadUnits'

type Section = 'tandemSystem' | 'udl' | 'remainingAreaUdl'
const DECIMAL = /^\s*-?(?:\d+\.?\d*|\.\d+)\s*$/
/** Only a finite number is accepted; no range is applied (no engineering limit for alpha has been given). */
function parseFinite(text: string): number | null {
  if (!DECIMAL.test(text)) return null
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

/** Text buffer: typing never writes to the project; Enter/blur commits a finite number, an empty or invalid text is flagged and not committed. */
function AlphaInput({ value, label, onCommit }: { value: number | null; label: string; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  // An external value change (e.g. reset to the EN default) discards the local draft.
  const [seenValue, setSeenValue] = useState(value)
  if (seenValue !== value) { setSeenValue(value); setDraft(null) }
  const shown = draft ?? (value == null ? '' : String(value))
  const invalid = draft !== null && parseFinite(draft) === null
  const commit = () => {
    if (draft === null) return
    const parsed = parseFinite(draft)
    if (parsed === null) return
    setDraft(null)
    if (parsed !== value) onCommit(parsed)
  }
  return <input className={`spn-input spn-input-number${invalid ? ' is-invalid' : ''}`} inputMode="decimal" aria-label={label} aria-invalid={invalid} value={shown}
    onChange={e => setDraft(e.target.value)} onBlur={commit}
    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } else if (e.key === 'Escape') setDraft(null) }} />
}

export default function Lm1Panel({ lm1, onChange, resolved, defaults, projectUnits }: { lm1: Lm1Parameters; onChange: Dispatch<SetStateAction<Lm1Parameters | null>>; resolved: Lm1Parameters | undefined; defaults?: Lm1Parameters; projectUnits?: ProjectUnits }) {
  // Bumped per row on reset so the row's input remounts and drops its draft even when the numeric value does not change.
  const [resetCounts, setResetCounts] = useState<Record<string, number>>({})
  const patchAdjustment = (prev: Lm1Parameters, section: Section, index: number, change: (row: LaneFactor) => LaneFactor): Lm1Parameters =>
    section === 'remainingAreaUdl' ? { ...prev, remainingAreaUdl: change(prev.remainingAreaUdl) } : { ...prev, [section]: prev[section].map((row, i) => i === index ? change(row) : row) }
  const edit = (section: Section, index: number, value: number) => onChange(prev => prev ? patchAdjustment(prev, section, index, row => ({ ...row, adjustmentFactor: { ...row.adjustmentFactor, value, provenance: 'PROJECT_OVERRIDE' as const } })) : prev)
  const defaultRow = (section: Section, index: number): LaneFactor | undefined => section === 'remainingAreaUdl' ? defaults?.remainingAreaUdl : defaults?.[section][index]
  const reset = (section: Section, index: number) => { const original = defaultRow(section, index); if (original) setResetCounts(prev => ({ ...prev, [`${section}:${index}`]: (prev[`${section}:${index}`] ?? 0) + 1 })); if (original) onChange(prev => prev ? patchAdjustment(prev, section, index, row => ({ ...row, adjustmentFactor: { ...original.adjustmentFactor } })) : prev) }
  const rows = (items: LaneFactor[], resolvedItems: LaneFactor[] | undefined, quantity: LoadQuantity, section: 'tandemSystem' | 'udl') => items.map((row, i) => ({ row, resolved: resolvedItems?.[i], quantity, section, i }))
  const cell = (entry: { row: LaneFactor; resolved?: LaneFactor; quantity: LoadQuantity; section: Section; i: number }) => {
    const effective = entry.resolved?.characteristicValue.value == null || entry.resolved.adjustmentFactor.value == null
      ? null
      : entry.resolved.characteristicValue.value * entry.resolved.adjustmentFactor.value
    const canReset = entry.row.adjustmentFactor.provenance === 'PROJECT_OVERRIDE' && defaultRow(entry.section, entry.i) !== undefined
    return <tr key={entry.row.label}><td>{entry.row.label}</td><td>{entry.row.characteristicValue.value == null ? undefined : formatLoadValue(entry.row.characteristicValue.value, entry.quantity, projectUnits)}</td>
      <td><AlphaInput key={resetCounts[`${entry.section}:${entry.i}`] ?? 0} value={entry.row.adjustmentFactor.value} label={`${entry.row.label} α`} onCommit={value => edit(entry.section, entry.i, value)} />{' '}
        <button type="button" className="spn-button-secondary" aria-label={`Reset ${entry.row.label} α to EN default`} disabled={!canReset} onClick={() => reset(entry.section, entry.i)}>EN default</button></td>
      <td>{effective == null ? '—' : formatLoadValue(effective, entry.quantity, projectUnits)}</td><td>{loadUnit(entry.quantity, projectUnits).label}</td></tr>
  }
  return <div className="spn-card"><h2 className="spn-card-title">LM1 - Tandem System & UDL</h2><p className="spn-card-subtitle">EN 1991-2, LM1, 4.3.2 · EN Base</p>
    <h3 style={{ margin: '18px 0 8px', fontSize: 13.5 }}>Tandem System</h3><table className="spn-table"><thead><tr><th>Parameter</th><th>EN Base</th><th>α</th><th>Effective</th><th>Unit</th></tr></thead><tbody>{rows(lm1.tandemSystem, resolved?.tandemSystem, 'force', 'tandemSystem').map(cell)}</tbody></table>
    <h3 style={{ margin: '18px 0 8px', fontSize: 13.5 }}>UDL</h3><table className="spn-table"><thead><tr><th>Parameter</th><th>EN Base</th><th>α</th><th>Effective</th><th>Unit</th></tr></thead><tbody>{rows(lm1.udl, resolved?.udl, 'pressure', 'udl').map(cell)}</tbody></table>
    <h3 style={{ margin: '18px 0 8px', fontSize: 13.5 }}>Remaining Area</h3><table className="spn-table"><thead><tr><th>Parameter</th><th>EN Base</th><th>α</th><th>Effective</th><th>Unit</th></tr></thead><tbody>{cell({ row: lm1.remainingAreaUdl, resolved: resolved?.remainingAreaUdl, quantity: 'pressure', section: 'remainingAreaUdl', i: 0 })}</tbody></table>
    <p className="spn-card-subtitle">Source: EN 1991-2 · Reference: EN 1991-2, LM1, 4.3.2</p>
  </div>
}
