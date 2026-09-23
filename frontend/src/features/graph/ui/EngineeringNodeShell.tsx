import { Handle, Position } from '@xyflow/react'
import { Fragment } from 'react'
import type { GraphParameterValue, GraphValue } from '../domain/types'
import type { FlowGraphNode } from '../adapters/reactFlowAdapter'
import type { ProjectUnitPreferences } from '../domain/engineeringInputs'
import type { NodeDefinition, NodePortDefinition, ParameterDescriptor } from '../registry/nodeRegistry'
import { CANONICAL_UNITS, convertQuantity, formatQuantity, getUnit, quantityFromCanonical, toDisplayValue, unitsForKind } from '../domain/quantities'
import EditableNumericInput from './EditableNumericInput'
import { getNodeThemeForType } from '../domain/nodeVisualThemes'
import NodeHeader from './NodeHeader'
import NodeStatusIndicator from './NodeStatusIndicator'

export default function EngineeringNodeShell({ data, selected, definition }: { data: FlowGraphNode['data']; selected: boolean; definition: NodeDefinition }) {
  if (data.node.type === 'structural.abutment') return <AbutmentCompactNodeShell data={data} selected={selected} definition={definition} />
  if (data.node.type === 'structural.assembly') return <AssemblyNodeShell data={data} selected={selected} definition={definition} />
  const state = data.executionState === 'error' || data.executionError ? ' has-error' : data.executionState === 'success' ? ' has-success' : data.executionState === 'running' ? ' is-running' : ''
  const candidates = !data.isDirty && data.outputs?.candidates !== undefined ? data.outputs.candidates : undefined
  const candidateCount = Array.isArray(candidates) ? candidates.length : 0
  const displayedCandidateCount = candidates === undefined ? data.previewCandidateCount ?? candidateCount : candidateCount
  const generated = data.outputs?.generatedCombinations ?? data.previewGeneratedCombinations
  const invalid = data.outputs?.invalidCombinations ?? data.previewInvalidCombinations
  return <div className={`spn-graph-node spn-engineering-node${data.node.type === 'structural.assembly' ? ' spn-assembly-node' : ''}${data.node.type.startsWith('substructure.foundation.') ? ' foundation-palette' : ''}${data.node.type.startsWith('structural.girder.') ? ' girder-error-palette' : ''}${data.node.type === 'structural.superstructure' ? ' superstructure-error-palette' : ''} category-structural-family ${getNodeThemeForType(definition.category, data.node.type).className}${selected ? ' is-selected' : ''}${state}${data.isDirty ? ' is-dirty' : ''}`}>
    <NodeHeader definition={definition} type={data.node.type} />
    <div className="spn-engineering-inputs">
      {definition.inputs.map((port, index) => <Fragment key={port.id}>{port.group && port.group !== definition.inputs[index - 1]?.group && <div className="spn-engineering-group-heading">{port.group}</div>}<EngineeringInputRow key={`${port.id}:${data.projectUnitsKey}`} port={port} definition={definition} data={data} /></Fragment>)}
      {data.node.type === 'structural.superstructure' && <SuperstructureEdgeRow data={data} />}
    </div>
    {data.node.type.startsWith('substructure.foundation.piled') && <FoundationDerivedCanvas data={data} />}
    <div className="spn-engineering-outputs">
      {definition.outputs.map((port) => <div className="spn-engineering-output-row" key={port.id} title={portTooltip(port, data.projectUnits)}>
        <span className="spn-engineering-output-label">{port.label}</span>
        <span className="spn-engineering-output-value">{port.id === 'candidates' ? `${displayedCandidateCount} candidate${displayedCandidateCount === 1 ? '' : 's'}` : ''}</span>
        <Handle type="source" position={Position.Right} id={port.id} isConnectable title={portTooltip(port, data.projectUnits)} />
      </div>)}
    </div>
    {data.executionError && (data.node.type.startsWith('substructure.foundation.') || data.node.type.startsWith('substructure.bearing.')) && typeof generated==='number' ? <div className="spn-engineering-node-footer">{generated.toLocaleString()} raw combinations / limit 10,000</div> : typeof generated === 'number' && <div className="spn-engineering-node-footer">{generated} generated / {typeof invalid === 'number' ? invalid : 0} invalid / {displayedCandidateCount} valid</div>}
    {data.executionError && <div className="spn-graph-node-error-message" style={{ backgroundColor: data.node.type.startsWith('structural.girder.') ? '#ffffff' : data.node.type === 'structural.superstructure' ? '#fff1eb' : undefined }} title={data.executionError}>{data.executionError}</div>}
    <NodeStatusIndicator executionState={data.executionState} isDirty={data.isDirty} hasError={Boolean(data.executionError)} />
  </div>
}
function SuperstructureEdgeRow({data}:{data:FlowGraphNode['data']}) { const list=(data.isDirty?data.previewSuperstructureCandidates:data.outputs?.candidates??data.previewSuperstructureCandidates) as import('../domain/superstructureCandidates').SuperstructureCandidate[]|undefined; const candidate=Array.isArray(list)?list[0]:undefined; const source=data.connectedInputs?.girder?.value; const girder=Array.isArray(source)?source[0] as any:source as any; const W=numberInput(data,'deckWidth',15), n=numberInput(data,'girderCount',6), s=numberInput(data,'girderSpacing',2.5), btf=candidate?.girderTopFlangeWidth??(girder?.girderType==='STEEL'?girder?.geometry?.Btf:girder?.geometry?.tf); const e=typeof btf==='number'&&Number.isFinite(W)&&Number.isFinite(n)&&Number.isFinite(s)?(W-(n-1)*s-btf)/2:candidate?.clearEdgeCantileverLeft; const invalid=typeof e==='number'&&e<=0; const shown=typeof e==='number'?Number(toDisplayValue(e,'Length',data.projectUnits).toPrecision(10)).toString():'—'; return <div className='spn-engineering-derived spn-superstructure-edge'><span>Clear Edge Cantilever (e)</span><b>{shown}</b>{invalid&&<strong className='spn-graph-inspector-error'>ERROR: e yeterli !!!</strong>}</div> }
function numberInput(data:FlowGraphNode['data'],key:string,fallback:number){const v=data.connectedInputs?.[key]?.value;const item=Array.isArray(v)?v[0]:v;if(typeof item==='number')return item;if(typeof item==='object'&&item!==null&&'quantityKind'in item&&item.quantityKind==='length')return item.value;return Number((data.node.parameters[key+'Value']??fallback))}

