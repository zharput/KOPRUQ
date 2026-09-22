import type { GraphExecutionState, GraphValue, MaterialValue, SpanovaConnection, SpanovaNode } from '../domain/types'
import type { ProjectUnitPreferences } from '../domain/engineeringInputs'
import { convertQuantity, formatQuantity, toDisplayValue, unitsForKind, type PhysicalDimension, type QuantityKind } from '../domain/quantities'
import { getNodeDefinition, previewDesignOutput } from '../registry/nodeRegistry'
import EngineeringNodeInspector from './EngineeringNodeInspector'
import EditableNumericInput from './EditableNumericInput'
import MaterialProperties, { catalogMaterial } from './MaterialProperties'
import AssemblyInspector from './AssemblyInspector'

type Props = {
  node?: SpanovaNode
  selectedNodes?: SpanovaNode[]
  states: Record<string, GraphExecutionState>
  errors: Record<string, string>
  outputs: Record<string, Record<string, GraphValue>>
  resolvedInputs?: Record<string, Record<string, GraphValue>>
  previewInputs?: Record<string, { sourceName: string; value?: GraphValue; error?: string; range?: { mode: 'single' | 'range'; value?: number; min?: number; max?: number; delta?: number } }>
  connections?: SpanovaConnection[]
  concreteMaterial?: MaterialValue
  projectUnits?: ProjectUnitPreferences
  onNodeChange: (id: string, patch: Partial<SpanovaNode>) => void
  onParameterChange: (id: string, key: string, value: number | boolean | string) => void
}

