import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { GraphParameterValue, KopruqNode } from '../domain/types'
import type { FlowGraphNode } from '../adapters/reactFlowAdapter'
import { getNodeDefinition } from '../registry/nodeRegistry'
import { convertQuantity, formatDisplayValue, getUnit, quantityFromCanonical, toDisplayValue, type PhysicalDimension, type QuantityKind } from '../domain/quantities'
import type { GraphValue } from '../domain/types'
import EngineeringNodeShell, { AssemblyNodeShell } from './EngineeringNodeShell'
import EditableNumericInput from './EditableNumericInput'
import ListOutputNode from './ListOutputNode'
import { EN_CONCRETE_CLASS_IDS, STRUCTURAL_STEEL_OPTIONS } from '../../materials/model/materialCatalog'
import CanvasSelect from './CanvasSelect'
import { getNodeThemeForType } from '../domain/nodeVisualThemes'
import NodeHeader from './NodeHeader'
import NodeStatusIndicator from './NodeStatusIndicator'

export default function BaseNode({ data, selected }: NodeProps<FlowGraphNode>) {
  const node = data.node, definition = getNodeDefinition(node.type)
  if (!definition) return <div className="spn-graph-node spn-graph-node-error">Unknown node</div>
  if (node.type === 'structural.assembly') return <AssemblyNodeShell data={data} selected={selected} definition={definition} />
  if (definition.category === 'SUBSTRUCTURE' || definition.category === 'STRUCTURAL_FAMILY') return <EngineeringNodeShell data={data} selected={selected} definition={definition} />
  if (node.type === 'output.list') return <ListOutputNode data={data} selected={selected} />
  const stateClass = data.isDirty ? ' is-dirty' : data.executionState === 'error' || data.executionError ? ' has-error' : data.executionState === 'success' ? ' has-success' : data.executionState === 'running' ? ' is-running' : ''
  if (node.type === 'input.notes') return <div className={`spn-graph-node spn-graph-notes-node${selected ? ' is-selected' : ''}`}><NodeHeader definition={definition} type={node.type} /><textarea className="spn-graph-notes-editor nodrag nowheel" aria-label="Notes" value={String(node.parameters.text ?? '')} placeholder="Write a note..." onChange={event => data.onParameterChange(node.id, 'text', event.target.value)} /></div>
  return <div className={`spn-graph-node ${getNodeThemeForType(definition.category, node.type).className}${node.type === 'material.concrete' ? ' spn-graph-material-node' : ''}${node.type === 'input.range' ? ' spn-graph-range-node' : ''}${selected ? ' is-selected' : ''}${stateClass}`}>
    <NodeHeader definition={definition} type={node.type} label={node.type === 'input.length' ? `${definition.label} (${data.projectUnits?.length ?? 'm'})` : undefined} />
    <div className="spn-graph-node-content" style={{ minHeight: Math.max(48, definition.inputs.length * 25 + 30, definition.outputs.length * 25 + 30) + (node.type === 'input.range' ? 34 : 0) }}>
      {definition.category === 'INPUT' && node.type !== 'input.range' && node.type !== 'input.integer-list' && <InlineValue nodeId={node.id} type={node.type} value={node.parameters.value} onChange={data.onParameterChange} />}
      {node.type === 'input.length' && <LengthNodeEditor node={node} units={data.projectUnits} onParameterChange={data.onParameterChange} />}
      {node.type === 'input.integer-list' && <div className="spn-graph-node-range" aria-label="Integer list values">{String(node.parameters.valuesText ?? '')}</div>}
      {node.type === 'material.concrete' && <div className="spn-graph-material-selector nodrag nowheel">
        <span>Concrete Class</span>
        <CanvasSelect items={EN_CONCRETE_CLASS_IDS} value={String(node.parameters.materialId ?? 'C40/50')} getKey={grade => grade} getLabel={grade => grade} ariaLabel="Concrete Class" onChange={grade => data.onParameterChange(node.id, 'materialId', grade)} />
      </div>}
      {node.type === 'material.structuralSteel' && <div className="spn-graph-material-selector nodrag nowheel"><span>Steel Class</span><CanvasSelect items={STRUCTURAL_STEEL_OPTIONS.map(item => item.value)} value={String(node.parameters.materialId ?? 'S355')} getKey={grade => grade} getLabel={grade => grade} ariaLabel="Steel Class" onChange={grade => data.onParameterChange(node.id, 'materialId', grade)} /></div>}
      {node.type === 'input.quantity' && <div className="spn-graph-node-range">{quantityDisplay(Number(node.parameters.value), node.parameters.quantityKind as QuantityKind, String(node.parameters.unit), data.projectUnits)}</div>}
      {definition.inputs.map((port, index) => <div className={`spn-graph-port-row input${node.type === 'input.range' ? ' spn-graph-range-port' : ''}`} key={port.id} style={{ top: 45 + index * 25 }}><Handle type="target" position={Position.Left} id={port.id} isConnectable /><span>{port.label}</span>{node.type === 'input.range' ? <EditableNumericInput value={rangeEditorValue(node,data,port.id)} ariaLabel={`Range ${port.label}`} disabled={Boolean(data.connectedInputs?.[port.id])} onCommit={value => data.onParameterChange(node.id, port.id === 'start' ? 'min' : port.id === 'end' ? 'max' : 'step', rangeInternalValue(node, value, data.projectUnits))} /> : definition.category !== 'MATH' && <small>{port.type}</small>}</div>)}
      {definition.outputs.map((port, index) => <div className="spn-graph-port-row output" key={port.id} style={{ top: (node.type === 'input.number' || node.type === 'input.integer' ? 40 : 45) + index * 25 }}>{definition.category !== 'INPUT' && definition.category !== 'MATH' && definition.category !== 'MATERIALS' && <small>{port.type}</small>}{definition.category !== 'INPUT' && definition.category !== 'MATH' && definition.category !== 'MATERIALS' && <span>{port.label}</span>}<Handle type="source" position={Position.Right} id={port.id} isConnectable /></div>)}
      {node.type === 'input.range' && <div className={`spn-graph-range-summary${data.rangePreviewError ? ' has-error' : ''}`}>{data.rangePreviewError ?? `${Array.isArray(data.rangePreviewValue) ? data.rangePreviewValue.length : 0} values`}</div>}
      {node.type === 'output.watch' && <div className="spn-graph-watch-value" style={{ whiteSpace: 'pre-line' }}>{watchDisplay(data, value => format(value, data.projectUnits))}</div>}
      {(node.type.startsWith('substructure.pier.') || node.type.startsWith('substructure.pier-cap.') || node.type.startsWith('substructure.foundation.') || node.type.startsWith('substructure.bearing.')) && Array.isArray(data.output) && <div className="spn-graph-watch-value">{data.output.length} candidate{data.output.length === 1 ? '' : 's'}</div>}
      {data.executionError && <div className="spn-graph-node-error-message" title={data.executionError}>{data.executionError}</div>}
    </div>
    <NodeStatusIndicator executionState={data.executionState} isDirty={data.isDirty} hasError={Boolean(data.executionError)} runRequired={node.type === 'output.watch' && data.outputAvailability === 'run-required'} />
  </div>
}

