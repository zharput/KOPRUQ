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
import type { BridgeRow } from '../../project/model/types'
import { readProjectState } from '../../project/model/projectWorkspace'
import { getFamilySnapshots } from '../../graph/family/familySnapshotStore'
import type { FamilyCategory as GraphFamilyCategory, FamilyCalculationSnapshot } from '../../graph/family/familyResults'
import { familyGroups, candidateColumns, cellValue, paginateAlternatives } from '../model/graphFamilyPresentation'

type Props = { crossSectionValues: CrossSectionValues; setCrossSectionValues: Dispatch<SetStateAction<CrossSectionValues>>; bridges: BridgeRow[] }
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

export default function FamilyTablesWorkspace({ crossSectionValues, setCrossSectionValues, bridges }: Props) {
  const [category, setCategory] = useState<FamilyCategory>('PIER')
  const [selection, setSelection] = useState<FamilySelection>({ category: 'PIER', id: null })
  const [families, setFamilies] = useState<FamilyRegistryRecord[]>(() => getFamilies('PIER'))
  const [bridgeId, setBridgeId] = useState(bridges[0]?.id ?? '')
  const [view, setView] = useState<'catalog' | 'graph'>('catalog')
  const [snapshots, setSnapshots] = useState<FamilyCalculationSnapshot[]>([])
  const [projectUnits, setProjectUnits] = useState(() => readProjectState([]).project.units)
  const graphCategory = category as unknown as GraphFamilyCategory
  const refreshSnapshots = () => { const graph = typeof localStorage === 'undefined' ? undefined : (() => { try { return JSON.parse(localStorage.getItem('spanova.graph.documents.v1') ?? 'null') as { graphs?: { id: string; bridgeId?: string }[] } | null } catch { return null } })(); const document = graph?.graphs?.find(item => item.bridgeId === bridgeId); setSnapshots(document ? getFamilySnapshots(bridgeId, document.id) : []) }
  useEffect(() => { if (!bridges.some(item => item.id === bridgeId)) setBridgeId(bridges[0]?.id ?? '') }, [bridges, bridgeId])
  useEffect(() => { refreshSnapshots(); window.addEventListener('spanova:family-snapshots-changed', refreshSnapshots); return () => window.removeEventListener('spanova:family-snapshots-changed', refreshSnapshots) }, [bridgeId])
  useEffect(() => { const refreshUnits = () => setProjectUnits(readProjectState([]).project.units); window.addEventListener('spanova:project-units-changed', refreshUnits); return () => window.removeEventListener('spanova:project-units-changed', refreshUnits) }, [])
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
  const selectedBridge = bridges.find(item => item.id === bridgeId)
  const content = view === 'graph' ? <GraphAlternatives category={graphCategory} snapshots={snapshots} projectUnits={projectUnits} /> : !active.supported ? <div className="spn-card"><h2 className="spn-card-title">{active.label.toUpperCase()}</h2><p className="spn-card-subtitle">{active.types}</p></div>
    : category === 'SUPERSTRUCTURE' ? <SuperstructureFamiliesPanel crossSectionValues={crossSectionValues} setCrossSectionValues={setCrossSectionValues} />
    : category === 'GIRDER' ? <GirderLibraryPanel />
    : category === 'PIER' ? <PierFamiliesPanel />
    : category === 'PIER_CAP' ? <PierCapFamiliesPanel />
    : category === 'FOUNDATION' ? <FoundationFamiliesPanel />
    : category === 'BEARING' ? <BearingFamiliesPanel />
    : <MaterialsPanel />

  return <WorkspaceLayout leftTitle="Family Tables" leftPanel={<nav className="spn-family-nav" aria-label="Family categories">{CATEGORIES.map(({ category: itemCategory, label, Icon, types, supported }) => <button type="button" key={itemCategory} disabled={!supported} className={itemCategory === category ? 'active' : ''} onClick={() => { setCategory(itemCategory); setView('catalog'); const next = getFamilies(itemCategory); setFamilies(next); setSelection({ category: itemCategory, id: next[0]?.id ?? null }); publishFamilySelection(itemCategory, next[0]?.id ?? null) }}><Icon size={15} /><span>{label}</span><small>{types}</small></button>)}<button type="button" className={view === 'graph' ? 'active' : ''} onClick={() => { setView('graph'); refreshSnapshots() }}><Layers size={15} /><span>Graph Alternatives</span><small>Bridge calculation results</small></button></nav>} mainContent={<div className="spn-family-center"><div className="spn-family-center-heading"><div><h1>{view === 'graph' ? 'Graph Alternatives' : `${active.label} Families`}</h1><p>{view === 'graph' ? 'Read-only results from Graph snapshots' : active.types}</p></div><div className="spn-family-file-actions"><label>Bridge <select aria-label="Family Tables Bridge" value={bridgeId} onChange={event => setBridgeId(event.target.value)}>{bridges.map(bridge => <option key={bridge.id} value={bridge.id}>{bridge.no} | KM {bridge.km} | L = {bridge.estimatedLengthM.toFixed(2)} m</option>)}</select></label><button type="button" disabled title="Family import is not implemented yet">Import</button><button type="button" disabled title="Family export is not implemented yet">Export</button></div></div><div className="spn-family-bridge-summary">{selectedBridge ? `${selectedBridge.no} · KM ${selectedBridge.km} · ${selectedBridge.estimatedLengthM.toFixed(2)} m` : 'No bridge selected'} · {snapshots.length} family groups</div>{content}</div>} rightTitle="Family Inspector" rightPanel={<FamilyInspector category={category} family={selected} records={families} />} />
}

