import { useEffect, useMemo, useState } from 'react'
import type { Dimension } from '../../../shared/ui/ParamSweepCard'
import { GenerationTable } from '../../../shared/ui/DesignSystemUi'
import { generatePierCapVariants, statusOf, structuralSystem } from '../model/service'
import type { PierCapFamily, PierCapType, PierCapConfiguration, Rule } from '../model/types'
import PierCapSchematic from './PierCapSchematic'
import { getFamilyReferences, publishFamilySelection } from '../../family-registry/model/registry'
import { useFamilyCatalog } from '../../family-registry/hooks/useFamilyCatalog'

function newId() { return globalThis.crypto?.randomUUID?.() ?? `PC-${Date.now()}-${Math.random().toString(36).slice(2)}` }

export default function PierCapFamiliesPanel() {
  const [families, setFamilies] = useFamilyCatalog<PierCapFamily>('PIER_CAP')
  const [selectedId, setSelectedId] = useState('')
  const family = families.find((item) => item.id === selectedId) ?? families[0]
  const variants = useMemo(() => family ? generatePierCapVariants(family) : [], [family])
  const [error, setError] = useState('')
  useEffect(() => { publishFamilySelection('PIER_CAP', family?.id ?? null) }, [family?.id])

  const update = (patch: Partial<PierCapFamily>) => { if (!family) return; setFamilies((items) => items.map((item) => item.id === family.id ? { ...item, ...patch } : item)) }
  const updateRule = (key: 'capTransverseLength' | 'capStructuralHeight' | 'stemWidth', patch: Partial<Rule>) => update({ [key]: { ...(family?.[key] ?? { min: null, max: null, delta: null }), ...patch } })
  const addFamily = () => {
    if (!family || statusOf(family) !== 'VALID') return
    if (families.some((item) => item.name.trim().toLocaleLowerCase() === family.name.trim().toLocaleLowerCase())) setError('Pier Cap family name already exists.')
    const copy = { ...family, id: newId(), name: `${family.name}-COPY`, capTransverseLength: { ...family.capTransverseLength }, capStructuralHeight: { ...family.capStructuralHeight }, stemWidth: family.stemWidth ? { ...family.stemWidth } : null }
    setFamilies((items) => [...items, copy]); setSelectedId(copy.id); setError('')
  }
  const remove = (id: string) => {
    const references = getFamilyReferences('PIER_CAP', id)
    if (references.length) { setError(`Cannot delete ${id}; used by ${references.map((item) => `${item.bridgeId} / ${item.location}`).join(', ')}.`); return }
    const next = families.filter((item) => item.id !== id); setFamilies(next); if (selectedId === id) setSelectedId(next[0]?.id ?? '')
  }
  const dimensions = family ? [dimension('capTransverseLength', 'Cap Transverse Length (m)', family.capTransverseLength), dimension('capStructuralHeight', 'Cap Structural Height (m)', family.capStructuralHeight), ...(family.capType === 'T_CAP' ? [dimension('stemWidth', 'Stem Width (m)', family.stemWidth)] : [])] : []
  if (!family) return <div className="spn-card"><h2 className="spn-card-title">PIER CAP</h2><p className="spn-card-subtitle">Project Design System / canonical family definition</p></div>

  return <div className="spn-workflow"><div className="spn-card">
    <div className="spn-shape-card-header"><div><h2 className="spn-card-title">PIER CAP</h2><p className="spn-card-subtitle">Project Design System / canonical family definition</p></div><label className="spn-checklist-item"><input type="checkbox" checked={family.enabled} onChange={(e) => update({ enabled: e.target.checked })} /> Use in KOPRUQ analyses</label></div>
    <div className="spn-field-grid"><label className="spn-field">Family Name<input className="spn-input" value={family.name} onChange={(e) => update({ name: e.target.value })} /></label><label className="spn-field">Cap Type<select className="spn-input" value={family.capType} onChange={(e) => update({ capType: e.target.value as PierCapType, stemWidth: e.target.value === 'T_CAP' ? { min: null, max: null, delta: null } : null })}><option value="RECTANGULAR">Rectangular</option><option value="T_CAP">T-Cap</option></select></label><label className="spn-field">Compatible Pier Configuration<select className="spn-input" value={family.compatiblePierConfiguration} onChange={(e) => update({ compatiblePierConfiguration: e.target.value as PierCapConfiguration })}><option value="SINGLE_COLUMN">Single Column</option><option value="TWO_COLUMNS">Two Columns</option></select></label></div>
    <div className="spn-inspector-row"><span>Structural System</span><strong>{structuralSystem(family.compatiblePierConfiguration)} (DERIVED)</strong></div>
    <PierCapSchematic capType={family.capType} configuration={family.compatiblePierConfiguration} heightRule={family.capStructuralHeight} lengthRule={family.capTransverseLength} stemRule={family.stemWidth} /><h3 className="spn-card-title spn-cap-section">SECTION GENERATION</h3>
    <GenerationTable dimensions={dimensions} onUpdateDimension={(key, patch) => updateRule(key as 'capTransverseLength' | 'capStructuralHeight' | 'stemWidth', patch)} notConfiguredLabel="NOT CONFIGURED" />
    <p>Generated Pier Cap Variants: <strong>{variants.length}</strong></p><p>Status: <strong>{statusOf(family)}</strong></p>{error && <p role="alert" className="spn-validation-error">{error}</p>}
    <button className="spn-button-primary" disabled={statusOf(family) !== 'VALID'} onClick={addFamily}>Add Pier Cap</button>
  </div><div className="spn-card"><h3 className="spn-card-title">PIER CAP FAMILY CATALOG</h3><table className="spn-table"><thead><tr><th>Family</th><th>Type</th><th>Configuration</th><th>System</th><th>Variants</th><th>Enabled</th><th>Delete</th></tr></thead><tbody>{families.map((item) => <tr key={item.id} onClick={() => { setSelectedId(item.id); setError('') }} className={item.id === family.id ? 'spn-row-selected' : ''} style={{ cursor: 'pointer' }}><td>{item.name || '-'}</td><td>{item.capType}</td><td>{item.compatiblePierConfiguration}</td><td>{structuralSystem(item.compatiblePierConfiguration)}</td><td>{generatePierCapVariants(item).length}</td><td>{item.enabled ? 'Yes' : 'No'}</td><td><button className="spn-button-secondary" onClick={(e) => { e.stopPropagation(); remove(item.id) }}>Delete</button></td></tr>)}</tbody></table></div></div>
}

function dimension(key: string, label: string, rule: Rule | null): Dimension { return { key, label, min: rule?.min ?? 0, max: rule?.max ?? 0, delta: rule?.delta ?? 0 } }
