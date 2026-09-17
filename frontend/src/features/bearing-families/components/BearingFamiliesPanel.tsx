import { useEffect, useMemo, useState } from 'react'
import type { Dimension } from '../../../shared/ui/ParamSweepCard'
import { GenerationTable } from '../../../shared/ui/DesignSystemUi'
import { generateBearingVariants, statusOf } from '../model/service'
import type { BearingFamily, BearingRule } from '../model/types'
import BearingSchematic from './BearingSchematic'

const KEY = 'spanova.project-design-system.bearing-families'
type Mode = 'NEW' | 'EDIT'
const blank = (): BearingFamily => ({ id: '', name: '', bearingType: 'ELASTOMERIC', enabled: true, length: { min: null, max: null, delta: null }, width: { min: null, max: null, delta: null }, height: { min: null, max: null, delta: null }, source: 'PROJECT_DESIGN_SYSTEM' })
function read(): BearingFamily[] { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as BearingFamily[] } catch { return [] } }
function makeId() { return globalThis.crypto?.randomUUID?.() ?? `BEARING-${Date.now()}-${Math.random().toString(36).slice(2)}` }
const clone = (family: BearingFamily): BearingFamily => ({ ...family, length: { ...family.length }, width: { ...family.width }, height: { ...family.height } })

export default function BearingFamiliesPanel() {
  const [families, setFamilies] = useState<BearingFamily[]>(read)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('NEW')
  const [draft, setDraft] = useState<BearingFamily>(blank)
  const [error, setError] = useState('')
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(families)); window.dispatchEvent(new Event('spanova:bearing-catalog-changed')) }, [families])
  const variants = useMemo(() => generateBearingVariants(draft), [draft])
  const dimensions: Dimension[] = [dim('length', 'Bearing Length L (mm)', draft.length), dim('width', 'Bearing Width B (mm)', draft.width), dim('height', 'Bearing Height H (mm)', draft.height)]
  const update = (patch: Partial<BearingFamily>) => setDraft((current) => ({ ...current, ...patch }))
  const updateRule = (key: 'length' | 'width' | 'height', patch: Partial<BearingRule>) => setDraft((current) => ({ ...current, [key]: { ...current[key], ...patch } }))
  const startNew = () => { setMode('NEW'); setSelectedId(null); setDraft(blank()); setError('') }
  const edit = (family: BearingFamily) => { setMode('EDIT'); setSelectedId(family.id); setDraft(clone(family)); setError('') }
  const save = () => {
    const name = draft.name.trim()
    if (families.some((item) => item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase() && (mode === 'NEW' || item.id !== selectedId))) { setError('Bearing family name already exists.'); return }
    const saved = { ...clone(draft), name, id: mode === 'NEW' ? makeId() : selectedId! }
    setFamilies((items) => mode === 'NEW' ? [...items, saved] : items.map((item) => item.id === selectedId ? saved : item))
    setSelectedId(saved.id); setDraft(clone(saved)); setMode('EDIT'); setError('')
  }
  const remove = (id: string) => { const remaining = families.filter((item) => item.id !== id); setFamilies(remaining); if (selectedId === id) { if (remaining[0]) edit(remaining[0]); else startNew() } }
  return <div className="spn-workflow"><div className="spn-card">
    <div className="spn-shape-card-header"><div><h2 className="spn-card-title">BEARING</h2><p className="spn-card-subtitle">Project Design System / canonical family definition</p></div><button className="spn-button-secondary" onClick={startNew}>+ New Bearing</button></div>
    <div className="spn-field-grid" style={{ gridTemplateColumns: '1fr 1fr' }}><label className="spn-field">Family Name<input className="spn-input" value={draft.name} onChange={(event) => update({ name: event.target.value })} /></label><label className="spn-field">Bearing Type<select className="spn-input" value={draft.bearingType} onChange={() => update({ bearingType: 'ELASTOMERIC' })}><option value="ELASTOMERIC">Elastomeric</option></select></label></div>
    <label className="spn-checklist-item"><input type="checkbox" checked={draft.enabled} onChange={(event) => update({ enabled: event.target.checked })} /> Use in SPANOVA analyses</label>
    <BearingSchematic /><h3 className="spn-card-title spn-cap-section">SECTION GENERATION</h3><GenerationTable dimensions={dimensions} onUpdateDimension={(key, patch) => updateRule(key as 'length' | 'width' | 'height', patch)} notConfiguredLabel="NOT CONFIGURED" />
    <p>Generated Bearing Variants: <strong>{variants.length}</strong></p><p>Status: <strong>{statusOf(draft)}</strong></p>{error && <p role="alert" className="spn-validation-error">{error}</p>}
    <button className="spn-button-primary" disabled={statusOf(draft) !== 'VALID'} onClick={save}>{mode === 'NEW' ? 'Add Bearing' : 'Update Bearing'}</button>
  </div><div className="spn-card"><h3 className="spn-card-title">BEARING FAMILY CATALOG</h3><table className="spn-table"><thead><tr><th>Family</th><th>Type</th><th>Variants</th><th>L Range</th><th>B Range</th><th>H Range</th><th>Enabled</th><th>Status</th><th>Actions</th></tr></thead><tbody>{families.map((item) => <tr key={item.id} onClick={() => edit(item)} className={item.id === selectedId ? 'spn-row-selected' : ''} style={{ cursor: 'pointer' }}><td>{item.name}</td><td>{item.bearingType}</td><td>{generateBearingVariants(item).length}</td><td>{range(item.length)}</td><td>{range(item.width)}</td><td>{range(item.height)}</td><td>{item.enabled ? 'Yes' : 'No'}</td><td>{statusOf(item)}</td><td><button className="spn-button-secondary" onClick={(event) => { event.stopPropagation(); edit(item) }}>Edit</button> <button className="spn-button-secondary" onClick={(event) => { event.stopPropagation(); remove(item.id) }}>Delete</button></td></tr>)}</tbody></table></div></div>
}

function dim(key: string, label: string, rule: BearingRule): Dimension { return { key, label, min: rule.min ?? 0, max: rule.max ?? 0, delta: rule.delta ?? 0 } }
function range(rule: BearingRule) { return rule.min == null || rule.max == null ? '—' : `${rule.min}–${rule.max} mm` }
