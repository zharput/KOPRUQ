import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { Boxes, Component, Layers, Mountain, Shield, TowerControl, Warehouse, Anchor } from 'lucide-react'
import type { CrossSectionValues } from '../../superstructure-families'
import SuperstructureFamiliesPanel from '../../superstructure-families/components/SuperstructureFamiliesPanel'
import PierFamiliesPanel from '../../pier-families/components/PierFamiliesPanel'
import PierCapFamiliesPanel from '../../pier-cap-families/components/PierCapFamiliesPanel'
import FoundationFamiliesPanel from '../../foundation-families/components/FoundationFamiliesPanel'
import BearingFamiliesPanel from '../../bearing-families/components/BearingFamiliesPanel'
import MaterialsPanel from '../../materials/components/MaterialsPanel'
import GirderLibraryPanel from '../../girder-library/components/GirderLibraryPanel'
import WorkspaceLayout from '../../../app/layout/WorkspaceLayout'
import { familyChangedEvent, getFamilies, getFamilyReferences, publishFamilySelection, type FamilyCategory, type FamilyRegistryRecord, type FamilySelection } from '../../family-registry/model/registry'

type Props = { crossSectionValues: CrossSectionValues; setCrossSectionValues: Dispatch<SetStateAction<CrossSectionValues>> }
const CATEGORIES: { category: FamilyCategory; label: string; Icon: typeof Boxes; types: string; supported: boolean }[] = [
  { category: 'SUPERSTRUCTURE', label: 'Superstructure', Icon: Layers, types: 'Precast is configured; other structural systems are placeholders.', supported: true },
  { category: 'GIRDER', label: 'Girder', Icon: Component, types: 'Precast Girder is configured; Steel / Box Girder are disabled.', supported: true },
  { category: 'PIER', label: 'Pier', Icon: TowerControl, types: 'Rectangular · Circular · Oval · Box · H section', supported: true },
  { category: 'PIER_CAP', label: 'Pier Cap', Icon: Boxes, types: 'Rectangular · T-Cap', supported: true },
  { category: 'ABUTMENT', label: 'Abutment', Icon: Warehouse, types: 'No reusable Abutment family model is present yet.', supported: false },
  { category: 'FOUNDATION', label: 'Foundation', Icon: Mountain, types: 'Shallow · Piled', supported: true },
  { category: 'BEARING', label: 'Bearing', Icon: Anchor, types: 'Elastomeric', supported: true },
  { category: 'MATERIAL', label: 'Material', Icon: Shield, types: 'Existing concrete class by structural element.', supported: true },
]

export default function FamilyTablesWorkspace({ crossSectionValues, setCrossSectionValues }: Props) {
  const [category, setCategory] = useState<FamilyCategory>('PIER')
  const [selection, setSelection] = useState<FamilySelection>({ category: 'PIER', id: null })
  const [families, setFamilies] = useState<FamilyRegistryRecord[]>(() => getFamilies('PIER'))
  useEffect(() => {
    const onSelection = (event: Event) => {
      const detail = (event as CustomEvent<FamilySelection>).detail
      setSelection(detail)
      setFamilies(getFamilies(detail.category))
    }
    window.addEventListener('spanova:family-selection-changed', onSelection)
    return () => window.removeEventListener('spanova:family-selection-changed', onSelection)
  }, [])
  useEffect(() => {
    const changed = familyChangedEvent(category)
    if (!changed) return
    const listener = () => setFamilies(getFamilies(category))
    window.addEventListener(changed, listener)
    return () => window.removeEventListener(changed, listener)
  }, [category])

  const active = CATEGORIES.find((item) => item.category === category)!
  const selected = selection.category === category ? families.find((item) => item.id === selection.id) : undefined
  const content = !active.supported ? <div className="spn-card"><h2 className="spn-card-title">{active.label.toUpperCase()}</h2><p className="spn-card-subtitle">{active.types}</p></div>
    : category === 'SUPERSTRUCTURE' ? <SuperstructureFamiliesPanel crossSectionValues={crossSectionValues} setCrossSectionValues={setCrossSectionValues} />
    : category === 'GIRDER' ? <GirderLibraryPanel />
    : category === 'PIER' ? <PierFamiliesPanel />
    : category === 'PIER_CAP' ? <PierCapFamiliesPanel />
    : category === 'FOUNDATION' ? <FoundationFamiliesPanel />
    : category === 'BEARING' ? <BearingFamiliesPanel />
    : <MaterialsPanel />

  return <WorkspaceLayout leftTitle="Family Tables" leftPanel={<nav className="spn-family-nav" aria-label="Family categories">{CATEGORIES.map(({ category: itemCategory, label, Icon, types, supported }) => <button type="button" key={itemCategory} disabled={!supported} className={itemCategory === category ? 'active' : ''} onClick={() => { setCategory(itemCategory); const next = getFamilies(itemCategory); setFamilies(next); setSelection({ category: itemCategory, id: next[0]?.id ?? null }); publishFamilySelection(itemCategory, next[0]?.id ?? null) }}><Icon size={15} /><span>{label}</span><small>{types}</small></button>)}</nav>} mainContent={<div className="spn-family-center"><div className="spn-family-center-heading"><div><h1>{active.label} Families</h1><p>{active.types}</p></div><div className="spn-family-file-actions"><button type="button" disabled title="Family import is not implemented yet">Import</button><button type="button" disabled title="Family export is not implemented yet">Export</button></div></div>{content}</div>} rightTitle="Family Inspector" rightPanel={<FamilyInspector category={category} family={selected} records={families} />} />
}

function FamilyInspector({ category, family, records }: { category: FamilyCategory; family?: FamilyRegistryRecord; records: FamilyRegistryRecord[] }) {
  if (!family) return <div className="spn-family-inspector"><div className="spn-workspace-heading">{category.replace('_', ' ')}</div>{records.length ? <><p>Select a row in the catalog to inspect its stable family identity and current use.</p><div className="spn-inspector-row"><span>Families</span><strong>{records.length}</strong></div></> : <p>{category === 'ABUTMENT' ? 'No Abutment family model is available. This category is disabled.' : 'This existing feature has no stable family catalog records yet. Its editor remains available in the center panel.'}</p>}</div>
  return <FamilyDetails family={family} records={records} />
}

function FamilyDetails({ family, records }: { family: FamilyRegistryRecord; records: FamilyRegistryRecord[] }) {
  const { category, id } = family
  const usage = useMemo(() => getFamilyReferences(category, id), [category, id])
  return <div className="spn-family-inspector"><div className="spn-workspace-heading">SELECTED FAMILY</div><div className="spn-inspector-row"><span>ID</span><strong>{family.id}</strong></div><div className="spn-inspector-row"><span>Name</span><strong>{family.name}</strong></div><div className="spn-inspector-row"><span>Type</span><strong>{family.type}</strong></div><div className="spn-inspector-row"><span>Enabled</span><strong>{family.enabled == null ? 'N/A' : family.enabled ? 'Yes' : 'No'}</strong></div><p>{family.summary}</p><div className="spn-inspector-section">BRIDGE USAGE</div><div className="spn-inspector-row"><span>References</span><strong>{usage.length}</strong></div>{usage.map((item) => <div className="spn-family-usage" key={`${item.bridgeId}-${item.location}`}>{item.bridgeId} · {item.location}</div>)}<div className="spn-inspector-section">CATALOG</div><div className="spn-inspector-row"><span>Families in category</span><strong>{records.length}</strong></div></div>
}
