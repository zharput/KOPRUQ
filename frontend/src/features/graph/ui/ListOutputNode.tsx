import { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { FlowGraphNode } from '../adapters/reactFlowAdapter'
import type { GraphValue, PierCandidate, PierCapCandidate, FoundationCandidate, BearingCandidate } from '../domain/types'
import { formatDisplayValue, formatQuantity, unitsForKind, type QuantityKind } from '../domain/quantities'
import { getNodeHeaderStyle, getNodeTheme } from '../domain/nodeVisualThemes'

export default function ListOutputNode({ data, selected }: { data: FlowGraphNode['data']; selected: boolean }) {
  const stale = data.isDirty && data.previewValue === undefined
  const value = stale ? undefined : data.isDirty ? data.previewValue : data.outputs?.value ?? data.previewValue
  const items = value === undefined ? [] : Array.isArray(value) ? value : [value]
  const emptyMessage = stale ? 'Results outdated - Run required'
    : data.outputAvailability === 'run-required' ? 'Run required'
      : data.outputAvailability === 'unconnected' ? 'Connect an output'
        : 'No items'
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [page, setPage] = useState(0)
  const pageSize = 50
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, pageCount - 1)
  const toggle = (key: string) => setExpanded(current => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next })
  return <div className={`spn-graph-node spn-graph-list-node ${getNodeTheme('OUTPUT').className}${selected ? ' is-selected' : ''}${data.executionState === 'error' ? ' has-error' : data.executionState === 'success' ? ' has-success' : data.executionState === 'running' ? ' is-running' : ''}${data.isDirty ? ' is-dirty' : ''}`}>
    <header className="spn-graph-node-title" style={getNodeHeaderStyle('OUTPUT')}><span>List</span><small>OUTPUT</small></header>
    <div className="spn-graph-list-heading">{value === undefined ? emptyMessage : `${items.length} item${items.length === 1 ? '' : 's'}${data.isDirty ? ' / DIRTY' : ''}`}</div>
    <div className="spn-graph-list-items" role="list" aria-label="List items">
      {items.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map((item, offset) => {
        const index = currentPage * pageSize + offset
        return <ListItem key={itemKey(item, index)} item={item as GraphValue} index={index} expanded={expanded.has(itemKey(item, index))} onToggle={() => toggle(itemKey(item, index))} projectUnits={data.projectUnits} />
      })}
    </div>
    {items.length > pageSize && <div className="spn-graph-list-footer"><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button><span>{currentPage + 1} / {pageCount}</span><button type="button" disabled={currentPage + 1 === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></div>}
    {data.executionError && <div className="spn-graph-node-error-message" title={data.executionError}>{data.executionError}</div>}
    <Handle type="target" position={Position.Left} id="items" isConnectable title="Items - any supported graph value" />
    {(data.isDirty || data.outputAvailability === 'run-required' || data.executionState !== 'idle') && <div className="spn-graph-node-state">{data.isDirty ? 'DIRTY' : data.outputAvailability === 'run-required' ? 'RUN REQUIRED' : data.executionState.toUpperCase()}</div>}
  </div>
}

function ListItem({ item, index, expanded, onToggle, projectUnits }: { item: GraphValue; index: number; expanded: boolean; onToggle: () => void; projectUnits?: FlowGraphNode['data']['projectUnits'] }) {
  const candidate = isPierCandidate(item)
  const capCandidate = isPierCapCandidate(item)
  const foundationCandidate = isFoundationCandidate(item)
  const bearingCandidate = isBearingCandidate(item)
  const girderCandidate = isGirderCandidate(item)
  const expandable = candidate || capCandidate || foundationCandidate || bearingCandidate || girderCandidate || isRecord(item)
  const summary = candidate ? summarizePier(item, projectUnits) : capCandidate ? summarizeCap(item, projectUnits) : foundationCandidate ? summarizeFoundation(item, projectUnits) : bearingCandidate ? summarizeBearing(item, projectUnits) : girderCandidate ? summarizeGirder(item, projectUnits) : formatValue(item, projectUnits)
  return <div className="spn-graph-list-item" role="listitem">
    <div className="spn-graph-list-item-row">
      {expandable ? <button type="button" aria-label={`${expanded ? 'Collapse' : 'Expand'} item ${index}`} onClick={onToggle}>{expanded ? 'Hide' : 'Details'}</button> : <span className="spn-graph-list-disclosure" />}
      <span className="spn-graph-list-index">{index}</span><span className="spn-graph-list-summary" title={summary}>{summary}</span>
    </div>
    {expanded && <div className="spn-graph-list-details">{candidate ? pierDetails(item, projectUnits).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>) : capCandidate ? capDetails(item, projectUnits).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>) : foundationCandidate ? foundationDetails(item, projectUnits).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>) : bearingCandidate ? bearingDetails(item, projectUnits).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>) : girderCandidate ? girderDetails(item, projectUnits).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>) : Object.entries(item as unknown as Record<string, unknown>).slice(0, 20).map(([key, value]) => <div key={key}><span>{key}</span><strong>{formatValue(value as GraphValue, projectUnits)}</strong></div>)}</div>}
  </div>
}

