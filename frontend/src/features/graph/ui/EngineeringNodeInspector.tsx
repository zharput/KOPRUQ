import type { GraphExecutionState, GraphValue, SpanovaConnection, SpanovaNode } from '../domain/types'
import type { FlowGraphNode } from '../adapters/reactFlowAdapter'
import { convertQuantity, getUnit, toDisplayValue, type QuantityKind } from '../domain/quantities'
import type { ProjectUnitPreferences } from '../domain/engineeringInputs'
import { getNodeDefinition, previewDesignOutput, previewBearingStatistics, previewFoundationStatistics, previewPierCapStatistics } from '../registry/nodeRegistry'
import { useState } from 'react'
import EditableNumericInput from './EditableNumericInput'
import { EngineeringSchematic } from './EngineeringSchematics'
import MaterialSelector from './MaterialSelector'

type Props = {
  node: SpanovaNode
  states: Record<string, GraphExecutionState>
  errors: Record<string, string>
  outputs: Record<string, Record<string, GraphValue>>
  resolvedInputs: Record<string, Record<string, GraphValue>>
  previewInputs: Record<string, { sourceName: string; value?: GraphValue; error?: string; range?: { mode: 'single' | 'range'; value?: number; min?: number; max?: number; delta?: number } }>
  connections: SpanovaConnection[]
  projectUnits?: ProjectUnitPreferences
  onNodeChange: (id: string, patch: Partial<SpanovaNode>) => void
  onParameterChange: (id: string, key: string, value: number | boolean | string) => void
}

