import { useEffect, useMemo, useState } from 'react'
import type { Dimension } from '../../../shared/ui/ParamSweepCard'
import { GenerationTable } from '../../../shared/ui/DesignSystemUi'
import { generateFoundationVariants, labelNumber, statusOf, values } from '../model/service'
import type { FoundationFamily, FoundationRule, FoundationType, PiledFoundationGeneration, ShallowFoundationGeneration } from '../model/types'
import FoundationSchematic from './FoundationSchematic'
import { getFamilyReferences, publishFamilySelection } from '../../family-registry/model/registry'
import { useFamilyCatalog } from '../../family-registry/hooks/useFamilyCatalog'

// The shared Min/Max/Delta editor displays missing values as zero. Keep the
// draft in sync with that displayed fixed-value Delta so changing 0 -> 0 does
// not leave Delta null when the browser emits no change event.
const rule = (): FoundationRule => ({ min: null, max: null, delta: 0 })
const blank = (foundationType: FoundationType = 'SHALLOW'): FoundationFamily => ({ id: '', name: '', foundationType, enabled: true, shallowGeneration: foundationType === 'SHALLOW' ? { lengthX: rule(), lengthY: rule(), height: rule() } : null, piledGeneration: foundationType === 'PILED' ? { pileDiameter: rule(), pileCountX: rule(), pileSpacingX: rule(), pileCountY: rule(), pileSpacingY: rule(), height: rule() } : null, source: 'PROJECT_DESIGN_SYSTEM' })
function newId() { return globalThis.crypto?.randomUUID?.() ?? `FOUNDATION-${Date.now()}-${Math.random().toString(36).slice(2)}` }
const clone = (family: FoundationFamily): FoundationFamily => ({ ...family, shallowGeneration: family.shallowGeneration ? structuredClone(family.shallowGeneration) : null, piledGeneration: family.piledGeneration ? structuredClone(family.piledGeneration) : null })

