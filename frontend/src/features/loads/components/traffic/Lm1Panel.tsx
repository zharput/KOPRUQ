import type { Dispatch, SetStateAction } from 'react'
import type { LaneFactor, Lm1Parameters } from '../../api/trafficLoadsService'

export default function Lm1Panel({ lm1, onChange, resolved }: { lm1: Lm1Parameters; onChange: Dispatch<SetStateAction<Lm1Parameters | null>>; resolved: Lm1Parameters | undefined }) {
  const edit = (section: 'tandemSystem' | 'udl' | 'remainingAreaUdl', index: number, value: number) => onChange(prev => prev ? section === 'remainingAreaUdl' ? { ...prev, remainingAreaUdl: { ...prev.remainingAreaUdl, adjustmentFactor: { ...prev.remainingAreaUdl.adjustmentFactor, value, provenance: 'PROJECT_OVERRIDE' as const } } } : { ...prev, [section]: prev[section].map((row, i) => i === index ? { ...row, adjustmentFactor: { ...row.adjustmentFactor, value, provenance: 'PROJECT_OVERRIDE' as const } } : row) } : prev)
  const rows = (items: LaneFactor[], resolvedItems: LaneFactor[] | undefined, unit: string, section: 'tandemSystem' | 'udl') => items.map((row, i) => ({ row, resolved: resolvedItems?.[i], unit, section, i }))
  const cell = (entry: { row: LaneFactor; resolved?: LaneFactor; unit: string; section: 'tandemSystem' | 'udl' | 'remainingAreaUdl'; i: number }) => {
    const effective = entry.resolved?.characteristicValue.value == null || entry.resolved.adjustmentFactor.value == null
      ? null
      : entry.resolved.characteristicValue.value * entry.resolved.adjustmentFactor.value
    return <tr key={entry.row.label}><td>{entry.row.label}</td><td>{entry.row.characteristicValue.value?.toFixed(entry.unit === 'kN' ? 0 : 1)}</td><td><input className="spn-input spn-input-number" value={entry.row.adjustmentFactor.value ?? ''} onChange={e => edit(entry.section, entry.i, Number(e.target.value))} /></td><td>{effective?.toFixed(entry.unit === 'kN' ? 0 : 1) ?? '—'}</td><td>{entry.unit}</td></tr>
  }
  return <div className="spn-card"><h2 className="spn-card-title">LM1 - Tandem System & UDL</h2><p className="spn-card-subtitle">EN 1991-2, LM1, 4.3.2 · EN Base</p>
    <h3 style={{ margin: '18px 0 8px', fontSize: 13.5 }}>Tandem System</h3><table className="spn-table"><thead><tr><th>Parameter</th><th>EN Base</th><th>α</th><th>Effective</th><th>Unit</th></tr></thead><tbody>{rows(lm1.tandemSystem, resolved?.tandemSystem, 'kN', 'tandemSystem').map(cell)}</tbody></table>
    <h3 style={{ margin: '18px 0 8px', fontSize: 13.5 }}>UDL</h3><table className="spn-table"><thead><tr><th>Parameter</th><th>EN Base</th><th>α</th><th>Effective</th><th>Unit</th></tr></thead><tbody>{rows(lm1.udl, resolved?.udl, 'kN/m²', 'udl').map(cell)}</tbody></table>
    <h3 style={{ margin: '18px 0 8px', fontSize: 13.5 }}>Remaining Area</h3><table className="spn-table"><thead><tr><th>Parameter</th><th>EN Base</th><th>α</th><th>Effective</th><th>Unit</th></tr></thead><tbody>{cell({ row: lm1.remainingAreaUdl, resolved: resolved?.remainingAreaUdl, unit: 'kN/m²', section: 'remainingAreaUdl', i: 0 })}</tbody></table>
    <p className="spn-card-subtitle">Source: EN 1991-2 · Reference: EN 1991-2, LM1, 4.3.2</p>
  </div>
}