export default function EngineeringNodeInspector(props: Props) {
  const { node, states, errors, outputs, resolvedInputs, previewInputs, connections, projectUnits, onNodeChange, onParameterChange } = props
  const definition = getNodeDefinition(node.type)
  const schema = definition?.engineeringInspector
  if (!definition || !schema) return <p role="alert">Engineering Inspector metadata is unavailable.</p>
  const inputs = Object.fromEntries(Object.entries(previewInputs).flatMap(([key, item]) => item.value === undefined ? [] : [[key, item.value]]))
  let candidateValue: GraphValue | undefined
  try { candidateValue = previewDesignOutput(node, 'candidates', inputs) ?? outputs[node.id]?.candidates } catch { candidateValue = outputs[node.id]?.candidates }
  const candidates = Array.isArray(candidateValue) ? candidateValue : []
  let stats: { generatedCombinations?: number; invalidCombinations?: number } | undefined
  try {
    if (schema.schematic === 'pier-cap') stats = previewPierCapStatistics(node, inputs, candidates.length)
    else if (schema.schematic === 'foundation') stats = previewFoundationStatistics(node, inputs, candidates.length)
    else if (schema.schematic === 'bearing') stats = previewBearingStatistics(node, inputs, candidates.length)
    else stats = { generatedCombinations: Number(outputs[node.id]?.generatedCombinations ?? candidates.length), invalidCombinations: Number(outputs[node.id]?.invalidCombinations ?? 0) }
  } catch { /* validation state below already reports the failure */ }
  const connected = new Set(connections.filter(edge => edge.targetNodeId === node.id).map(edge => edge.targetPortId))
  const inputById = new Map(definition.inputs.map(input => [input.id, input]))
  const orderedInputs = schema.parameterOrder.map(id => inputById.get(id)).filter((item): item is NonNullable<typeof item> => !!item)
  const state = states[node.id] ?? 'idle'
  if (schema.schematic === 'abutment') return <AbutmentInspector node={node} candidate={candidates[0] as import('../domain/abutmentCandidates').AbutmentCandidate | undefined} connected={connected} previewInputs={previewInputs} projectUnits={projectUnits} onParameterChange={onParameterChange} onNodeChange={onNodeChange} errors={errors[node.id]} />
  return <div className="spn-graph-inspector spn-engineering-inspector">
    <section className="spn-engineering-general"><h3>GENERAL</h3><label>Name<input className="spn-input" value={node.name} onChange={event => onNodeChange(node.id, { name: event.target.value })} /></label><div className="spn-graph-inspector-row"><span>Type</span><strong>{definition.label}</strong></div>{errors[node.id] && <p className="spn-graph-inspector-error">{errors[node.id]}</p>}</section>
    <section className="spn-engineering-type"><h3>TYPE / SCHEMATIC</h3><EngineeringSchematic schema={schema} node={node} candidates={candidates} previewInputs={previewInputs} connections={connections} projectUnits={projectUnits} /></section>
    <section className="spn-engineering-parameters"><h3>PARAMETERS</h3>{schema.schematic === 'span-arrangement' && <><div className="spn-engineering-parameter"><span className="spn-engineering-parameter-label">Mode</span><div className="spn-engineering-controls"><ParameterControl node={node} descriptor={definition.parameterSchema.find(item => item.key === 'mode')!} projectUnits={projectUnits} onChange={onParameterChange} /></div></div><div className="spn-engineering-parameter"><span className="spn-engineering-parameter-label">Generation Limit</span><div className="spn-engineering-controls"><ParameterControl node={node} descriptor={definition.parameterSchema.find(item => item.key === 'generationLimit')!} projectUnits={projectUnits} onChange={onParameterChange} /></div></div></>}{orderedInputs.map(input => {
      const descriptors = definition.parameterSchema.filter(item => item.inputPortId === input.id && !(isUnitAwareNode(node.type) && item.key.endsWith('Unit')))
      const resolved = resolvedInputs[node.id]?.[input.id] ?? previewInputs[input.id]?.value
      const isConnected = connected.has(input.id)
      return <div className="spn-engineering-parameter" key={input.id}>
        <span className="spn-engineering-parameter-label">{input.id === 'material' ? 'Material' : input.label}</span>
        {isConnected && input.id === 'material'
          ? <div className="spn-engineering-controls"><MaterialSelector steel={node.type.endsWith('.steel')} value={resolved && typeof resolved === 'object' && 'id' in resolved ? String(resolved.id) : String(node.parameters.materialId ?? '')} onChange={value => { const edge = connections.find(item => item.targetNodeId === node.id && item.targetPortId === 'material'); onParameterChange(edge?.sourceNodeId ?? node.id, 'materialId', value) }} /></div>
          : isConnected
          ? <div className="spn-engineering-connected"><strong>{resolved === undefined ? 'Connected' : connectionRange(previewInputs[input.id]?.range, projectUnits) ?? present(resolved, projectUnits)}</strong></div>
          : <div className="spn-engineering-controls">{input.id === 'material' ? <MaterialSelector steel={node.type.endsWith('.steel')} value={String(node.parameters.materialId ?? (node.type.endsWith('.steel') ? 'S355' : 'C40/50'))} onChange={value => onParameterChange(node.id, 'materialId', value)} /> : descriptors.map(descriptor => <ParameterControl key={descriptor.key} node={node} descriptor={descriptor} projectUnits={projectUnits} onChange={onParameterChange} />)}</div>}
      </div>
    })}</section>
    <section className="spn-engineering-family"><h3>FAMILY</h3><div className="spn-graph-inspector-row"><span>Candidate Count</span><strong>{candidates.length}</strong></div><div className="spn-graph-inspector-row"><span>Valid</span><strong>{candidates.length}</strong></div><div className="spn-graph-inspector-row"><span>Invalid</span><strong>{stats?.invalidCombinations ?? 0}</strong></div><div className="spn-graph-inspector-row"><span>Validation</span><strong className={`state-${errors[node.id] ? 'error' : state}`}>{errors[node.id] ? 'FAILED' : candidates.length ? 'VALID' : 'NO VALID CANDIDATES'}</strong></div></section>
  </div>
}