function rangeEditorValue(node: KopruqNode,data: FlowGraphNode['data'],portId: string): GraphParameterValue {
  const key=portId==='start'?'min':portId==='end'?'max':'step',value=data.connectedInputs?.[portId]?.value
  if(typeof value==='number')return value
  if(typeof value==='object'&&value!==null&&!Array.isArray(value)&&'quantityKind'in value){
    try{return quantityFromCanonical(value.value,value.quantityKind,String(node.parameters.unit??'1'))}catch{return 'Invalid unit'}
  }
  const raw = node.parameters[key] ?? ''
  return typeof raw === 'number' && node.parameters.quantityKind !== 'dimensionless' ? toDisplayValue(quantityFromCanonical(raw, node.parameters.quantityKind as QuantityKind, String(node.parameters.unit ?? '1')), dimensionForKind(node.parameters.quantityKind as QuantityKind), data.projectUnits) : raw
}
function rangeInternalValue(node: KopruqNode, value: number | string, units: FlowGraphNode['data']['projectUnits']): number { const numeric=Number(value), kind=node.parameters.quantityKind as QuantityKind|undefined; if(!kind||kind==='dimensionless') return numeric; const source=kind==='length'?(units?.length??'m'):String(node.parameters.unit??'1'); return convertQuantity(numeric,source,String(node.parameters.unit??source)) }