export default function NodeInspector({ node, selectedNodes = [], states, errors, outputs, resolvedInputs = {}, previewInputs = {}, connections = [], concreteMaterial, projectUnits, onNodeChange, onParameterChange }: Props) {
  if (selectedNodes.length > 1) return <MultiSelectionInspector nodes={selectedNodes} />
  if (!node) return <div className="spn-graph-inspector-empty"><strong>NODE INSPECTOR</strong><span>Select a node to inspect its properties.</span></div>
  const definition = getNodeDefinition(node.type)
  if (!definition) return <p role="alert">This node type is unavailable.</p>
  if (node.type === 'structural.assembly') { const value = outputs[node.id]?.assembly; const assembly = typeof value === 'object' && value !== null && 'supports' in value ? value as import('../domain/bridgeAssembly').BridgeAssembly : undefined; return <AssemblyInspector node={node} assembly={assembly} state={states[node.id] ?? 'idle'} error={errors[node.id]} projectUnits={projectUnits} onNodeChange={onNodeChange} /> }
  if (definition.engineeringInspector) return <EngineeringNodeInspector node={node} states={states} errors={errors} outputs={outputs} resolvedInputs={resolvedInputs} previewInputs={previewInputs} connections={connections} projectUnits={projectUnits} onNodeChange={onNodeChange} onParameterChange={onParameterChange} />

  const connectedPorts = new Set(connections.filter(edge => edge.targetNodeId === node.id).map(edge => edge.targetPortId))
  const incoming = definition.inputs.flatMap(input => {
    if (!connectedPorts.has(input.id)) return []
    const value = resolvedInputs[node.id]?.[input.id] ?? previewInputs[input.id]?.value
    return [{ label: input.label, value }]
  })
  const parameters = definition.parameterSchema
  const previewInputsByPort = Object.fromEntries(Object.entries(previewInputs).flatMap(([key, item]) => item.value === undefined ? [] : [[key, item.value]]))
  let calculatedPreview: GraphValue | undefined
  try { calculatedPreview = definition.outputs[0] ? previewDesignOutput(node, definition.outputs[0].id, previewInputsByPort) : undefined } catch { /* validation feedback is shown in General */ }
  const connectedPreview = definition.inputs.map(input => resolvedInputs[node.id]?.[input.id] ?? previewInputs[input.id]?.value).find(value => value !== undefined)
  const localScalarPreview = ['input.number','input.integer','input.boolean'].includes(node.type) ? node.parameters.value as GraphValue : undefined
  const previewValue = outputs[node.id]?.value ?? outputs[node.id]?.result ?? (node.type.startsWith('math.') ? calculatedPreview : undefined) ?? connectedPreview ?? calculatedPreview ?? localScalarPreview
  const material = concreteMaterial ?? (node.type === 'material.structuralSteel' ? catalogMaterial(String(node.parameters.materialId ?? 'S355'), 'StructuralSteelMaterial') : undefined)
  return <div className="spn-graph-inspector spn-general-node-inspector">
    <section><h3>GENERAL</h3><label>Name<input className="spn-input" value={node.name} onChange={event => onNodeChange(node.id, { name: event.target.value })} /></label><div className="spn-graph-inspector-row"><span>Type</span><strong>{definition.label}</strong></div><div className="spn-graph-inspector-row"><span>Execution</span><strong className={`state-${states[node.id] ?? 'idle'}`}>{(states[node.id] ?? 'idle').toUpperCase()}</strong></div>{errors[node.id] && <p className="spn-graph-inspector-error">{errors[node.id]}</p>}</section>
    {parameters.length > 0 && <section><h3>PARAMETERS / VALUE</h3>{parameters.filter(parameter => node.type !== 'input.length' || parameter.key === 'mode' || (String(node.parameters.mode ?? 'single') === 'single' ? parameter.key === 'value' : ['min','max','step'].includes(parameter.key))).map(parameter => {
      const isConnected = parameter.inputPortId ? connectedPorts.has(parameter.inputPortId) : false
      const input = parameter.inputPortId ? previewInputs[parameter.inputPortId]?.value ?? resolvedInputs[node.id]?.[parameter.inputPortId] : undefined
      const units = parameter.key === 'unit' ? unitsForKind(node.parameters.quantityKind as QuantityKind).map(unit => ({ value: unit.id, label: unit.label })) : parameter.options ?? []
      const displayValue = node.type === 'input.length' && parameter.dataType !== 'select' ? toDisplayValue(Number(node.parameters[parameter.key]), 'Length', projectUnits) : quantityParameterValue(node, parameter.key, projectUnits)
      return <div className="spn-general-parameter" key={parameter.key}><label>{humanParameterLabel(parameter.label)}{isConnected && <small>Connected · {input === undefined ? 'waiting for value' : formatGraphValue(input)}</small>}{parameter.dataType === 'boolean' ? <input type="checkbox" checked={Boolean(node.parameters[parameter.key])} disabled={isConnected} onChange={event => onParameterChange(node.id, parameter.key, event.target.checked)} /> : parameter.dataType === 'select' ? <select className="spn-input" aria-label={humanParameterLabel(parameter.label)} value={String(node.parameters[parameter.key] ?? units[0]?.value ?? '')} disabled={isConnected || !units.length} onChange={event => {onParameterChange(node.id, parameter.key, event.target.value);if(parameter.key==='quantityKind'){const kind=event.target.value as QuantityKind,preferred=projectUnits?.[kind],unit=unitsForKind(kind).find(item=>item.id===preferred||item.label===preferred)??unitsForKind(kind)[0];onParameterChange(node.id,'unit',unit.id)}}}><option value="" disabled>Select</option>{units.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : parameter.dataType === 'string' ? <input className="spn-input" aria-label={humanParameterLabel(parameter.label)} value={String(node.parameters[parameter.key] ?? '')} onChange={event => onParameterChange(node.id, parameter.key, event.target.value)} /> : <EditableNumericInput value={displayValue} integer={parameter.dataType === 'integer'} ariaLabel={humanParameterLabel(parameter.label)} disabled={isConnected} onCommit={value => onParameterChange(node.id, parameter.key, node.type === 'input.length' ? convertQuantity(Number(value), projectUnits?.length ?? 'm', 'm') : quantityParameterInternalValue(node, parameter.key, value, projectUnits))} />}</label></div>
    })}</section>}
    {incoming.length > 0 && <section><h3>CONNECTED VALUES</h3>{incoming.map(item => <div className="spn-graph-inspector-row" key={item.label}><span>{item.label}</span><strong>{item.value === undefined ? 'Waiting for value' : formatGraphValue(item.value)}</strong></div>)}</section>}
    {node.type.startsWith('material.') && <section><h3>MATERIAL</h3><div className="spn-graph-inspector-row"><span>Grade</span><strong>{material?.name ?? String(node.parameters.materialId ?? 'Not selected')}</strong></div><MaterialProperties material={material} /></section>}
    {(node.type.startsWith('output.') || previewValue !== undefined) && <section><h3>RESULT / PREVIEW</h3>{previewValue === undefined ? <small>{incoming.length ? 'Waiting for a connected value.' : 'Connect a value to preview this node.'}</small> : <GraphValuePreview value={previewValue} />}</section>}
  </div>
}

function humanParameterLabel(value: string) { return value.replace(/ local default$/i, '').replace(/ quantity kind$/i, ' kind') }
function quantityParameterValue(node: SpanovaNode, key: string, units?: ProjectUnitPreferences): number | string | boolean | undefined { const kind=node.parameters.quantityKind as QuantityKind|undefined, unit=String(node.parameters.unit??'1'), value=node.parameters[key]; if(!kind||kind==='dimensionless'||typeof value!=='number'||!['value','min','max','step'].includes(key)) return typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean' ? value : undefined; return toDisplayValue((unitsForKind(kind).find(item=>item.id===unit)?.toCanonical(value) ?? value),dimensionForKind(kind),units) }
function quantityParameterInternalValue(node: SpanovaNode,key:string,value:number|string|boolean,units?:ProjectUnitPreferences): number|string|boolean { const kind=node.parameters.quantityKind as QuantityKind|undefined,unit=String(node.parameters.unit??'1'); if(!kind||kind==='dimensionless'||typeof value!=='number'||!['value','min','max','step'].includes(key)) return value; const source=kind==='length'?(units?.length??'m'):unit; return convertQuantity(value,source,unit) }
function dimensionForKind(kind: QuantityKind): PhysicalDimension { return ({length:'Length',area:'Area',volume:'Volume',length4:'Length^4',force:'Force',moment:'Moment',stress:'Stress',mass:'Mass',temperature:'Absolute Temperature',temperatureDifference:'Temperature Difference',translationalStiffness:'Translational Stiffness',rotationalStiffness:'Rotational Stiffness'} as Record<string,PhysicalDimension>)[kind]??'Dimensionless' }
function formatGraphValue(value: GraphValue): string {
  if (Array.isArray(value)) return value.length ? `${value.slice(0,3).map(formatGraphValue).join(', ')}${value.length>3?` … (${value.length} values)`:''}` : 'No values'
  if (typeof value === 'object' && value !== null && 'quantityKind' in value) return formatQuantity(value)
  if (typeof value === 'object' && value !== null && 'domainType' in value) return value.name
  if (typeof value === 'object' && value !== null && 'pierType' in value) return `${String(value.pierType).replace('_',' ')} pier candidate`
  if (typeof value === 'object' && value !== null && 'capType' in value) return `${value.capType === 'T' ? 'T-Cap' : 'Rectangular Cap'} candidate`
  if (typeof value === 'object' && value !== null && 'foundationType' in value) return `${value.foundationType === 'PILED' ? 'Piled' : 'Shallow'} Foundation candidate`
  if (typeof value === 'object' && value !== null && 'bearingType' in value) return 'Elastomeric Bearing candidate'
  if (typeof value === 'object') return 'Available'
  return String(value)
}
function GraphValuePreview({ value }: { value: GraphValue }) { return <div className="spn-graph-result-preview">{Array.isArray(value) ? value.slice(0,10).map((item,index)=><div className="spn-graph-inspector-row" key={index}><span>{index+1}</span><strong>{formatGraphValue(item)}</strong></div>) : <strong>{formatGraphValue(value)}</strong>}{Array.isArray(value)&&value.length>10&&<small>Showing 10 of {value.length} values.</small>}</div> }
function MultiSelectionInspector({ nodes }: { nodes: SpanovaNode[] }) {
  const counts = new Map<string, number>()
  for (const node of nodes) { const label = getNodeDefinition(node.type)?.label ?? 'Unknown node'; counts.set(label, (counts.get(label) ?? 0) + 1) }
  return <div className="spn-graph-inspector spn-graph-multi-inspector"><h3>MULTIPLE SELECTION</h3><div className="spn-graph-inspector-row"><span>Selected Nodes</span><strong>{nodes.length}</strong></div>{[...counts].map(([label, count]) => <div className="spn-graph-inspector-row" key={label}><span>{label}</span><strong>{count}</strong></div>)}</div>
}
