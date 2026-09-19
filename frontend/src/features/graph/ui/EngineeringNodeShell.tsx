import { Handle, Position } from '@xyflow/react'
import { Fragment } from 'react'
import type { GraphParameterValue, GraphValue } from '../domain/types'
import type { FlowGraphNode } from '../adapters/reactFlowAdapter'
import type { NodeDefinition, NodePortDefinition, ParameterDescriptor } from '../registry/nodeRegistry'
import { CANONICAL_UNITS, formatQuantity, getUnit, quantityFromCanonical, unitsForKind } from '../domain/quantities'
import EditableNumericInput from './EditableNumericInput'
import { getNodeCategoryLabel, getNodeTheme } from '../domain/nodeVisualThemes'

export default function EngineeringNodeShell({ data, selected, definition }: { data: FlowGraphNode['data']; selected: boolean; definition: NodeDefinition }) {
  const state = data.executionState === 'error' || data.executionError ? ' has-error' : data.executionState === 'success' ? ' has-success' : data.executionState === 'running' ? ' is-running' : ''
  const candidates = !data.isDirty && data.outputs?.candidates !== undefined ? data.outputs.candidates : undefined
  const candidateCount = Array.isArray(candidates) ? candidates.length : 0
  const displayedCandidateCount = candidates === undefined ? data.previewCandidateCount ?? candidateCount : candidateCount
  const generated = data.outputs?.generatedCombinations ?? data.previewGeneratedCombinations
  const invalid = data.outputs?.invalidCombinations ?? data.previewInvalidCombinations
  return <div className={`spn-graph-node spn-engineering-node ${getNodeTheme(definition.category).className}${selected ? ' is-selected' : ''}${state}${data.isDirty ? ' is-dirty' : ''}`}>
    <header className="spn-graph-node-title"><span title={definition.label}>{definition.label}</span><small title={getNodeCategoryLabel(definition.category)}>{getNodeCategoryLabel(definition.category)}</small></header>
    <div className="spn-engineering-inputs">
      {definition.inputs.map((port, index) => <Fragment key={port.id}>{port.group && port.group !== definition.inputs[index - 1]?.group && <div className="spn-engineering-group-heading">{port.group}</div>}<EngineeringInputRow port={port} definition={definition} data={data} /></Fragment>)}
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
    {data.executionError && <div className="spn-graph-node-error-message" title={data.executionError}>{data.executionError}</div>}
    <div className="spn-graph-node-state">{data.isDirty ? 'DIRTY' : data.executionState.toUpperCase()}</div>
  </div>
}

function FoundationDerivedCanvas({data}:{data:FlowGraphNode['data']}){
  const candidates=data.isDirty?data.previewFoundationCandidates:data.outputs?.candidates??data.previewFoundationCandidates
  const list=Array.isArray(candidates)?candidates.filter((item):item is import('../domain/types').FoundationCandidate=>typeof item==='object'&&item!==null&&'foundationType'in item):[]
  const derived=(axis:'Lx'|'Ly')=>{const values=list.map(item=>item.foundationType==='PILED'?Number((item.geometry.derived as Readonly<Record<string,number>>)[axis]):Number(item.geometry[axis])).filter(Number.isFinite);if(!values.length)return '—';const min=Math.min(...values),max=Math.max(...values);return min===max?`${min.toFixed(2)} m`:`${min.toFixed(2)}…${max.toFixed(2)} m`}
  return <div className="spn-engineering-derived"><strong>Derived Geometry</strong><span>Lx <b>{derived('Lx')}</b></span><span>Ly <b>{derived('Ly')}</b></span></div>
}

function EngineeringInputRow({ port, definition, data }: { port: NodePortDefinition; definition: NodeDefinition; data: FlowGraphNode['data'] }) {
  const node = data.node
  const connection = data.connectedInputs?.[port.id]
  const descriptors = definition.parameterSchema.filter(parameter => parameter.inputPortId === port.id)
  const valueParameter = descriptors.find(parameter => parameter.dataType === 'number' || parameter.dataType === 'integer')
  const unitParameter = descriptors.find(parameter => parameter.key.endsWith('Unit'))
  const displayUnit = unitParameter ? String(node.parameters[unitParameter.key] ?? '') : ''
  const value = connection?.value
  const editable = !connection && valueParameter
  const localText = localValue(port, descriptors, node.parameters, displayUnit)
  const externalText = value === undefined ? connection?.error || (data.executionState === 'error' && data.executionError) ? 'Error' : 'Resolving...' : formatValue(value, port, data.projectUnits)
  return <div className={`spn-engineering-input-row${connection ? ' is-connected' : ''}${connection?.error ? ' has-input-error' : ''}`} title={connection?.error ?? portTooltip(port, data.projectUnits)}>
    <Handle type="target" position={Position.Left} id={port.id} isConnectable title={portTooltip(port, data.projectUnits)} />
    <span className="spn-engineering-input-label" title={port.label}>{port.label}</span>
    {connection ? <span className="spn-engineering-input-value" title={connection.error ?? externalText}><strong>{externalText}</strong></span> : editable && valueParameter ? <span className="spn-engineering-local-value"><EditableNumericInput value={node.parameters[valueParameter.key]} integer={valueParameter.dataType === 'integer'} ariaLabel={`${port.label} local default`} onCommit={next => data.onParameterChange(node.id, valueParameter.key, next)} /><small>{unitParameter ? getUnit(displayUnit)?.label ?? displayUnit : ''}</small></span> : <span className="spn-engineering-input-value" title={localText}>{localText}</span>}
  </div>
}

function localValue(port: NodePortDefinition, descriptors: ParameterDescriptor[], parameters: Record<string, GraphParameterValue>, unit: string) {
  const valueParameter = descriptors.find(parameter => parameter.dataType === 'number' || parameter.dataType === 'integer')
  if (valueParameter && typeof parameters[valueParameter.key] === 'number') {
    const value = parameters[valueParameter.key] as number
    return unit ? `${port.quantityKind === 'length' ? value.toFixed(2) : Number(value.toPrecision(10)).toString()} ${getUnit(unit)?.label ?? unit}` : String(value)
  }
  const selection = descriptors.find(parameter => parameter.dataType === 'select')
  if (selection) return String(parameters[selection.key] ?? 'Not selected')
  return '-'
}

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
      return min === max ? `${shown(min)} ${label}` : `${shown(min)}…${shown(max)} ${label}`
    }
    const first = value[0]
    return `${formatValue(first as GraphValue, port, projectUnits)}${value.length > 1 ? ` ... (${value.length} values)` : ''}`
  }
  if (typeof value === 'number') return port.type === 'length[]' ? `${value.toFixed(2)} ${unitsForKind('length').find(unit => unit.id === (projectUnits?.length ?? 'm'))?.label ?? 'm'}` : String(value)
  if (typeof value === 'object' && value !== null && 'quantityKind' in value) {
    const preferred = unitsForKind(value.quantityKind).find(unit => unit.id === projectUnits?.[value.quantityKind] || unit.label === projectUnits?.[value.quantityKind])
    return formatQuantity(value, preferred?.id ?? value.unit)
  }
  if (typeof value === 'object' && value !== null && 'domainType' in value) return value.name
  return String(value)
}

