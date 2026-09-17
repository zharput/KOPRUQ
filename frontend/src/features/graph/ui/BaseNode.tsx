import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { GraphParameterValue } from '../domain/types'
import type { FlowGraphNode } from '../adapters/reactFlowAdapter'
import { getNodeDefinition } from '../registry/nodeRegistry'
import { formatQuantity, formatQuantityList, getUnit } from '../domain/quantities'
import type { GraphValue } from '../domain/types'

export default function BaseNode({ data, selected }: NodeProps<FlowGraphNode>) {
  const node = data.node, definition = getNodeDefinition(node.type)
  if (!definition) return <div className="spn-graph-node spn-graph-node-error">Unknown node</div>
  const stateClass = data.executionState === 'error' || data.executionError ? ' has-error' : data.executionState === 'success' ? ' has-success' : data.executionState === 'running' ? ' is-running' : ''
  return <div className={`spn-graph-node${selected ? ' is-selected' : ''}${stateClass}`}>
    <div className="spn-graph-node-title"><span>{definition.label}</span><small>{definition.category}</small></div>
    <div className="spn-graph-node-content" style={{ minHeight: Math.max(48, definition.inputs.length * 25 + 30, definition.outputs.length * 25 + 30) }}>
      {definition.category === 'INPUT' && node.type !== 'input.range' && <InlineValue nodeId={node.id} type={node.type} value={node.parameters.value} onChange={data.onParameterChange} />}
      {node.type === 'input.range' && <div className="spn-graph-node-range">{node.parameters.min} … {node.parameters.max} · Δ {node.parameters.step} {getUnit(String(node.parameters.unit))?.label}</div>}
      {node.type === 'input.quantity' && <div className="spn-graph-node-range">{node.parameters.value} {getUnit(String(node.parameters.unit))?.label}</div>}
      {definition.inputs.map((port, index) => <div className="spn-graph-port-row input" key={port.id} style={{ top: 45 + index * 25 }}><Handle type="target" position={Position.Left} id={port.id} isConnectable /><span>{port.label}</span><small>{port.type}</small></div>)}
      {definition.outputs.map((port, index) => <div className="spn-graph-port-row output" key={port.id} style={{ top: 45 + index * 25 }}><small>{port.type}</small><span>{port.label}</span><Handle type="source" position={Position.Right} id={port.id} isConnectable /></div>)}
      {node.type === 'output.watch' && <div className="spn-graph-watch-value">{data.output === undefined ? 'No value' : format(data.output)}</div>}
      {data.executionError && <div className="spn-graph-node-error-message" title={data.executionError}>{data.executionError}</div>}
    </div>
    <div className="spn-graph-node-state">{data.executionState.toUpperCase()}</div>
  </div>
}

function InlineValue({ nodeId, type, value, onChange }: { nodeId: string; type: string; value: GraphParameterValue | undefined; onChange: (id: string, key: string, value: GraphParameterValue) => void }) {
  if (type === 'input.boolean') return <label className="spn-graph-bool nodrag"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(nodeId, 'value', event.target.checked)} /> {String(value)}</label>
  return <input className="spn-graph-inline-input nodrag" aria-label={`${type === 'input.integer' ? 'Integer' : 'Number'} value`} type="number" step={type === 'input.integer' ? 1 : 'any'} value={typeof value === 'number' ? value : ''} onChange={(event) => { const parsed = event.target.valueAsNumber; if (Number.isFinite(parsed)) onChange(nodeId, 'value', type === 'input.integer' ? Math.trunc(parsed) : parsed) }} />
}
function format(value: GraphValue): string { if(Array.isArray(value)){if(value.every(item=>typeof item==='object'&&item!==null&&'quantityKind'in item))return formatQuantityList(value as import('../domain/quantities').EngineeringQuantity[]);return `[${value.map(format).join(', ')}]`}if(typeof value==='object'&&value!==null&&'quantityKind'in value)return formatQuantity(value);if(typeof value==='object'&&value!==null&&'domainType'in value)return `${value.domainType.replace('Material','')} ${value.name}`;return String(value) }
