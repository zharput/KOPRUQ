import { useEffect, useMemo, useState } from 'react'
import type { BridgeRow } from '../../project/model/types'
import { readProjectState } from '../../project/model/projectWorkspace'
import { getFamilySnapshots } from '../../graph/family/familySnapshotStore'
import type { FamilyAlternative, FamilyCalculationSnapshot, FamilyCategory } from '../../graph/family/familyResults'
import { getNodeDefinition } from '../../graph/registry/nodeRegistry'
import { getNodeLogo } from '../../graph/registry/nodeLogos'
import { candidateColumns, cellValue, getPrecastGirderDisplayId, paginateAlternatives } from '../model/graphFamilyPresentation'
import PrecastGirderFamilyPreview, { PrecastGirderSectionProperties, PrecastGirderVisualCandidates } from './PrecastGirderFamilyPreview'

const EM_DASH = '\u2014'

const TYPES: { type: FamilyCategory; node: string; label: string; group: string }[] = [
  { type: 'GIRDER', node: 'structural.girder.precast', label: 'Precast Girder', group: 'SUPERSTRUCTURE' },
  { type: 'PIER', node: 'substructure.pier.rectangular', label: 'Rectangular Pier', group: 'SUBSTRUCTURE' },
]

export default function FamilyResultsViewer({ bridges }: { bridges: BridgeRow[] }) {
  const [bridgeId, setBridgeId] = useState(bridges[0]?.id ?? '')
  const [family, setFamily] = useState(TYPES[0])
  const [snapshots, setSnapshots] = useState<FamilyCalculationSnapshot[]>([])
  const [sourceId, setSourceId] = useState('')
  const [selectedId, setSelectedId] = useState<string>()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(25)
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>()
  const [units, setUnits] = useState(() => readProjectState([]).project.units)
  const [nodeParameters, setNodeParameters] = useState<Record<string, any>>({})
  const refresh = () => { try { const docs = JSON.parse(localStorage.getItem('kopruq.graph.documents.v1') ?? 'null') as { graphs?: { id: string; bridgeId?: string }[] } | null; const graph = docs?.graphs?.find(item => item.bridgeId === bridgeId); setSnapshots(graph ? getFamilySnapshots(bridgeId, graph.id) : []) } catch { setSnapshots([]) } }
  useEffect(() => { refresh(); const onChange = () => refresh(); const onUnits = () => setUnits(readProjectState([]).project.units); window.addEventListener('kopruq:family-snapshots-changed', onChange); window.addEventListener('kopruq:project-units-changed', onUnits); return () => { window.removeEventListener('kopruq:family-snapshots-changed', onChange); window.removeEventListener('kopruq:project-units-changed', onUnits) } }, [bridgeId])
  const definition = getNodeDefinition(family.node)
  const sources = snapshots.filter(item => item.familyCategory === family.type)
  const source = sources.find(item => item.sourceNodeId === sourceId) ?? sources[0]
  useEffect(() => {
    try {
      const docs = JSON.parse(localStorage.getItem('kopruq.graph.documents.v1') ?? 'null') as { graphs?: { id: string; bridgeId?: string; nodes?: { id: string; parameters?: Record<string, unknown> }[] }[] } | null
      const graph = docs?.graphs?.find(item => item.bridgeId === bridgeId)
      const node = graph?.nodes?.find(item => item.id === source?.sourceNodeId)
      setNodeParameters(node?.parameters ?? {})
    } catch { setNodeParameters({}) }
  }, [bridgeId, source?.sourceNodeId, snapshots])
  const displayIds = useMemo(() => new Map((source?.candidates ?? []).map((item, index) => [item.candidateId, family.type === 'GIRDER' ? getPrecastGirderDisplayId(index) : item.candidateId])), [source, family.type])
  const rows = useMemo(() => { const result = [...(source?.candidates ?? [])]; if (!sort) return result; return result.sort((a, b) => { const left = cellValue(a, sort.key, units); const right = cellValue(b, sort.key, units); const n = Number(left) - Number(right); const value = Number.isNaN(n) ? left.localeCompare(right, undefined, { numeric: true }) : n; return sort.direction === 'asc' ? value : -value }) }, [source, sort, units])
  const columns = candidateColumns(family.type, rows, units, displayIds)
  const paged = paginateAlternatives(rows, page, size)
  const selected = (source?.candidates ?? []).find(row => row.candidateId === selectedId) ?? source?.candidates[0]
  const chooseFamily = (value: typeof family) => { setFamily(value); setSourceId(''); setSelectedId(undefined); setPage(1); setSort(undefined) }
  const toggleSort = (key: string) => setSort(current => current?.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' })
  const parameters = (definition?.parameterSchema.filter(item => family.type === 'GIRDER' ? item.key === 'materialId' || Boolean(item.inputPortId) : item.key.endsWith('Value') || item.key === 'materialId') ?? []).filter(item => !item.key.endsWith('Unit'))
  const parameterKey = (key: string) => family.type === 'GIRDER' ? ({ tf: 'Btf', bf: 'Bbf', w: 'tw' }[key] ?? key) : key
  const parameterDescription = (_key: string, label: string) => label.replace(/\s*\([^)]*\)\s*$/, '')
  const candidateParameterStats = (key: string) => {
    const sourceKey = family.type === 'GIRDER' ? ({ Btf: 'tf', Bbf: 'bf', tw: 'w' }[key] ?? key) : key
    const values = (source?.candidates ?? []).map(item => Number(((item.candidateData as Record<string, unknown>).geometry as Record<string, unknown> | undefined)?.[sourceKey])).filter(Number.isFinite).sort((a, b) => a - b)
    if (!values.length) return undefined
    const unique = [...new Set(values)]
    const step = unique.length > 1 ? Math.min(...unique.slice(1).map((value, index) => value - unique[index])) : undefined
    return { min: values[0].toFixed(2), max: values[values.length - 1].toFixed(2), step: step == null ? EM_DASH : step.toFixed(2) }
  }
    return <div className="spn-family-workspace"><svg className="spn-concrete-texture-defs" aria-hidden="true"><defs><filter id="kopruq-concrete-texture"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="11" result="noise" /><feColorMatrix in="noise" type="saturate" values="0" result="grayNoise" /><feComponentTransfer in="grayNoise"><feFuncA type="table" tableValues="0 0.13" /></feComponentTransfer><feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" /></filter></defs></svg>
    <section className="kopruq-family-detail spn-family-detail-pane">
      <header className="spn-family-workspace-header"><div><div className="spn-family-title"><img src={getNodeLogo(family.node)} alt="" /><h1>{family.label} Family</h1></div><p>Graph-generated structural family results</p></div><div className="spn-family-controls"><label>Bridge<select aria-label="Family Bridge" value={bridgeId} onChange={event => { setBridgeId(event.target.value); setSourceId('') }}>{bridges.map(item => <option key={item.id} value={item.id}>{item.no}</option>)}</select></label></div></header>
      <aside className="spn-family-library-panel"><h2>Family Library</h2>{(['SUPERSTRUCTURE', 'SUBSTRUCTURE'] as const).map(group => <section key={group}><h3>{group}</h3>{TYPES.filter(item => item.group === group).map(item => <button type="button" key={item.node} className={item.node === family.node ? 'active' : ''} onClick={() => chooseFamily(item)}><img src={getNodeLogo(item.node)} alt="" />{item.label}</button>)}</section>)}</aside>
      <div className="kopruq-family-primary-row">
        <section className="kopruq-family-parameters spn-family-card"><h2>Parameters</h2><table className="spn-family-parameters"><thead><tr><th>Parameter</th><th>Parametric Values</th><th>Min</th><th>Max</th><th>Step</th><th>Unit</th></tr></thead><tbody>{parameters.map(item => { const rawKey = item.key.replace(/Value$/, ''); const key = parameterKey(rawKey); const stats = candidateParameterStats(key); const value = nodeParameters[item.key]; const shown = typeof value === 'number' || typeof value === 'string' ? value : 'EM_DASH'; const unit = typeof nodeParameters[`${rawKey}Unit`] === 'string' ? nodeParameters[`${rawKey}Unit`] : item.key.endsWith('Value') ? 'm' : 'EM_DASH'; return <tr key={item.key}><td className="family-param-key">{key}</td><td className="family-param-name">{parameterDescription(key, item.label.replace(/ local default| unit/g, ''))}</td><td>{stats ? stats.min : shown}</td><td>{stats ? stats.max : shown}</td><td>{stats?.step ?? item.step ?? 'EM_DASH'}</td><td>{unit}</td></tr> })}</tbody></table></section>
        <section className="kopruq-family-preview spn-family-card spn-family-section-preview">{selected ? family.type === 'GIRDER' ? <PrecastGirderFamilyPreview candidate={selected} familyCandidates={source?.candidates} projectUnits={units} displayId={displayIds.get(selected.candidateId)} onSelectCandidate={setSelectedId} showDetails={false} /> : <><h2>Section Preview</h2><RectangularPierPreview candidate={selected} /></> : <><h2>Section Preview</h2><div className="spn-family-empty">Select a candidate to preview its section.</div></>}</section>
      </div>
      {selected && family.type === 'GIRDER' && <PrecastGirderSectionProperties candidate={selected} projectUnits={units} />}
      {selected && family.type === 'GIRDER' && <PrecastGirderVisualCandidates candidate={selected} familyCandidates={source?.candidates} projectUnits={units} onSelectCandidate={setSelectedId} />}
    </section>
    <aside className="spn-family-candidates-panel"><header><h2>Candidates ({rows.length})</h2><input aria-label="Search candidates" placeholder="Search candidates..." value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} /></header>{!source ? <div className="spn-family-empty">No candidates available. Run the corresponding node in Graph.</div> : source.freshness === 'FAILED' ? <div className="spn-family-empty spn-family-error">Graph calculation failed.<br />{source.errors.join(' ')}</div> : <><div className="spn-family-table-scroll"><table className="spn-table spn-family-candidate-table"><thead><tr>{columns.map(column => <th key={column.key}><button type="button" onClick={() => toggleSort(column.key)}>{column.label}{sort?.key === column.key ? (sort.direction === 'asc' ? ' â†‘' : ' â†“') : ''}</button></th>)}</tr></thead><tbody>{paged.items.map(row => <tr key={row.candidateId} className={row.candidateId === selected?.candidateId ? 'spn-row-selected' : ''} onClick={() => setSelectedId(row.candidateId)}>{columns.map(column => <td key={column.key}>{cellValue(row, column.key, units, displayIds)}</td>)}</tr>)}</tbody></table></div><footer className="spn-family-pagination"><span>Showing {paged.start}â€“{paged.end} of {paged.total}</span><select aria-label="Page size" value={size} onChange={event => { setSize(Number(event.target.value)); setPage(1) }}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button type="button" disabled={page >= paged.pageCount} onClick={() => setPage(page + 1)}>Next</button></footer></>}</aside>
  </div>
}

function RectangularPierPreview({ candidate }: { candidate: FamilyAlternative }) { const geometry = ((candidate.candidateData as Record<string, unknown>).geometry ?? {}) as Record<string, unknown>; const bx = Number(geometry.Bx ?? geometry.B ?? 1); const by = Number(geometry.By ?? geometry.D ?? 1); return <div className="spn-pier-section-preview"><svg viewBox="0 0 300 260" role="img" aria-label="Rectangular Pier Cross Section"><rect x="80" y="45" width="140" height="150" /><text x="150" y="32" textAnchor="middle">By = {by.toFixed(2)} m</text><text x="150" y="225" textAnchor="middle">Bx = {bx.toFixed(2)} m</text><text x="25" y="235">Y â†‘</text><text x="205" y="245">+EM_DASHEM_DASHâ†’ X (Bridge axis)</text></svg></div> }