function AbutmentNodeShell({ data, selected, definition }: { data: FlowGraphNode['data']; selected: boolean; definition: NodeDefinition }) {
  const fields = ['Back_wall_w','Bearing_sup_w','Front_w','Back_w','front_h','found_th','Onp_Amp','found_d']
  const raw = data.outputs?.candidates ?? data.previewValue, candidate = Array.isArray(raw) ? raw[0] as any : undefined, count = Array.isArray(raw) ? raw.length : data.previewCandidateCount ?? 0
  const field = (key: string) => <EngineeringInputRow key={key} port={definition.inputs.find(port => port.id === key)!} definition={definition} data={data} />
  const result = (label: string, value: unknown, unit = 'm') => <div className="spn-engineering-derived" key={label}><span>{label}</span><b>{typeof value === 'number' ? `${Number(value.toPrecision(8))} ${unit}` : '—'}</b></div>
  const status = candidate?.seismic?.status ?? 'INCOMPLETE'
  return <div className={`spn-graph-node spn-engineering-node spn-abutment-node category-abutment${selected ? ' is-selected' : ''}`}><header className="spn-graph-node-title"><span>Abutment</span><small>ABUTMENT</small></header><div className="spn-engineering-inputs"><div className="spn-engineering-group-heading">UPSTREAM INPUTS</div>{definition.inputs.map(port => <EngineeringInputRow key={port.id} port={port} definition={definition} data={data} />)}</div><div className="spn-abutment-section"><div className="spn-engineering-group-heading">ABUTMENT GEOMETRY</div>{fields.map(field)}</div><div className="spn-abutment-section"><div className="spn-engineering-group-heading">SEISMIC BLOCK</div>{field('seiU')}{result('sei_w', candidate?.seismic?.seiW)}{result('sei_w_clear', candidate?.seismic?.seiWClear)}<b className={`spn-abutment-status status-${String(status).toLowerCase()}`}>{status}</b></div><div className="spn-abutment-section"><div className="spn-engineering-group-heading">CALCULATED RESULTS</div>{result('found_w', candidate?.geometry?.foundW)}{result('found_d', candidate?.geometry?.found_d)}{result('total_h', candidate?.geometry?.totalH)}{result('foundation_area', candidate?.geometry?.foundationArea, 'm²')}{result('foundation_volume', candidate?.geometry?.foundationVolume, 'm³')}</div><div className="spn-abutment-section"><div className="spn-engineering-group-heading">FAMILY / RANGE</div>{result('Alternatives', count, '')}</div><div className="spn-engineering-outputs">{definition.outputs.map(port => <div className="spn-engineering-output-row" key={port.id}><span className="spn-engineering-output-label">{port.label}</span><span className="spn-engineering-output-value">{count} candidates</span><Handle type="source" position={Position.Right} id={port.id} isConnectable /></div>)}</div><div className="spn-graph-node-state">{data.executionState.toUpperCase()}</div></div>
}

