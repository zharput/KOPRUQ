import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { GraphParameterValue, SpanovaNode } from '../domain/types'
import type { FlowGraphNode } from '../adapters/reactFlowAdapter'
import { getNodeDefinition } from '../registry/nodeRegistry'
import { formatQuantity, formatQuantityList, getUnit, quantityFromCanonical } from '../domain/quantities'
import type { GraphValue } from '../domain/types'
import EngineeringNodeShell from './EngineeringNodeShell'
import EditableNumericInput from './EditableNumericInput'
import ListOutputNode from './ListOutputNode'
import { EN_CONCRETE_CLASS_IDS } from '../../materials/model/materialCatalog'
import CanvasSelect from './CanvasSelect'
import { getNodeCategoryLabel, getNodeTheme } from '../domain/nodeVisualThemes'

export default function BaseNode({ data, selected }: NodeProps<FlowGraphNode>) {
  const node = data.node, definition = getNodeDefinition(node.type)
  if (!definition) return <div className="spn-graph-node spn-graph-node-error">Unknown node</div>
  if (definition.category === 'SUBSTRUCTURE' || definition.category === 'STRUCTURAL_FAMILY') return <EngineeringNodeShell data={data} selected={selected} definition={definition} />
  if (node.type === 'output.list') return <ListOutputNode data={data} selected={selected} />
  const stateClass = data.isDirty ? ' is-dirty' : data.executionState === 'error' || data.executionError ? ' has-error' : data.executionState === 'success' ? ' has-success' : data.executionState === 'running' ? ' is-running' : ''
  return <div className={`spn-graph-node ${getNodeTheme(definition.category).className}${node.type === 'material.concrete' ? ' spn-graph-material-node' : ''}${node.type === 'input.range' ? ' spn-graph-range-node' : ''}${selected ? ' is-selected' : ''}${stateClass}`}>
    <div className="spn-graph-node-title"><span>{definition.label}</span><small>{getNodeCategoryLabel(definition.category)}</small></div>
    <div className="spn-graph-node-content" style={{ minHeight: Math.max(48, definition.inputs.length * 25 + 30, definition.outputs.length * 25 + 30) + (node.type === 'input.range' ? 34 : 0) }}>
      {definition.category === 'INPUT' && node.type !== 'input.range' && node.type !== 'input.integer-list' && <InlineValue nodeId={node.id} type={node.type} value={node.parameters.value} onChange={data.onParameterChange} />}
      {node.type === 'input.integer-list' && <div className="spn-graph-node-range" aria-label="Integer list values">{String(node.parameters.valuesText ?? '')}</div>}
      {node.type === 'material.concrete' && <div className="spn-graph-material-selector nodrag nowheel">
        <span>Concrete Class</span>
        <CanvasSelect items={EN_CONCRETE_CLASS_IDS} value={String(node.parameters.materialId ?? 'C40/50')} getKey={grade => grade} getLabel={grade => grade} ariaLabel="Concrete Class" onChange={grade => data.onParameterChange(node.id, 'materialId', grade)} />
      </div>}
      {node.type === 'input.quantity' && <div className="spn-graph-node-range">{node.parameters.value} {getUnit(String(node.parameters.unit))?.label}</div>}
      {definition.inputs.map((port, index) => <div className={`spn-graph-port-row input${node.type === 'input.range' ? ' spn-graph-range-port' : ''}`} key={port.id} style={{ top: 45 + index * 25 }}><Handle type="target" position={Position.Left} id={port.id} isConnectable /><span>{port.label}</span>{node.type === 'input.range' ? <EditableNumericInput value={rangeEditorValue(node,data,port.id)} ariaLabel={`Range ${port.label}`} disabled={Boolean(data.connectedInputs?.[port.id])} onCommit={value => data.onParameterChange(node.id, port.id === 'start' ? 'min' : port.id === 'end' ? 'max' : 'step', value)} /> : definition.category !== 'MATH' && <small>{port.type}</small>}</div>)}
      {definition.outputs.map((port, index) => <div className="spn-graph-port-row output" key={port.id} style={{ top: (node.type === 'input.number' || node.type === 'input.integer' ? 40 : 45) + index * 25 }}>{definition.category !== 'INPUT' && definition.category !== 'MATH' && <small>{port.type}</small>}<span>{port.label}</span><Handle type="source" position={Position.Right} id={port.id} isConnectable /></div>)}
      {node.type === 'input.range' && <div className={`spn-graph-range-summary${data.rangePreviewError ? ' has-error' : ''}`}>{data.rangePreviewError ?? `${Array.isArray(data.rangePreviewValue) ? data.rangePreviewValue.length : 0} values`}</div>}
      {node.type === 'output.watch' && <div className="spn-graph-watch-value" style={{ whiteSpace: 'pre-line' }}>{watchDisplay(data, format)}</div>}
      {(node.type.startsWith('substructure.pier.') || node.type.startsWith('substructure.pier-cap.') || node.type.startsWith('substructure.foundation.') || node.type.startsWith('substructure.bearing.')) && Array.isArray(data.output) && <div className="spn-graph-watch-value">{data.output.length} candidate{data.output.length === 1 ? '' : 's'}</div>}
      {data.executionError && <div className="spn-graph-node-error-message" title={data.executionError}>{data.executionError}</div>}
    </div>
    <div className="spn-graph-node-state">{data.isDirty ? 'DIRTY' : node.type === 'output.watch' && data.outputAvailability === 'run-required' ? 'RUN REQUIRED' : data.executionState.toUpperCase()}</div>
  </div>
}