function summarizePier(candidate: PierCandidate, units?: FlowGraphNode['data']['projectUnits']) {
  const dimensions = Object.entries(candidate.geometry).map(([key, value]) => `${key}=${formatLength(value, units)}`).join(' ')
  return `${candidate.pierType.replace('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())} Pier  ${dimensions}  H=${formatLength(candidate.heightM, units)}\nMaterial ${candidate.material.name}  Columns ${candidate.columnCount}`
}
function summarizeCap(candidate:PierCapCandidate,units?:FlowGraphNode['data']['projectUnits']){const g=candidate.geometry;return candidate.capType==='T'?`T-Cap  L=${formatLength(g.length,units)}  Top W=${formatLength(g.topWidth,units)}  Stem W=${formatLength(g.stemWidth,units)}  H=${formatLength(g.totalHeight,units)}  tf=${formatLength(g.flangeThickness,units)}  Material ${candidate.material.name}`:`Rectangular Cap  L=${formatLength(g.length,units)}  W=${formatLength(g.width,units)}  H=${formatLength(g.height,units)}  Material ${candidate.material.name}`}
function capDetails(candidate:PierCapCandidate,units?:FlowGraphNode['data']['projectUnits']):[string,string][]{const labels=candidate.capType==='T'?[['Length','length'],['Top Width','topWidth'],['Stem Width','stemWidth'],['Total Height','totalHeight'],['Flange Thickness','flangeThickness']]:[['Length','length'],['Width','width'],['Height','height']];return [...labels.map(([label,key])=>[label,formatLength(candidate.geometry[key],units)] as [string,string]),['Cap Type',candidate.capType==='T'?'T-Cap':'Rectangular Cap'],['Material',candidate.material.name]]}
function summarizeFoundation(candidate:FoundationCandidate,units?:FlowGraphNode['data']['projectUnits']){const g=candidate.geometry;if(candidate.foundationType==='SHALLOW')return `Shallow Foundation  Lx=${formatLength(Number(g.Lx),units)}  Ly=${formatLength(Number(g.Ly),units)}  H=${formatLength(Number(g.height),units)}  Material ${candidate.material.name}`;const d=g.derived as Readonly<Record<string,number>>;return `Piled Foundation  D=${formatLength(Number(g.pileDiameter),units)}  nx=${g.pileCountX}  ax=${formatLength(Number(g.pileSpacingX),units)}  ny=${g.pileCountY}  ay=${formatLength(Number(g.pileSpacingY),units)}  Cap H=${formatLength(Number(g.capHeight),units)}  Lx=${formatLength(d.Lx,units)}  Ly=${formatLength(d.Ly,units)}  Material ${candidate.material.name}`}
function foundationDetails(candidate:FoundationCandidate,units?:FlowGraphNode['data']['projectUnits']):[string,string][]{const g=candidate.geometry;if(candidate.foundationType==='SHALLOW')return [['Foundation Type','Shallow'],['Lx',formatLength(Number(g.Lx),units)],['Ly',formatLength(Number(g.Ly),units)],['Height',formatLength(Number(g.height),units)],['Material',candidate.material.name]];const d=g.derived as Readonly<Record<string,number>>;return [['Foundation Type','Piled'],['Pile Diameter D',formatLength(Number(g.pileDiameter),units)],['Pile Count X nx',String(g.pileCountX)],['Pile Spacing X ax',formatLength(Number(g.pileSpacingX),units)],['Pile Count Y ny',String(g.pileCountY)],['Pile Spacing Y ay',formatLength(Number(g.pileSpacingY),units)],['Cap Height',formatLength(Number(g.capHeight),units)],['Derived Lx',formatLength(d.Lx,units)],['Derived Ly',formatLength(d.Ly,units)],['Material',candidate.material.name]]}
function summarizeBearing(candidate:BearingCandidate,units?:FlowGraphNode['data']['projectUnits']){const g=candidate.geometry,s=candidate.stiffness;return `Elastomeric Bearing  Lx=${formatLength(g.lengthX,units)}  Ly=${formatLength(g.widthY,units)}  H=${formatLength(g.totalHeight,units)}\nKx=${formatStiffness(s.kx,'translationalStiffness',units)}  Ky=${formatStiffness(s.ky,'translationalStiffness',units)}  Kz=${formatStiffness(s.kz,'translationalStiffness',units)}  Krx=${formatStiffness(s.krx,'rotationalStiffness',units)}  Kry=${formatStiffness(s.kry,'rotationalStiffness',units)}  Krz=${formatStiffness(s.krz,'rotationalStiffness',units)}`}
function summarizeGirder(candidate: any,units?:FlowGraphNode['data']['projectUnits']){const g=candidate.geometry;return `${candidate.girderType} Girder ${Object.entries(g).map(([k,v])=>`${k}=${formatLength(Number(v),units)}`).join(' ')} Material ${candidate.material?.name??'INCOMPLETE'}`}
function girderDetails(candidate:any,units?:FlowGraphNode['data']['projectUnits']):[string,string][]{return [...Object.entries(candidate.geometry).map(([k,v])=>[k,formatLength(Number(v),units)] as [string,string]),['Section Type',candidate.sectionType],['Material',candidate.material?.name??'INCOMPLETE'],['Preferred Span',formatLength(candidate.preferredSpan,units)]]}
function bearingDetails(candidate:BearingCandidate,units?:FlowGraphNode['data']['projectUnits']):[string,string][]{const g=candidate.geometry,s=candidate.stiffness;return [['Type','Elastomeric Bearing'],['Length X',formatLength(g.lengthX,units)],['Width Y',formatLength(g.widthY,units)],['Total Height',formatLength(g.totalHeight,units)],['Kx',formatStiffness(s.kx,'translationalStiffness',units)],['Ky',formatStiffness(s.ky,'translationalStiffness',units)],['Kz',formatStiffness(s.kz,'translationalStiffness',units)],['Krx',formatStiffness(s.krx,'rotationalStiffness',units)],['Kry',formatStiffness(s.kry,'rotationalStiffness',units)],['Krz',formatStiffness(s.krz,'rotationalStiffness',units)]]}
function formatStiffness(value:number,kind:QuantityKind,_units?:FlowGraphNode['data']['projectUnits']){return `${value.toFixed(0)} ${kind==='translationalStiffness'?'kN/m':'kN·m/rad'}`}
function pierDetails(candidate: PierCandidate, units?: FlowGraphNode['data']['projectUnits']): [string, string][] {
  return [...Object.entries(candidate.geometry).map(([key, value]) => [key, formatLength(value, units)] as [string, string]), ['Height', formatLength(candidate.heightM, units)], ['Columns', String(candidate.columnCount)], ['Material', candidate.material.name]]
}
function formatLength(value: number, units?: FlowGraphNode['data']['projectUnits']) { return formatDisplayValue(value,'Length',units) }
function formatValue(value: GraphValue, units?: FlowGraphNode['data']['projectUnits']): string {
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `${value.length} values`
  if ('quantityKind' in value) {
    const unit = unitsForKind(value.quantityKind).find(item => item.id === units?.[value.quantityKind] || item.label === units?.[value.quantityKind])?.id ?? value.unit
    return formatQuantity(value, unit)
  }
  if ('domainType' in value) return value.name
  if ('pierType' in value) return summarizePier(value, units)
  if ('capType' in value) return summarizeCap(value, units)
  return String(value)
}
function isPierCandidate(value: unknown): value is PierCandidate { return typeof value === 'object' && value !== null && 'pierType' in value && 'geometry' in value && 'heightM' in value }
function isPierCapCandidate(value:unknown):value is PierCapCandidate{return typeof value==='object'&&value!==null&&'capType'in value&&'geometry'in value&&'material'in value}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null }
function isFoundationCandidate(value:unknown):value is FoundationCandidate{return typeof value==='object'&&value!==null&&'foundationType'in value&&'geometry'in value&&'material'in value}
function isBearingCandidate(value:unknown):value is BearingCandidate{return typeof value==='object'&&value!==null&&'bearingType'in value&&'geometry'in value&&'stiffness'in value}
function isGirderCandidate(value:unknown):value is {id:string;girderType:string;geometry:Record<string,number>}{return typeof value==='object'&&value!==null&&'girderType'in value&&'geometry'in value}
function itemKey(item: unknown, index: number) { return isPierCandidate(item)||isPierCapCandidate(item)||isFoundationCandidate(item)||isBearingCandidate(item)||isGirderCandidate(item) ? item.id : `${index}-${typeof item}` }