function GraphAlternatives({ category, snapshots, projectUnits }: { category: GraphFamilyCategory; snapshots: FamilyCalculationSnapshot[]; projectUnits: { length: string; force: string; moment: string; stress: string; mass: string; temperature: string } }) {
  const groups = familyGroups(snapshots)
  const active = groups.find(group => group.category === category) ?? groups[0]
  const [groupCategory, setGroupCategory] = useState<GraphFamilyCategory>(active.category)
  const selectedGroup = groups.find(group => group.category === groupCategory) ?? active
  const [sourceId, setSourceId] = useState<string | null>(selectedGroup.snapshots[0]?.sourceNodeId ?? null)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  useEffect(() => setGroupCategory(category), [category])
  useEffect(() => { setSourceId(selectedGroup.snapshots[0]?.sourceNodeId ?? null); setSelectedCandidateId(null); setSearch(''); setSort(null) }, [groupCategory, selectedGroup.snapshots])
  useEffect(() => setPage(1), [groupCategory, sourceId, snapshots, rowsPerPage])
  const source = selectedGroup.snapshots.find(item => item.sourceNodeId === sourceId) ?? selectedGroup.snapshots[0]
  const alternatives = source?.candidates ?? []
  const columns = candidateColumns(selectedGroup.category, alternatives, projectUnits)
  const filteredAlternatives = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    const filtered = query ? alternatives.filter(item => `${item.candidateId} ${JSON.stringify(item.candidateData)}`.toLocaleLowerCase().includes(query)) : [...alternatives]
    if (!sort) return filtered
    return filtered.sort((left, right) => {
      const a = cellValue(left, sort.key, projectUnits), b = cellValue(right, sort.key, projectUnits)
      const an = Number(a), bn = Number(b)
      const result = Number.isFinite(an) && Number.isFinite(bn) ? an - bn : a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      return sort.direction === 'asc' ? result : -result
    })
  }, [alternatives, projectUnits, search, sort])
  useEffect(() => setPage(1), [search, sort])
  const pagination = paginateAlternatives(filteredAlternatives, page, rowsPerPage)
  const { page: safePage, pageCount, items: pageRows } = pagination
  const toggleSort = (key: string) => setSort(current => current?.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' })
  return <div className="spn-family-graph-view"><aside className="spn-family-graph-groups"><h3>FAMILY GROUPS</h3>{groups.map(group => <button type="button" key={group.category} className={group.category === groupCategory ? 'active' : ''} onClick={() => setGroupCategory(group.category)}><span>{familyLabel(group.category)}</span><small>{group.snapshots.length} nodes · {group.candidateCount} candidates</small></button>)}</aside><section className="spn-card"><h2 className="spn-card-title">{familyLabel(selectedGroup.category)}</h2>{selectedGroup.snapshots.length ? <label className="spn-family-source-select">Source Node<select aria-label="Family source node" value={source?.sourceNodeId ?? ''} onChange={event => setSourceId(event.target.value)}>{selectedGroup.snapshots.map(item => <option key={item.sourceNodeId} value={item.sourceNodeId}>{item.sourceNodeName} · {item.candidates.length} candidates</option>)}</select></label> : <p className="spn-card-subtitle">NO_RESULT · Run the selected bridge graph to create Family alternatives.</p>}{source && <><div className="spn-family-candidate-toolbar"><label>Search candidates<input value={search} onChange={event => setSearch(event.target.value)} placeholder="ID, material, text…" /></label><span>Candidates: {alternatives.length}</span><span>Visible: {filteredAlternatives.length}</span><span>Selected: {selectedCandidateId ? 1 : 0}</span></div><p className="spn-card-subtitle">{source.sourceNodeName} · {source.sourceNodeType} · {source.freshness} · {alternatives.length} alternatives</p><div className="spn-table-wrap"><table className="spn-table"><thead><tr>{columns.map(column => <th key={column.key} className="spn-sortable-header"><button type="button" onClick={() => toggleSort(column.key)} title={`Sort by ${column.label}`}>{column.label}{sort?.key === column.key ? ` ${sort.direction === 'asc' ? '↑' : '↓'}` : ''}</button></th>)}</tr></thead><tbody>{pageRows.map(alternative => <tr key={`${alternative.bridgeId}:${alternative.graphDocumentId}:${alternative.sourceNodeId}:${alternative.candidateId}`} className={alternative.candidateId === selectedCandidateId ? 'spn-row-selected' : ''} onClick={() => setSelectedCandidateId(alternative.candidateId)}>{columns.map(column => <td key={column.key}>{cellValue(alternative, column.key, projectUnits)}</td>)}</tr>)}</tbody></table>{!pageRows.length && <div className="spn-family-empty">{alternatives.length ? 'No candidates match the current search.' : 'No family alternatives available.'}</div>}</div><div className="spn-family-pagination"><span>{filteredAlternatives.length ? `Showing ${(safePage - 1) * rowsPerPage + 1}–${Math.min(safePage * rowsPerPage, filteredAlternatives.length)} of ${filteredAlternatives.length}` : '0 candidates'}</span><label>Rows per page<select value={rowsPerPage} onChange={event => setRowsPerPage(Number(event.target.value))}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><button type="button" disabled={safePage <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</button><span>{pageCount ? `Page ${safePage} of ${pageCount}` : 'No pages'}</span><button type="button" disabled={!pageCount || safePage >= pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>Next</button></div></>}</section></div>
}

function familyLabel(category: GraphFamilyCategory) { return category.replace('SPAN_ARRANGEMENT', 'Span Arrangement').replace('PIER_CAP', 'Pier Cap').replaceAll('_', ' ').replace(/\b\w/g, value => value.toUpperCase()) }

function FamilyInspector({ category, family, records }: { category: FamilyCategory; family?: FamilyRegistryRecord; records: FamilyRegistryRecord[] }) {
  if (!family) return <div className="spn-family-inspector"><div className="spn-workspace-heading">{category.replace('_', ' ')}</div>{records.length ? <><p>Select a row in the catalog to inspect its stable family identity and current use.</p><div className="spn-inspector-row"><span>Families</span><strong>{records.length}</strong></div></> : <p>{category === 'ABUTMENT' ? 'No Abutment family model is available. This category is disabled.' : 'This existing feature has no stable family catalog records yet. Its editor remains available in the center panel.'}</p>}</div>
  return <FamilyDetails family={family} records={records} />
}

function FamilyDetails({ family, records }: { family: FamilyRegistryRecord; records: FamilyRegistryRecord[] }) {
  const { category, id } = family
  const usage = useMemo(() => getFamilyReferences(category, id), [category, id])
  return <div className="spn-family-inspector"><div className="spn-workspace-heading">SELECTED FAMILY</div><div className="spn-inspector-row"><span>ID</span><strong>{family.id}</strong></div><div className="spn-inspector-row"><span>Name</span><strong>{family.name}</strong></div><div className="spn-inspector-row"><span>Type</span><strong>{family.type}</strong></div><div className="spn-inspector-row"><span>Enabled</span><strong>{family.enabled == null ? 'N/A' : family.enabled ? 'Yes' : 'No'}</strong></div><p>{family.summary}</p><div className="spn-inspector-section">BRIDGE USAGE</div><div className="spn-inspector-row"><span>References</span><strong>{usage.length}</strong></div>{usage.map((item) => <div className="spn-family-usage" key={`${item.bridgeId}-${item.location}`}>{item.bridgeId} · {item.location}</div>)}<div className="spn-inspector-section">CATALOG</div><div className="spn-inspector-row"><span>Families in category</span><strong>{records.length}</strong></div></div>
}