function AbutmentInspector({ node, candidate, connected, previewInputs, projectUnits, onParameterChange, onNodeChange, errors }: { node: SpanovaNode; candidate?: import('../domain/abutmentCandidates').AbutmentCandidate; connected: Set<string>; previewInputs: Props['previewInputs']; projectUnits?: ProjectUnitPreferences; onParameterChange: Props['onParameterChange']; onNodeChange: Props['onNodeChange']; errors?: string }) {
  const upstream = candidate?.upstream
  const calculated = candidate?.geometry
  const manual = ['Back_wall_w','Bearing_sup_w','Front_w','Back_w','front_h','found_th','Onp_Amp','found_d']
  const display = (value: number | undefined, unit = 'm') => value === undefined ? '—' : `${Number(value.toPrecision(10))} ${unit}`
  const source = (port: string) => previewInputs[port]?.sourceName ?? (connected.has(port) ? 'Connected source' : 'Not connected')
  const row = (label: string, value: string, extra?: string) => <div className="spn-graph-inspector-row" key={label}><span>{label}{extra && <small> · {extra}</small>}</span><strong>{value}</strong></div>
  return <div className="spn-graph-inspector spn-engineering-inspector">
    <section className="spn-engineering-general"><h3>GENERAL</h3><label>Name<input className="spn-input" value={node.name} onChange={event => onNodeChange(node.id, { name: event.target.value })} /></label><div className="spn-graph-inspector-row"><span>Type</span><strong>Abutment</strong></div>{errors && <p className="spn-graph-inspector-error">{errors}</p>}</section>
    <section><h3>UPSTREAM INPUTS</h3>{row('girder_h', display(upstream?.girderH), source('girder'))}{row('girder_a', display(upstream?.girderA), source('superstructure'))}{row('girder_e', display(upstream?.girderE), source('superstructure'))}{row('girder_count', upstream ? String(upstream.girderCount) : 'Not connected', source('superstructure'))}{row('girder_bottom_flange_w', display(upstream?.girderBottomFlangeW), source('girder'))}{row('deck_h', display(upstream?.deckH), source('superstructure'))}{row('plt_w', display(upstream?.deckW), source('superstructure'))}{row('bea_h', display(upstream?.bearingH), source('bearing'))}</section>
    <section><h3>ABUTMENT GEOMETRY</h3>{manual.map(key => <label className="spn-engineering-parameter" key={key}><span className="spn-engineering-parameter-label">{key}</span><EditableNumericInput value={displayParameter(node, key, projectUnits)} disabled={connected.has(key)} ariaLabel={key} onCommit={value => onParameterChange(node.id, `${key}Value`, storeParameter(node, key, Number(value), projectUnits))} /></label>)}</section>
    <section><h3>SEISMIC BLOCK</h3>{<label className="spn-engineering-parameter"><span className="spn-engineering-parameter-label">sei_u</span><EditableNumericInput value={displayParameter(node, 'sei_u', projectUnits)} disabled={connected.has('sei_u')} ariaLabel="sei_u" onCommit={value => onParameterChange(node.id, 'sei_uValue', storeParameter(node, 'sei_u', Number(value), projectUnits))} /></label>}{row('sei_w', display(candidate?.seismic.seiW))}{row('sei_w_clear', display(candidate?.seismic.seiWClear))}{row('Status', candidate?.seismic.status ?? 'INCOMPLETE')}{candidate?.seismic.message && <p className={candidate.seismic.status === 'ERROR' ? 'spn-graph-inspector-error' : 'spn-graph-inspector-warning'}>{candidate.seismic.message}</p>}</section>
    <section><h3>CALCULATED RESULTS</h3>{row('found_w', display(calculated?.foundW as number))}{row('found_d', display(calculated?.found_d as number))}{row('total_h', display(calculated?.totalH as number))}{row('abutment_body_d', display(calculated?.abutmentBodyD as number))}{row('foundation_left_offset', display(calculated?.foundationLeftOffset as number))}{row('foundation_right_offset', display(calculated?.foundationRightOffset as number))}{row('foundation_area', display(calculated?.foundationArea as number, 'm²'))}{row('foundation_volume', display(calculated?.foundationVolume as number, 'm³'))}</section>
  </div>
}

