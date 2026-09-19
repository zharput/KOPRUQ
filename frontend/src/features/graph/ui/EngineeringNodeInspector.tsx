import type { GraphExecutionState, GraphValue, SpanovaConnection, SpanovaNode } from '../domain/types'
import { convertQuantity, getUnit, quantityFromCanonical, type QuantityKind } from '../domain/quantities'
import type { ProjectUnitPreferences } from '../domain/engineeringInputs'
import { getNodeDefinition, previewDesignOutput, previewBearingStatistics, previewFoundationStatistics, previewPierCapStatistics } from '../registry/nodeRegistry'
import EditableNumericInput from './EditableNumericInput'
import { EngineeringSchematic } from './EngineeringSchematics'
import MaterialSelector from './MaterialSelector'

type Props = {
  node: SpanovaNode
  states: Record<string, GraphExecutionState>
  errors: Record<string, string>
  outputs: Record<string, Record<string, GraphValue>>
  resolvedInputs: Record<string, Record<string, GraphValue>>
  previewInputs: Record<string, { sourceName: string; value?: GraphValue; error?: string }>
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
  return <div className="spn-graph-inspector spn-engineering-inspector">
    <section className="spn-engineering-general"><h3>GENERAL</h3><label>Name<input className="spn-input" value={node.name} onChange={event => onNodeChange(node.id, { name: event.target.value })} /></label><div className="spn-graph-inspector-row"><span>Type</span><strong>{definition.label}</strong></div>{errors[node.id] && <p className="spn-graph-inspector-error">{errors[node.id]}</p>}</section>
    <section className="spn-engineering-type"><h3>TYPE / SCHEMATIC</h3><EngineeringSchematic schema={schema} node={node} candidates={candidates} previewInputs={previewInputs} connections={connections} projectUnits={projectUnits} /></section>
    <section className="spn-engineering-parameters"><h3>PARAMETERS</h3>{orderedInputs.map(input => {
      const descriptors = definition.parameterSchema.filter(item => item.inputPortId === input.id)
      const resolved = resolvedInputs[node.id]?.[input.id] ?? previewInputs[input.id]?.value
      const isConnected = connected.has(input.id)
      return <div className="spn-engineering-parameter" key={input.id}>
        <span className="spn-engineering-parameter-label">{input.id === 'material' ? 'Material' : input.label}</span>
        {isConnected && input.id === 'material'
          ? <div className="spn-engineering-controls"><MaterialSelector steel={node.type.endsWith('.steel')} value={resolved && typeof resolved === 'object' && 'id' in resolved ? String(resolved.id) : String(node.parameters.materialId ?? '')} onChange={value => { const edge = connections.find(item => item.targetNodeId === node.id && item.targetPortId === 'material'); onParameterChange(edge?.sourceNodeId ?? node.id, 'materialId', value) }} /></div>
          : isConnected
          ? <div className="spn-engineering-connected"><strong>{resolved === undefined ? 'Connected' : present(resolved)}</strong></div>
          : <div className="spn-engineering-controls">{input.id === 'material' ? <MaterialSelector steel={node.type.endsWith('.steel')} value={String(node.parameters.materialId ?? (node.type.endsWith('.steel') ? 'S355' : 'C40/50'))} onChange={value => onParameterChange(node.id, 'materialId', value)} /> : descriptors.map(descriptor => <ParameterControl key={descriptor.key} node={node} descriptor={descriptor} onChange={onParameterChange} />)}</div>}
      </div>
    })}</section>
    <section className="spn-engineering-family"><h3>FAMILY</h3><div className="spn-graph-inspector-row"><span>Candidate Count</span><strong>{candidates.length}</strong></div><div className="spn-graph-inspector-row"><span>Valid</span><strong>{candidates.length}</strong></div><div className="spn-graph-inspector-row"><span>Invalid</span><strong>{stats?.invalidCombinations ?? 0}</strong></div><div className="spn-graph-inspector-row"><span>Validation</span><strong className={`state-${errors[node.id] ? 'error' : state}`}>{errors[node.id] ? 'FAILED' : candidates.length ? 'VALID' : 'NO VALID CANDIDATES'}</strong></div></section>
  </div>
}

function ParameterControl({ node, descriptor, onChange }: { node: SpanovaNode; descriptor: NonNullable<ReturnType<typeof getNodeDefinition>>['parameterSchema'][number]; onChange: Props['onParameterChange'] }) {
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
  return <EditableNumericInput value={node.parameters[descriptor.key]} integer={descriptor.dataType === 'integer'} ariaLabel={label} onCommit={value => onChange(node.id, descriptor.key, value)} />
}

function present(value: GraphValue): string {
  if (Array.isArray(value)) return `${value.slice(0, 3).map(item => typeof item === 'object' && item !== null && 'quantityKind' in item ? displayQuantity(item) : String(item)).join(', ')}${value.length > 3 ? ` … (${value.length} values)` : ''}`
  if (typeof value === 'object' && value !== null && 'quantityKind' in value) return displayQuantity(value)
  if (typeof value === 'object' && value !== null && 'domainType' in value) return value.name
  return String(value)
}
function displayQuantity(value: { quantityKind: QuantityKind; value: number; unit: string }) { const unit = getUnit(value.unit); return unit ? `${quantityFromCanonical(value.value, value.quantityKind, unit.id).toFixed(2)} ${unit.label}` : String(value.value) }