function rangeEditorValue(node: SpanovaNode,data: FlowGraphNode['data'],portId: string): GraphParameterValue {
  const key=portId==='start'?'min':portId==='end'?'max':'step',value=data.connectedInputs?.[portId]?.value
  if(typeof value==='number')return value
  if(typeof value==='object'&&value!==null&&!Array.isArray(value)&&'quantityKind'in value){
    try{return quantityFromCanonical(value.value,value.quantityKind,String(node.parameters.unit??'1'))}catch{return 'Invalid unit'}
  }
  return node.parameters[key]??''
}


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
function format(value: GraphValue): string { if(Array.isArray(value)){if(value.every(item=>typeof item==='object'&&item!==null&&'quantityKind'in item)){const quantities=value as import('../domain/quantities').EngineeringQuantity[];return `${formatQuantityList(quantities.slice(0,5))}${quantities.length>5?` ... (${quantities.length} items)`:''}`}if(value.every(item=>typeof item==='object'&&item!==null&&('pierType'in item||'capType'in item||'foundationType'in item||'bearingType'in item))){return value.slice(0,5).map((item,index)=>`${index+1} ${'bearingType'in item?formatBearing(item as import('../domain/types').BearingCandidate):'foundationType'in item?formatFoundation(item as import('../domain/types').FoundationCandidate):'capType'in item?formatCap(item as import('../domain/types').PierCapCandidate):formatPier(item as import('../domain/types').PierCandidate)}`).join('\n')+(value.length>5?`\n... (${value.length} total)`:value.length?`\n${value.length} total`:'No candidates')}return `[${value.slice(0,5).map(format).join(', ')}${value.length>5?', ...':''}]${value.length>5?` (${value.length} items)`:''}`}if(typeof value==='object'&&value!==null&&'quantityKind'in value)return formatQuantity(value);if(typeof value==='object'&&value!==null&&'domainType'in value)return `${value.domainType.replace('Material','')} ${value.name}`;if(typeof value==='object'&&value!==null&&'pierType'in value)return formatPier(value);if(typeof value==='object'&&value!==null&&'capType'in value)return formatCap(value);if(typeof value==='object'&&value!==null&&'foundationType'in value)return formatFoundation(value);if(typeof value==='object'&&value!==null&&'bearingType'in value)return formatBearing(value);return String(value) }
function formatPier(candidate: import('../domain/types').PierCandidate) { const geometry=Object.entries(candidate.geometry).map(([key,value])=>`${key}=${value.toFixed(2)} m`).join(' ');return `${candidate.pierType} ${geometry} H=${candidate.heightM.toFixed(2)} m ${candidate.material.name}` }
function formatCap(candidate: import('../domain/types').PierCapCandidate) { const g=candidate.geometry;return candidate.capType==='T'?`T-Cap L=${g.length.toFixed(2)} m Top W=${g.topWidth.toFixed(2)} m Stem W=${g.stemWidth.toFixed(2)} m H=${g.totalHeight.toFixed(2)} m tf=${g.flangeThickness.toFixed(2)} m · ${candidate.material.name}`:`Rectangular Cap L=${g.length.toFixed(2)} m W=${g.width.toFixed(2)} m H=${g.height.toFixed(2)} m · ${candidate.material.name}` }
function formatFoundation(candidate: import('../domain/types').FoundationCandidate) { const g=candidate.geometry;if(candidate.foundationType==='SHALLOW')return `Shallow Foundation Lx=${Number(g.Lx).toFixed(2)} m Ly=${Number(g.Ly).toFixed(2)} m H=${Number(g.height).toFixed(2)} m · ${candidate.material.name}`;const d=g.derived as Readonly<Record<string,number>>;return `Piled Foundation D=${Number(g.pileDiameter).toFixed(2)} m nx=${g.pileCountX} ax=${Number(g.pileSpacingX).toFixed(2)} m ny=${g.pileCountY} ay=${Number(g.pileSpacingY).toFixed(2)} m Cap H=${Number(g.capHeight).toFixed(2)} m Lx=${d.Lx.toFixed(2)} m Ly=${d.Ly.toFixed(2)} m · ${candidate.material.name}` }
function formatBearing(candidate: import('../domain/types').BearingCandidate) { return `Elastomeric Bearing Lx=${candidate.geometry.lengthX.toFixed(2)} m Ly=${candidate.geometry.widthY.toFixed(2)} m H=${candidate.geometry.totalHeight.toFixed(2)} m Kx=${candidate.stiffness.kx} kN/m Ky=${candidate.stiffness.ky} kN/m Kz=${candidate.stiffness.kz} kN/m Krx=${candidate.stiffness.krx} kN·m/rad Kry=${candidate.stiffness.kry} kN·m/rad Krz=${candidate.stiffness.krz} kN·m/rad` }