function displayParameter(node: SpanovaNode, key: string, projectUnits?: ProjectUnitPreferences) { const unit = String(node.parameters[`${key}Unit`] ?? 'm'); const value = node.parameters[`${key}Value`]; return typeof value === 'number' ? toDisplayValue(getUnit(unit)?.toCanonical(value) ?? value, 'Length', projectUnits) : value }
function storeParameter(node: SpanovaNode, key: string, value: number, projectUnits?: ProjectUnitPreferences) { const unit = String(node.parameters[`${key}Unit`] ?? 'm'); const source = projectUnits?.length ?? 'm'; return source === unit ? value : convertQuantity(value, source, unit) }
function ParameterControl({ node, descriptor, projectUnits, onChange }: { node: SpanovaNode; descriptor: NonNullable<ReturnType<typeof getNodeDefinition>>['parameterSchema'][number]; projectUnits?: ProjectUnitPreferences; onChange: Props['onParameterChange'] }) {
  const label = descriptor.label.replace(/ local default$/i, '').replace(/ unit$/i, ' unit')
  if (descriptor.dataType === 'select') return <select className="spn-input" aria-label={label} value={String(node.parameters[descriptor.key] ?? descriptor.options?.[0]?.value ?? '')} disabled={!descriptor.options?.length} onChange={event => {
    const nextUnit = event.target.value
    if (descriptor.key.endsWith('Unit')) {
      const valueKey = descriptor.key.slice(0, -4) + 'Value'
      const currentUnit = String(node.parameters[descriptor.key] ?? nextUnit)
      const currentValue = node.parameters[valueKey]
      const from = getUnit(currentUnit), to = getUnit(nextUnit)
      if (typeof currentValue === 'number' && from && to && from.kind === to.kind) onChange(node.id, valueKey, convertQuantity(currentValue, currentUnit, nextUnit))
    }
    onChange(node.id, descriptor.key, nextUnit)
  }}><option value="" disabled>Select</option>{descriptor.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
  if (descriptor.dataType === 'boolean') return <input type="checkbox" aria-label={label} checked={Boolean(node.parameters[descriptor.key])} onChange={event => onChange(node.id, descriptor.key, event.target.checked)} />
  if (descriptor.dataType === 'string') return <input className="spn-input" aria-label={label} value={String(node.parameters[descriptor.key] ?? '')} onChange={event => onChange(node.id, descriptor.key, event.target.value)} />
  const isLength = descriptor.key.endsWith('Value') && isUnitAwareNode(node.type) && descriptor.key !== 'girderCount'
  const unitKey = descriptor.key.replace(/Value$/, 'Unit')
  const storedUnit = String(node.parameters[unitKey] ?? 'm')
  const storedKind = getUnit(storedUnit)?.kind
  const shown = isLength && storedKind && typeof node.parameters[descriptor.key] === 'number' ? toDisplayValue(getUnit(storedUnit)!.toCanonical(Number(node.parameters[descriptor.key])), dimensionForKind(storedKind), projectUnits) : node.parameters[descriptor.key]
  const sourceUnit = storedKind === 'translationalStiffness' ? `${projectUnits?.force ?? 'kN'}/${projectUnits?.length ?? 'm'}` : storedKind === 'rotationalStiffness' ? `${projectUnits?.moment ?? 'kNm'}/rad` : storedKind === 'length' ? projectUnits?.length ?? 'm' : storedUnit
  return <EditableNumericInput value={shown} integer={descriptor.dataType === 'integer'} ariaLabel={label} onCommit={value => onChange(node.id, descriptor.key, isLength && sourceUnit !== storedUnit ? convertQuantity(Number(value), sourceUnit, storedUnit) : value)} />
}

function present(value: GraphValue, projectUnits?: ProjectUnitPreferences): string {
  if (Array.isArray(value)) return `${value.slice(0, 3).map(item => typeof item === 'object' && item !== null && 'quantityKind' in item ? displayQuantity(item, projectUnits) : String(item)).join(', ')}${value.length > 3 ? ` … (${value.length} values)` : ''}`
  if (typeof value === 'object' && value !== null && 'quantityKind' in value) return displayQuantity(value, projectUnits)
  if (typeof value === 'object' && value !== null && 'domainType' in value) return value.name
  return String(value)
}
function connectionRange(range: NonNullable<NonNullable<FlowGraphNode['data']['connectedInputs']>[string]['range']> | undefined, projectUnits?: ProjectUnitPreferences) { if (!range) return undefined; const show=(value?:number)=>value===undefined?'-':Number(toDisplayValue(value,'Length',projectUnits).toPrecision(10)).toString(); return range.mode==='range'?`Min ${show(range.min)}   Max ${show(range.max)}   Delta ${show(range.delta)}`:`Value ${show(range.value)}` }
function displayQuantity(value: { quantityKind: QuantityKind; value: number; unit: string }, projectUnits?: ProjectUnitPreferences) { const unit = getUnit(value.unit); return unit ? Number(toDisplayValue(value.value, dimensionForKind(value.quantityKind), projectUnits).toPrecision(10)).toString() : String(value.value) }
function isUnitAwareNode(type: string) { return type === 'structural.superstructure' || type === 'structural.span_arrangement' || type === 'structural.girder.precast' || type === 'structural.girder.steel' || type.startsWith('substructure.') }
function dimensionForKind(kind: QuantityKind): import('../domain/quantities').PhysicalDimension { return ({length:'Length',area:'Area',volume:'Volume',length4:'Length^4',force:'Force',moment:'Moment',stress:'Stress',mass:'Mass',temperature:'Absolute Temperature',temperatureDifference:'Temperature Difference',translationalStiffness:'Translational Stiffness',rotationalStiffness:'Rotational Stiffness'} as Record<string, import('../domain/quantities').PhysicalDimension>)[kind] ?? 'Dimensionless' }
type CandidateRow = Record<string, unknown>
export function CandidateTable({ nodeType, candidates, projectUnits }: { nodeType: string; candidates: GraphValue[]; projectUnits?: ProjectUnitPreferences }) {
  const [selected, setSelected] = useState<string>()
  const rows = candidates.filter(item => typeof item === 'object' && item !== null && !Array.isArray(item)) as unknown as CandidateRow[]
  const columns = candidateColumns(nodeType)
  return <div className="spn-candidate-table-section"><h4>CANDIDATE TABLE</h4>{!rows.length ? <p className="spn-graph-inspector-muted">No candidates available.</p> : <div className="spn-candidate-table-scroll"><table className="spn-candidate-table"><thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((candidate, index) => { const id=String(candidate.id ?? index+1); return <tr key={id} className={selected===id?'is-selected':''} onClick={() => setSelected(id)}>{columns.map(column => <td key={column.key} className={column.numeric?'is-numeric':''}>{column.value(candidate, projectUnits)}</td>)}</tr> })}</tbody></table></div>}{selected && <small className="spn-candidate-selection">Selected candidate: {selected}</small>}</div>
}
type CandidateColumn = { key: string; label: string; numeric?: boolean; value: (candidate: CandidateRow, units?: ProjectUnitPreferences) => string }
const candidateColumns = (type: string): CandidateColumn[] => {
  const length=(value: unknown, units?: ProjectUnitPreferences) => typeof value === 'number' ? Number(toDisplayValue(value,'Length',units).toPrecision(10)).toString() : '-'
  const field=(key: string, label: string, numeric=true): CandidateColumn => ({ key, label, numeric, value: (candidate, units) => { const value=candidate[key] ?? (candidate.geometry as CandidateRow|undefined)?.[key]; return typeof value === 'object' ? Object.entries(value as Record<string, unknown>).filter(([,item]) => typeof item === 'number').map(([name,item]) => `${name}=${length(item, units)}`).join(' ') || '-' : length(value, units) } })
  const id: CandidateColumn={key:'id',label:'Candidate ID',value:c=>String(c.id??'-')}
  const status: CandidateColumn={key:'status',label:'Status',value:c=>String(c.validationStatus??'VALID')}
  if (type === 'structural.superstructure') return [id,{key:'girderType',label:'Girder Type',value:c=>String(c.girderType??'-')},{key:'girderCandidateId',label:'Girder Candidate ID',value:c=>String(c.girderCandidateId??'-')},field('deckWidth','Deck Width'),field('girderCount','Girder Count'),field('girderSpacing','Girder Spacing'),field('deckSlabThickness','Deck Slab Thickness'),field('girderTopFlangeWidth','Top Flange Width'),field('clearEdgeCantileverLeft','Clear Edge Cantilever (e)'),status]
  if (type === 'structural.girder.precast') return [id,field('H','H'),field('tf','Top Flange Width'),field('bf','Bottom Flange Width'),field('w','Web Width'),field('th1','Top Cap Thickness'),field('th2','Top Taper Thickness'),field('bh1','Bottom Block Thickness'),field('bh2','Bottom Taper Thickness'),{key:'material',label:'Concrete Material',value:c=>String((c.material as CandidateRow|undefined)?.name??'-')},status]
  if (type === 'structural.girder.steel') return [id,field('H','H'),field('Btf','Top Flange Width'),field('ttf','Top Flange Thickness'),field('Bbf','Bottom Flange Width'),field('tbf','Bottom Flange Thickness'),field('tw','Web Thickness'),{key:'material',label:'Structural Steel',value:c=>String((c.material as CandidateRow|undefined)?.name??'-')},status]
  if (type.startsWith('substructure.pier.')) return [id,{key:'pierType',label:'Pier Type',value:c=>String(c.pierType??'-')},field('B','B'),field('D','D'),field('heightM','H'),status]
  if (type.startsWith('substructure.pier-cap.')) return [id,{key:'capType',label:'Cap Type',value:c=>String(c.capType??'-')},field('geometry','Geometry',false),status]
  if (type.startsWith('substructure.foundation.')) return [id,{key:'foundationType',label:'Foundation Type',value:c=>String(c.foundationType??'-')},field('geometry','Geometry',false),status]
  if (type.startsWith('substructure.bearing.')) return [id,{key:'bearingType',label:'Bearing Type',value:c=>String(c.bearingType??'-')},field('geometry','Geometry',false),field('stiffness','Stiffness',false),status]
  return [id,status]
}