export function AssemblyNodeShell({ data, selected, definition }: { data: FlowGraphNode['data']; selected: boolean; definition: NodeDefinition }) {
  const state = data.executionState === 'error' || data.executionError ? ' has-error' : data.executionState === 'success' ? ' has-success' : data.executionState === 'running' ? ' is-running' : ''
  const raw = data.outputs?.assembly ?? data.previewValue
  const count = Array.isArray(raw) ? raw.length : raw ? 1 : 0
  return <div className={`spn-graph-node spn-engineering-node spn-assembly-graph-node category-structural-family ${getNodeThemeForType(definition.category, data.node.type).className}${selected ? ' is-selected' : ''}${state}${data.isDirty ? ' is-dirty' : ''}`}>
    <NodeHeader definition={definition} type={data.node.type} showIcon={false} />
    <div className="spn-assembly-inputs spn-engineering-inputs">
      {definition.inputs.map(port => <EngineeringInputRow key={port.id} port={port} definition={definition} data={data} />)}
    </div>
    <div className="spn-assembly-centered-output">
      <span className="spn-engineering-output-label">Bridge Assembly</span>
      <span className="spn-engineering-output-value">{count} assembly</span>
      <Handle type="source" position={Position.Right} id="assembly" isConnectable title="Bridge Assembly" />
    </div>
    {data.executionError && <div className="spn-assembly-error-row" title={data.executionError}>{data.executionError}<span>ERROR</span></div>}
    <NodeStatusIndicator executionState={data.executionState} isDirty={data.isDirty} />
  </div>
}
void AbutmentNodeShell

function AbutmentCompactNodeShell({ data, selected, definition }: { data: FlowGraphNode['data']; selected: boolean; definition: NodeDefinition }) {
  const fields = ['Back_wall_w','Bearing_sup_w','Front_w','Back_w','front_h','found_th','Onp_Amp','found_d']
  const raw = data.outputs?.candidates ?? data.previewAbutmentCandidates ?? data.previewValue
  const candidate = Array.isArray(raw) ? raw[0] as { seismic?: { seiW?: number; status?: string; message?: string } } : undefined
  const count = Array.isArray(raw) ? raw.length : data.previewCandidateCount ?? 0
  const field = (key: string) => <EngineeringInputRow key={key} port={definition.inputs.find(port => port.id === key)!} definition={definition} data={data} />
  const status = candidate?.seismic?.status === 'VALID' ? 'NORMAL' : candidate?.seismic?.status ?? 'INCOMPLETE'
  return <div className={`spn-graph-node spn-engineering-node spn-abutment-node category-abutment${selected ? ' is-selected' : ''}`}><header className="spn-graph-node-title"><span>{definition.label}</span><small>ABUTMENT</small></header><div className="spn-engineering-inputs">{definition.inputs.slice(0, 3).map(port => <EngineeringInputRow key={port.id} port={port} definition={definition} data={data} />)}<div className="spn-engineering-group-heading">ABUTMENT GEOMETRY</div>{fields.map(field)}<div className="spn-engineering-group-heading">SEISMIC BLOCK</div>{field('sei_u')}<div className="spn-engineering-derived"><span>sei_w</span><b>{candidate?.seismic?.seiW === undefined ? '—' : `${candidate.seismic.seiW}`}</b></div><div className="spn-engineering-derived"><span>STATUS</span><b>{status}</b></div>{candidate?.seismic?.message && <div className="spn-graph-inspector-warning">{candidate.seismic.message}</div>}</div><div className="spn-engineering-outputs">{definition.outputs.map(port => <div className="spn-engineering-output-row" key={port.id}><span className="spn-engineering-output-label">{port.label}</span><span className="spn-engineering-output-value">{count} candidates</span><Handle type="source" position={Position.Right} id={port.id} isConnectable /></div>)}</div><div className="spn-graph-node-state">{data.executionState.toUpperCase()}</div></div>
}