export default function FoundationFamiliesPanel({ initialFoundationType = 'SHALLOW' }: { initialFoundationType?: FoundationType }) {
  const [families, setFamilies] = useFamilyCatalog<FoundationFamily>('FOUNDATION')
  const [selectedId, setSelectedId] = useState<string | null>(() => families[0]?.id ?? null)
  const [emptyFamily, setEmptyFamily] = useState<FoundationFamily>(() => blank(initialFoundationType))
  const [error, setError] = useState('')
  const family = families.find((item) => item.id === selectedId) ?? emptyFamily
  useEffect(() => { publishFamilySelection('FOUNDATION', selectedId) }, [selectedId])
  const variants = useMemo(() => generateFoundationVariants(family), [family])
  const duplicateName = families.some((item) => item.name.trim().toLocaleLowerCase() === family.name.trim().toLocaleLowerCase() && item.id !== selectedId)
  const familyStatus = duplicateName && family.name.trim() ? 'INVALID' : statusOf(family)
  const dimensions: Dimension[] = family.foundationType === 'SHALLOW' && family.shallowGeneration
    ? [dimension('lengthX', 'Foundation Length Lx (m)', family.shallowGeneration.lengthX), dimension('lengthY', 'Foundation Width Ly (m)', family.shallowGeneration.lengthY), dimension('height', 'Foundation Height H (m)', family.shallowGeneration.height)]
    : family.piledGeneration ? piledDimensions(family.piledGeneration) : []

  const update = (patch: Partial<FoundationFamily>) => {
    if (!selectedId || !families.some((item) => item.id === selectedId)) { setEmptyFamily((current) => ({ ...current, ...patch })); return }
    setFamilies((items) => items.map((item) => item.id === selectedId ? { ...item, ...patch } : item))
  }
  const updateRule = (key: string, patch: Partial<FoundationRule>) => {
    const current = family
    const updated = current.foundationType === 'SHALLOW' && current.shallowGeneration
      ? { ...current, shallowGeneration: { ...current.shallowGeneration, [key]: { ...current.shallowGeneration[key as keyof ShallowFoundationGeneration], ...patch } } }
      : current.piledGeneration ? { ...current, piledGeneration: { ...current.piledGeneration, [key]: { ...current.piledGeneration[key as keyof PiledFoundationGeneration], ...patch } } } : current
    if (selectedId && families.some((item) => item.id === selectedId)) setFamilies((items) => items.map((item) => item.id === selectedId ? updated : item))
    else setEmptyFamily(updated)
  }
  const commit = (next: FoundationFamily[]) => { setFamilies(next); setError(''); return true }
  const addFamily = () => {
    if (familyStatus !== 'VALID') return
    let name = family.name.trim()
    if (families.length) {
      const base = `${name}-COPY`; name = base
      let suffix = 2
      while (families.some((item) => item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) name = `${base}-${suffix++}`
    }
    const added = { ...clone(family), id: newId(), name }
    if (commit([...families, added])) { setSelectedId(added.id); setEmptyFamily(clone(added)) }
  }
  const remove = (id: string) => {
    const references = getFamilyReferences('FOUNDATION', id)
    if (references.length) { setError(`Cannot delete ${id}; used by ${references.map((item) => `${item.bridgeId} / ${item.location}`).join(', ')}.`); return }
    const next = families.filter((item) => item.id !== id); if (!commit(next)) return
    if (selectedId === id) { const nextFamily = next[0]; setSelectedId(nextFamily?.id ?? null); setEmptyFamily(nextFamily ? clone(nextFamily) : blank(initialFoundationType)) }
  }
  const changeType = (foundationType: FoundationType) => update({ ...blank(foundationType), id: family.id, name: family.name, enabled: family.enabled })

  return <div className="spn-workflow"><div className="spn-card">
    <div className="spn-shape-card-header"><div><h2 className="spn-card-title">FOUNDATION</h2><p className="spn-card-subtitle">Project Design System / canonical family definition</p></div><label className="spn-checklist-item"><input type="checkbox" checked={family.enabled} onChange={(event) => update({ enabled: event.target.checked })} /> Use in KOPRUQ analyses</label></div>
    <div className="spn-field-grid" style={{ gridTemplateColumns: '1fr 1fr' }}><label className="spn-field">Family Name<input className="spn-input" value={family.name} onChange={(event) => update({ name: event.target.value })} /></label><label className="spn-field">Foundation Type<select className="spn-input" value={family.foundationType} onChange={(event) => changeType(event.target.value as FoundationType)}><option value="SHALLOW">Shallow</option><option value="PILED">Piled</option></select></label></div>
    <FoundationSchematic family={family} variants={variants} />
    <h3 className="spn-card-title spn-cap-section">{family.foundationType === 'PILED' ? 'PILE ARRANGEMENT / SECTION GENERATION' : 'SECTION GENERATION'}</h3>
    <GenerationTable dimensions={dimensions} onUpdateDimension={(key, patch) => updateRule(key, patch)} notConfiguredLabel="NOT CONFIGURED" />
    {family.foundationType === 'PILED' && <DerivedDimensions variants={variants} />}
    <p>Generated Foundation Variants: <strong>{variants.length}</strong></p><p>Status: <strong>{familyStatus}</strong></p>{error && <p role="alert" className="spn-validation-error">{error}</p>}
    <button className="spn-button-primary" disabled={familyStatus !== 'VALID'} onClick={addFamily}>Add Foundation</button>
  </div>
  <div className="spn-card"><h3 className="spn-card-title">FOUNDATION FAMILY CATALOG</h3><table className="spn-table"><thead><tr><th>Family</th><th>Type</th><th>Variants</th><th>Geometry / Range</th><th>Enabled</th><th>Status</th><th>Delete</th></tr></thead><tbody>{families.map((item) => <tr key={item.id} onClick={() => { setSelectedId(item.id); publishFamilySelection('FOUNDATION', item.id); setError('') }} className={item.id === selectedId ? 'spn-row-selected' : ''} style={{ cursor: 'pointer' }}><td>{item.name}</td><td>{item.foundationType}</td><td>{generateFoundationVariants(item).length}</td><td>{geometrySummary(item)}</td><td>{item.enabled ? 'Yes' : 'No'}</td><td>{statusOf(item)}</td><td><button className="spn-button-secondary" onClick={(event) => { event.stopPropagation(); remove(item.id) }}>Delete</button></td></tr>)}</tbody></table></div></div>
}

function dimension(key: string, label: string, rule: FoundationRule): Dimension { return { key, label, min: rule.min ?? 0, max: rule.max ?? 0, delta: rule.delta ?? 0 } }
function piledDimensions(generation: PiledFoundationGeneration): Dimension[] { return [dimension('pileDiameter', 'Pile Diameter D (m)', generation.pileDiameter), dimension('pileCountX', 'Pile Count nx', generation.pileCountX), dimension('pileSpacingX', 'Pile Spacing ax (m)', generation.pileSpacingX), dimension('pileCountY', 'Pile Count ny', generation.pileCountY), dimension('pileSpacingY', 'Pile Spacing ay (m)', generation.pileSpacingY), dimension('height', 'Foundation Height H (m)', generation.height)] }
function DerivedDimensions({ variants }: { variants: ReturnType<typeof generateFoundationVariants> }) { const xs = variants.map((item) => item.lengthX), ys = variants.map((item) => item.lengthY); return <div className="foundation-derived"><strong>DERIVED FOUNDATION DIMENSIONS</strong><span>Lx = {range(xs)} m</span><span>Ly = {range(ys)} m</span><small>Derived from pile arrangement</small></div> }
function range(items: number[]) { if (!items.length) return 'â€”'; const min = Math.min(...items), max = Math.max(...items); return min === max ? labelNumber(min) : `${labelNumber(min)}â€“${labelNumber(max)}` }
function geometrySummary(family: FoundationFamily) {
  if (family.foundationType === 'SHALLOW') { const g = family.shallowGeneration!; return `Lx ${range(values(g.lengthX))} / Ly ${range(values(g.lengthY))} / H ${range(values(g.height))} m` }
  const g = family.piledGeneration!; return `D ${range(values(g.pileDiameter))} / nx ${range(values(g.pileCountX))} / ax ${range(values(g.pileSpacingX))} / ny ${range(values(g.pileCountY))} / ay ${range(values(g.pileSpacingY))} / H ${range(values(g.height))} m`
}