function InlineValue({ nodeId, type, value, onChange }: { nodeId: string; type: string; value: GraphParameterValue | undefined; onChange: (id: string, key: string, value: GraphParameterValue) => void }) {
  if (type === 'input.boolean') return <label className="spn-graph-bool nodrag"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(nodeId, 'value', event.target.checked)} /> {String(value)}</label>
  return <EditableNumericInput value={value} integer={type === 'input.integer'} ariaLabel={`${type === 'input.integer' ? 'Integer' : 'Number'} value`} onCommit={next => onChange(nodeId, 'value', next)} />
}
function watchDisplay(data: FlowGraphNode['data'], formatValue: (value: GraphValue) => string) {
  const value = data.isDirty ? data.previewValue : data.output ?? data.previewValue
  if (value !== undefined) {
    if (Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'object' && item !== null && 'capType' in item)) return value.length === 1 ? formatCap(value[0] as import('../domain/types').PierCapCandidate) : `${value.length} Pier Cap candidates`
    if (Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'object' && item !== null && 'foundationType' in item)) return value.length === 1 ? formatFoundation(value[0] as import('../domain/types').FoundationCandidate) : `${value.length} Foundation candidates`
    if (Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'object' && item !== null && 'bearingType' in item)) return `${value.length} Elastomeric Bearing candidate${value.length === 1 ? '' : 's'}`
    if (Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'object' && item !== null && 'pierType' in item)) return `${value.length} candidate${value.length === 1 ? '' : 's'}`
    return formatValue(value)
  }
  if (data.isDirty || data.outputAvailability === 'dirty') return 'Results outdated - Run required'
  if (data.outputAvailability === 'run-required') return 'Run required'
  if (data.outputAvailability === 'unconnected') return 'Connect an output'
  return 'No value'
}
function format(value: GraphValue, units?: FlowGraphNode['data']['projectUnits']): string { if(Array.isArray(value)){if(value.every(item=>typeof item==='object'&&item!==null&&'quantityKind'in item)){const quantities=value as import('../domain/quantities').EngineeringQuantity[];return `${quantities.slice(0,5).map(item=>Number(toDisplayValue(item.value,dimensionForKind(item.quantityKind),units).toPrecision(10)).toString()).join(', ')}${quantities.length>5?` ... (${quantities.length} items)`:''}`}return `[${value.slice(0,5).map(item=>format(item,units)).join(', ')}${value.length>5?', ...':''}]${value.length>5?` (${value.length} items)`:''}`}if(typeof value==='object'&&value!==null&&'quantityKind'in value)return Number(toDisplayValue(value.value,dimensionForKind(value.quantityKind),units).toPrecision(10)).toString();if(typeof value==='object'&&value!==null&&'domainType'in value)return `${value.domainType.replace('Material','')} ${value.name}`;if(typeof value==='object'&&value!==null&&'clearEdgeCantileverLeft'in value)return Number(toDisplayValue(value.clearEdgeCantileverLeft,'Length',units).toPrecision(10)).toString();return String(value) }
function dimensionForKind(kind: QuantityKind): PhysicalDimension { return ({length:'Length',area:'Area',volume:'Volume',length4:'Length^4',force:'Force',moment:'Moment',stress:'Stress',mass:'Mass',temperature:'Absolute Temperature',temperatureDifference:'Temperature Difference',translationalStiffness:'Translational Stiffness',rotationalStiffness:'Rotational Stiffness'} as Record<string, PhysicalDimension>)[kind] ?? 'Dimensionless' }
function quantityDisplay(value:number,kind:QuantityKind,unit:string,units:FlowGraphNode['data']['projectUnits']) { const canonical=getUnit(unit)?.toCanonical(value) ?? value; return formatDisplayValue(canonical,dimensionForKind(kind),units) }
function displayLength(value: GraphParameterValue | undefined, units: FlowGraphNode['data']['projectUnits']) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return value
  return Number(toDisplayValue(numeric, 'Length', units).toPrecision(10)).toString()
}
function LengthNodeEditor({ node, units, onParameterChange }: { node: KopruqNode; units: FlowGraphNode['data']['projectUnits']; onParameterChange: (id: string, key: string, value: GraphParameterValue) => void }) {
  const mode = String(node.parameters.mode ?? 'single')
  const commit = (key: string, value: number | string) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) { onParameterChange(node.id, key, value); return }
    onParameterChange(node.id, key, convertQuantity(numeric, units?.length ?? 'm', 'm'))
  }
  return <div className="spn-graph-length-editor nodrag nowheel">
    <label>Mode <select className="spn-input" aria-label="Length Mode" value={mode} onChange={event => onParameterChange(node.id, 'mode', event.target.value)}><option value="single">Single</option><option value="range">Range</option></select></label>
    {mode === 'single' ? <label>Value <EditableNumericInput value={displayLength(node.parameters.value, units)} ariaLabel="Length Value" onCommit={value => commit('value', value)} /></label> : <>
      <label>Min <EditableNumericInput value={displayLength(node.parameters.min, units)} ariaLabel="Length Min" onCommit={value => commit('min', value)} /></label>
      <label>Max <EditableNumericInput value={displayLength(node.parameters.max, units)} ariaLabel="Length Max" onCommit={value => commit('max', value)} /></label>
      <label>Delta <EditableNumericInput value={displayLength(node.parameters.step, units)} ariaLabel="Length Delta" onCommit={value => commit('step', value)} /></label>
    </>}
  </div>
}
function formatCap(candidate: import('../domain/types').PierCapCandidate) { const g=candidate.geometry;return candidate.capType==='T'?`T-Cap L=${g.length.toFixed(2)} m Top W=${g.topWidth.toFixed(2)} m Stem W=${g.stemWidth.toFixed(2)} m H=${g.totalHeight.toFixed(2)} m tf=${g.flangeThickness.toFixed(2)} m · ${candidate.material.name}`:`Rectangular Cap L=${g.length.toFixed(2)} m W=${g.width.toFixed(2)} m H=${g.height.toFixed(2)} m · ${candidate.material.name}` }
function formatFoundation(candidate: import('../domain/types').FoundationCandidate) { const g=candidate.geometry;if(candidate.foundationType==='SHALLOW')return `Shallow Foundation Lx=${Number(g.Lx).toFixed(2)} m Ly=${Number(g.Ly).toFixed(2)} m H=${Number(g.height).toFixed(2)} m · ${candidate.material.name}`;const d=g.derived as Readonly<Record<string,number>>;return `Piled Foundation D=${Number(g.pileDiameter).toFixed(2)} m nx=${g.pileCountX} ax=${Number(g.pileSpacingX).toFixed(2)} m ny=${g.pileCountY} ay=${Number(g.pileSpacingY).toFixed(2)} m Cap H=${Number(g.capHeight).toFixed(2)} m Lx=${d.Lx.toFixed(2)} m Ly=${d.Ly.toFixed(2)} m · ${candidate.material.name}` }