function FoundationDerivedCanvas({data}:{data:FlowGraphNode['data']}){
  const candidates=data.isDirty?data.previewFoundationCandidates:data.outputs?.candidates??data.previewFoundationCandidates
  const list=Array.isArray(candidates)?candidates.filter((item):item is import('../domain/types').FoundationCandidate=>typeof item==='object'&&item!==null&&'foundationType'in item):[]
  const derived=(axis:'Lx'|'Ly')=>{const values=list.map(item=>item.foundationType==='PILED'?Number((item.geometry.derived as Readonly<Record<string,number>>)[axis]):Number(item.geometry[axis])).filter(Number.isFinite);if(!values.length)return 'Ã¢â‚¬â€';const min=Math.min(...values),max=Math.max(...values);return min===max?`${min.toFixed(2)} m`:`${min.toFixed(2)}Ã¢â‚¬Â¦${max.toFixed(2)} m`}
  return <div className="spn-engineering-derived"><strong>Derived Geometry</strong><span>Lx <b>{derived('Lx')}</b></span><span>Ly <b>{derived('Ly')}</b></span></div>
}

function EngineeringInputRow({ port, definition, data }: { port: NodePortDefinition; definition: NodeDefinition; data: FlowGraphNode['data'] }) {
  const node = data.node
  const connection = data.connectedInputs?.[port.id]
  const descriptors = definition.parameterSchema.filter(parameter => parameter.inputPortId === port.id && !(isUnitAwareNode(data.node.type) && parameter.key.endsWith('Unit')))
  const valueParameter = descriptors.find(parameter => parameter.dataType === 'number' || parameter.dataType === 'integer')
  const unitParameter = definition.parameterSchema.find(parameter => parameter.inputPortId === port.id && parameter.key.endsWith('Unit'))
  const displayUnit = unitParameter ? String(node.parameters[unitParameter.key] ?? '') : ''
  const value = connection?.value
  const editable = !connection && valueParameter
  const localText = port.id === 'material' ? String(node.parameters.materialId ?? (port.type === 'structuralSteelMaterial' ? 'S355' : 'C40/50')) : localValue(port, descriptors, node.parameters, displayUnit, data.projectUnits, node.type)
  const externalText = connection?.range ? formatRange(connection.range, data.projectUnits, port.quantityKind) : value === undefined ? connection?.error || (data.executionState === 'error' && data.executionError) ? 'Error' : 'Resolving...' : port.id === 'girder' ? girderLabel(value) : port.id === 'superstructure' ? candidateLabel(value, 'Superstructure') : port.id === 'bearing' ? candidateLabel(value, 'Bearing') : formatValue(value, port, data.projectUnits)
  const displayedLocal = typeof node.parameters[valueParameter?.key ?? ''] === 'number' && isUnitAwareNode(node.type) && port.quantityKind ? toDisplayValue(getUnit(displayUnit)?.toCanonical(Number(node.parameters[valueParameter!.key])) ?? Number(node.parameters[valueParameter!.key]), dimensionForKind(port.quantityKind), data.projectUnits) : node.parameters[valueParameter?.key ?? '']
  return <div className={`spn-engineering-input-row${connection ? ' is-connected' : ''}${connection?.error ? ' has-input-error' : ''}`} title={connection?.error ?? portTooltip(port, data.projectUnits)}>
    <Handle type="target" position={Position.Left} id={port.id} isConnectable title={portTooltip(port, data.projectUnits)} />
    <span className="spn-engineering-input-label" title={port.label}>{port.label}</span>
    {connection ? <span className="spn-engineering-input-value" title={connection.error ?? externalText}><strong>{externalText}</strong></span> : editable && valueParameter ? <span className="spn-engineering-local-value"><EditableNumericInput value={displayedLocal} integer={valueParameter.dataType === 'integer'} ariaLabel={`${port.label} local default`} onCommit={next => data.onParameterChange(node.id, valueParameter.key, toStoredValue(next, displayUnit, data.projectUnits, port.quantityKind, node.type))} /></span> : <span className="spn-engineering-input-value" title={localText}>{localText}</span>}
  </div>
}
function girderLabel(value: GraphValue) { const item=Array.isArray(value)?value[0]:value; return typeof item==='object'&&item!==null&&'girderType' in item ? `${item.girderType==='PRECAST'?'Precast':'Steel'} Girder` : 'Not connected' }
function candidateLabel(value: GraphValue, label: string) { const item=Array.isArray(value)?value[0]:value; return typeof item==='object'&&item!==null&&'id' in item ? `${label} candidate` : 'Not connected' }
function formatRange(range: NonNullable<NonNullable<FlowGraphNode['data']['connectedInputs']>[string]['range']>, projectUnits?: ProjectUnitPreferences, kind?: import('../domain/quantities').QuantityKind) { const stiffness=kind==='translationalStiffness'||kind==='rotationalStiffness'; const show=(value?:number)=>value===undefined?'-':stiffness?value.toFixed(2):Number(toDisplayValue(value,'Length',projectUnits).toPrecision(10)).toString(); const unit=kind==='translationalStiffness'?' kN/m':kind==='rotationalStiffness'?' kNm/rad':''; return range.mode==='range'?`${show(range.min)}\u2026${show(range.max)}${unit}${range.delta===undefined?'':` / ${show(range.delta)}`}`:`${show(range.value)}${unit}` }

