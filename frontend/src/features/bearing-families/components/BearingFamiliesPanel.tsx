import { useEffect, useMemo, useState } from 'react'
import type { Dimension } from '../../../shared/ui/ParamSweepCard'
import { GenerationTable } from '../../../shared/ui/DesignSystemUi'
import { generateBearingVariants, statusOf } from '../model/service'
import type { BearingFamily, BearingRule } from '../model/types'
import BearingSchematic from './BearingSchematic'
import { getFamilyReferences, publishFamilySelection } from '../../family-registry/model/registry'
import { useFamilyCatalog } from '../../family-registry/hooks/useFamilyCatalog'

const blank = (): BearingFamily => ({ id: '', name: '', bearingType: 'ELASTOMERIC', enabled: true, length: { min: null, max: null, delta: null }, width: { min: null, max: null, delta: null }, height: { min: null, max: null, delta: null }, source: 'PROJECT_DESIGN_SYSTEM' })
function makeId() { return globalThis.crypto?.randomUUID?.() ?? `BEARING-${Date.now()}-${Math.random().toString(36).slice(2)}` }
const clone = (family: BearingFamily): BearingFamily => ({ ...family, length: { ...family.length }, width: { ...family.width }, height: { ...family.height } })

export default function BearingFamiliesPanel() {
  const [families, setFamilies] = useFamilyCatalog<BearingFamily>('BEARING')
  const [selectedId, setSelectedId] = useState<string | null>(() => families[0]?.id ?? null)
  const [draft, setDraft] = useState<BearingFamily>(blank)
  const [error, setError] = useState('')
  const family = families.find((item) => item.id === selectedId) ?? draft
  useEffect(() => { publishFamilySelection('BEARING', selectedId) }, [selectedId])
  const variants = useMemo(() => generateBearingVariants(family), [family])
  const dimensions: Dimension[] = [dim('length', 'Bearing Length L (mm)', family.length), dim('width', 'Bearing Width B (mm)', family.width), dim('height', 'Bearing Height H (mm)', family.height)]

  const commitCatalog = (next: BearingFamily[]) => {
    setFamilies(next)
    setError('')
    return true
  }
  const update = (patch: Partial<BearingFamily>) => {
    const changed = { ...family, ...patch }
    const duplicate = families.some((item) => item.id !== family.id && item.name.trim().toLocaleLowerCase() === changed.name.trim().toLocaleLowerCase())
    if (changed.name.trim() && duplicate) { setError('Bearing family name already exists.'); return }
    if (!family.id) { setDraft(changed); setError(''); return }
    commitCatalog(families.map((item) => item.id === family.id ? changed : item))
  }
  const updateRule = (key: 'length' | 'width' | 'height', patch: Partial<BearingRule>) => update({ [key]: { ...family[key], ...patch } })
  const addFamily = () => {
    if (statusOf(family) !== 'VALID') return
    const isInitialFamily = !family.id
    const copyName = isInitialFamily ? family.name.trim() : uniqueCopyName(family.name, families)
    const added = { ...clone(family), id: makeId(), name: copyName }
    const next = [...families, added]
    if (!commitCatalog(next)) return
    setSelectedId(added.id)
    setDraft(blank())
  }
  const remove = (id: string) => {
    const references = getFamilyReferences('BEARING', id)
    if (references.length) { setError(`Cannot delete ${id}; used by ${references.map((item) => `${item.bridgeId} / ${item.location}`).join(', ')}.`); return }
    const next = families.filter((item) => item.id !== id)
    if (!commitCatalog(next)) return
    if (selectedId === id) setSelectedId(next[0]?.id ?? null)
  }

  return <div className="spn-workflow"><div className="spn-card">
    <div className="spn-shape-card-header"><div><h2 className="spn-card-title">BEARING</h2><p className="spn-card-subtitle">Project Design System / canonical family definition</p></div><label className="spn-checklist-item"><input type="checkbox" checked={family.enabled} onChange={(event) => update({ enabled: event.target.checked })} /> Use in SPANOVA analyses</label></div>
    <div className="spn-field-grid" style={{ gridTemplateColumns: '1fr 1fr' }}><label className="spn-field">Family Name<input className="spn-input" value={family.name} onChange={(event) => update({ name: event.target.value })} /></label><label className="spn-field">Bearing Type<select className="spn-input" value={family.bearingType} onChange={() => update({ bearingType: 'ELASTOMERIC' })}><option value="ELASTOMERIC">Elastomeric</option></select></label></div>
    <BearingSchematic /><h3 className="spn-card-title spn-cap-section">SECTION GENERATION</h3><GenerationTable dimensions={dimensions} onUpdateDimension={(key, patch) => updateRule(key as 'length' | 'width' | 'height', patch)} notConfiguredLabel="NOT CONFIGURED" />
    <p>Generated Bearing Variants: <strong>{variants.length}</strong></p><p>Status: <strong>{statusOf(family)}</strong></p>{error && <p role="alert" className="spn-validation-error">{error}</p>}
    <button className="spn-button-primary" disabled={statusOf(family) !== 'VALID'} onClick={addFamily}>Add Bearing</button>
  </div><div className="spn-card"><h3 className="spn-card-title">BEARING FAMILY CATALOG</h3><table className="spn-table"><thead><tr><th>Family</th><th>Type</th><th>Variants</th><th>L Range</th><th>B Range</th><th>H Range</th><th>Enabled</th><th>Status</th><th>Delete</th></tr></thead><tbody>{families.map((item) => <tr key={item.id} onClick={() => { setSelectedId(item.id); setError('') }} className={item.id === selectedId ? 'spn-row-selected' : ''} style={{ cursor: 'pointer' }}><td>{item.name}</td><td>{item.bearingType}</td><td>{generateBearingVariants(item).length}</td><td>{range(item.length)}</td><td>{range(item.width)}</td><td>{range(item.height)}</td><td>{item.enabled ? 'Yes' : 'No'}</td><td>{statusOf(item)}</td><td><button className="spn-button-secondary" onClick={(event) => { event.stopPropagation(); remove(item.id) }}>Delete</button></td></tr>)}</tbody></table></div></div>
}

function dim(key: string, label: string, rule: BearingRule): Dimension { return { key, label, min: rule.min ?? 0, max: rule.max ?? 0, delta: rule.delta ?? 0 } }
function range(rule: BearingRule) { return rule.min == null || rule.max == null ? '—' : `${rule.min}–${rule.max} mm` }
function uniqueCopyName(name: string, families: BearingFamily[]) {
  const base = `${name.trim()}-COPY`
  if (!families.some((family) => family.name.toLocaleLowerCase() === base.toLocaleLowerCase())) return base
  let suffix = 2
  while (families.some((family) => family.name.toLocaleLowerCase() === `${base}-${suffix}`.toLocaleLowerCase())) suffix++
  return `${base}-${suffix}`
}