function localValue(port: NodePortDefinition, descriptors: ParameterDescriptor[], parameters: Record<string, GraphParameterValue>, unit: string, projectUnits: FlowGraphNode['data']['projectUnits'], nodeType: string) {
  const valueParameter = descriptors.find(parameter => parameter.dataType === 'number' || parameter.dataType === 'integer')
  if (valueParameter && typeof parameters[valueParameter.key] === 'number') {
    const value = parameters[valueParameter.key] as number
    if (port.quantityKind && isUnitAwareNode(nodeType)) return Number(toDisplayValue(getUnit(unit)?.toCanonical(value) ?? value, dimensionForKind(port.quantityKind), projectUnits).toPrecision(10)).toString()
    return Number(value.toPrecision(10)).toString()
  }
  const selection = descriptors.find(parameter => parameter.dataType === 'select')
  if (selection) return String(parameters[selection.key] ?? 'Not selected')
  return '-'
}
function isUnitAwareNode(type: string) { return type === 'structural.superstructure' || type === 'structural.span_arrangement' || type === 'structural.girder.precast' || type === 'structural.girder.steel' || type === 'structural.abutment' || type.startsWith('substructure.') }
function toStoredValue(value: number | string, storedUnit: string, projectUnits: FlowGraphNode['data']['projectUnits'], kind: import('../domain/quantities').QuantityKind | undefined, nodeType: string) { const numeric=Number(value); if (!kind || !isUnitAwareNode(nodeType)) return numeric; const dimension=dimensionForKind(kind); const source=dimension==='Translational Stiffness' ? `${projectUnits?.force ?? 'kN'}/${projectUnits?.length ?? 'm'}` : dimension==='Rotational Stiffness' ? `${projectUnits?.moment ?? 'kNm'}/rad` : kind==='length' ? projectUnits?.length ?? 'm' : storedUnit; return source===storedUnit ? numeric : convertQuantity(numeric, source, storedUnit) }
function dimensionForKind(kind: import('../domain/quantities').QuantityKind): import('../domain/quantities').PhysicalDimension { return ({length:'Length',area:'Area',volume:'Volume',length4:'Length^4',force:'Force',moment:'Moment',stress:'Stress',mass:'Mass',temperature:'Absolute Temperature',temperatureDifference:'Temperature Difference',translationalStiffness:'Translational Stiffness',rotationalStiffness:'Rotational Stiffness'} as Record<string, import('../domain/quantities').PhysicalDimension>)[kind] ?? 'Dimensionless' }

function portTooltip(port: NodePortDefinition, projectUnits?: FlowGraphNode['data']['projectUnits']) {
  if (port.type === 'length[]') {
    const pref = projectUnits?.length ?? 'm'
    const unit = unitsForKind('length').find(item => item.id === pref || item.label === pref)?.label ?? 'm'
    return `${port.label}\nType: Length or Length[]\nAccepted: Quantity<Length>, Quantity<Length>[], Number, number[]\nDefault Unit: ${unit}`
  }
  const kind=port.quantityKind
  if (kind) { const unit = unitsForKind(kind).find(item => item.id === projectUnits?.[kind] || item.label === projectUnits?.[kind]) ?? unitsForKind(kind).find(item=>item.id===CANONICAL_UNITS[kind]) ?? unitsForKind(kind)[0];return `${port.label}\nType: ${kind}\nAccepted: Quantity<${kind}>, Quantity<${kind}>[], Number, number[]\nDisplay unit: ${unit?.label ?? ''}` }
  if (port.type === 'concreteMaterial') return `${port.label}\nType: ConcreteMaterial\nAccepted: ConcreteMaterial`
  if (port.type === 'integer') return `${port.label}\nType: Integer\nAccepted: Integer\n${port.description ?? ''}`
  return `${port.label}\nType: ${port.type}`
}

function formatValue(value: GraphValue, port: NodePortDefinition, projectUnits?: FlowGraphNode['data']['projectUnits']): string {
  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    const kind=port.quantityKind
    if (kind && value.every(item => typeof item === 'object' && item !== null && 'quantityKind' in item)) {
      const quantities = value as import('../domain/quantities').EngineeringQuantity[]
      const unit = unitsForKind(kind).find(item => item.id === projectUnits?.[kind] || item.label === projectUnits?.[kind])?.id ?? quantities[0]?.unit
      if (!unit) return `${value.length} values`
      const values = quantities.map(item => item.value), min = Math.min(...values), max = Math.max(...values), label = getUnit(unit)?.label ?? unit
      const shown = (number: number) => quantityFromCanonical(number, kind, unit).toFixed(2)
      return min === max ? `${shown(min)} ${label}` : `${shown(min)}Ã¢â‚¬Â¦${shown(max)} ${label}`
    }
    const first = value[0]
    return `${formatValue(first as GraphValue, port, projectUnits)}${value.length > 1 ? ` ... (${value.length} values)` : ''}`
  }
  if (typeof value === 'number') return port.type === 'length[]' ? `${value.toFixed(2)} ${unitsForKind('length').find(unit => unit.id === (projectUnits?.length ?? 'm'))?.label ?? 'm'}` : String(value)
  if (typeof value === 'object' && value !== null && 'quantityKind' in value) {
    if (port.quantityKind === 'translationalStiffness' || port.quantityKind === 'rotationalStiffness') return Number(toDisplayValue(value.value, dimensionForKind(value.quantityKind), projectUnits).toPrecision(10)).toString()
    const preferred = unitsForKind(value.quantityKind).find(unit => unit.id === projectUnits?.[value.quantityKind] || unit.label === projectUnits?.[value.quantityKind])
    return formatQuantity(value, preferred?.id ?? value.unit)
  }
  if (typeof value === 'object' && value !== null && 'domainType' in value) return value.name
  return String(value)
}

