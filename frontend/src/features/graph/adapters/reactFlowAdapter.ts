import type { Edge, Node } from '@xyflow/react'
import type { GraphExecutionState, GraphParameterValue, GraphValue, MaterialValue, KopruqConnection, KopruqGraph, KopruqNode } from '../domain/types'
import { getNodeDefinition, previewDesignOutput, previewPierCapStatistics, previewFoundationStatistics, previewBearingStatistics } from '../registry/nodeRegistry'
import { getGraphEdgeColor } from '../domain/nodeVisualThemes'
import type { ConnectionStyle } from '../state/graphViewPreferences'
import type { ProjectUnitPreferences } from '../domain/engineeringInputs'
import { resolveEngineeringInput } from '../domain/engineeringInputs'
import { makeQuantity, type QuantityKind, type UnitId } from '../domain/quantities'

export type GraphNodeViewData = {
  node: KopruqNode
  executionState: GraphExecutionState
  executionError?: string
  output?: GraphValue
  previewValue?: GraphValue
  previewCandidateCount?: number
  previewFoundationCandidates?: GraphValue
  previewBearingCandidates?: GraphValue
  previewSuperstructureCandidates?: GraphValue
  previewAbutmentCandidates?: GraphValue
  previewGeneratedCombinations?: number
  previewInvalidCombinations?: number
  rangePreviewValue?: GraphValue
  rangePreviewError?: string
  outputAvailability?: 'preview' | 'executed' | 'run-required' | 'dirty' | 'unconnected'
  outputs?: Record<string, GraphValue>
  resolvedInputs?: Record<string, GraphValue>
  connectedInputs?: Record<string, { sourceName: string; value?: GraphValue; error?: string; range?: { mode: 'single' | 'range'; value?: number; min?: number; max?: number; delta?: number } }>
  projectUnits?: ProjectUnitPreferences
  projectUnitsKey?: string
  isDirty?: boolean
  onParameterChange: (nodeId: string, key: string, value: GraphParameterValue) => void
}
export type FlowGraphNode = Node<GraphNodeViewData, 'kopruq'>

export function toReactFlowNodes(graph: KopruqGraph, options: { selectedIds?: string[]; states?: Record<string, GraphExecutionState>; errors?: Record<string, string>; outputs?: Record<string, Record<string, GraphValue>>; resolvedInputs?: Record<string, Record<string, GraphValue>>; projectUnits?: ProjectUnitPreferences; projectUnitsKey?: string; isDirty?: boolean; onParameterChange: GraphNodeViewData['onParameterChange'] }): FlowGraphNode[] {
  const selectedIds = new Set(options.selectedIds ?? [])
  const previewCache = new Map<string, GraphValue | undefined>()
  const previewErrors = new Map<string,string>()
  const resolvePreview = (nodeId:string,portId:string,path = new Set<string>()):GraphValue|undefined => {
    const cacheKey=`${nodeId}:${portId}`;if(previewCache.has(cacheKey))return previewCache.get(cacheKey)
    if(path.has(cacheKey))return undefined
    const node=graph.nodes.find(item=>item.id===nodeId);if(!node)return undefined
    const nextPath=new Set(path);nextPath.add(cacheKey)
    const direct=previewOutput(node,portId);if(direct!==undefined){previewCache.set(cacheKey,direct);return direct}
    if(!node.type.startsWith('math.')&&node.type!=='input.range'&&!node.type.startsWith('substructure.pier.')&&!node.type.startsWith('substructure.pier-cap.')&&!node.type.startsWith('substructure.foundation.')&&!node.type.startsWith('substructure.bearing.')&&!node.type.startsWith('structural.girder.')&&node.type!=='structural.superstructure'&&node.type!=='structural.abutment'&&node.type!=='structural.span_arrangement')return undefined
    const definition=getNodeDefinition(node.type),inputs:Record<string,GraphValue>={}
    for(const edge of graph.connections.filter(item=>item.targetNodeId===nodeId)){
      const target=definition?.inputs.find(port=>port.id===edge.targetPortId)
      const raw=resolvePreview(edge.sourceNodeId,edge.sourcePortId,nextPath)
      if(raw===undefined){previewErrors.set(nodeId,previewErrors.get(edge.sourceNodeId)??'Connected input preview is unavailable.');return undefined}
      if(raw!==undefined&&target){try{inputs[edge.targetPortId]=resolveEngineeringInput(raw,target,options.projectUnits)}catch{return undefined}}
    }
    try{const value=previewDesignOutput(node,portId,inputs);previewCache.set(cacheKey,value);return value}catch(cause){previewErrors.set(nodeId,cause instanceof Error?cause.message:'Preview failed.');previewCache.set(cacheKey,undefined);return undefined}
  }
  return graph.nodes.map((node) => {
    const outputs = options.outputs?.[node.id] ?? {}
    const outputEdge = (node.type === 'output.watch' || node.type === 'output.list')
      ? graph.connections.find(edge => edge.targetNodeId === node.id)
      : undefined
    const outputSource = outputEdge && graph.nodes.find(item => item.id === outputEdge.sourceNodeId)
    const previewValue = outputEdge && outputSource ? resolvePreview(outputSource.id, outputEdge.sourcePortId) : undefined
    const outputValue = outputs.value ?? outputs.candidates ?? Object.values(outputs)[0]
    const outputAvailability = !outputEdge ? 'unconnected'
      : previewValue !== undefined ? 'preview'
        : options.isDirty ? 'dirty'
          : outputValue !== undefined ? 'executed'
            : 'run-required'
    const definition = getNodeDefinition(node.type)
    const connectedInputs = Object.fromEntries(graph.connections.filter(edge => edge.targetNodeId === node.id).map(edge => {
      const source = graph.nodes.find(item => item.id === edge.sourceNodeId)
      const target = definition?.inputs.find(port => port.id === edge.targetPortId)
      let value = options.resolvedInputs?.[node.id]?.[edge.targetPortId]
      let error: string | undefined
      let raw: GraphValue | undefined
      try { raw = source && resolvePreview(source.id, edge.sourcePortId) }
      catch (cause) { error = cause instanceof Error ? cause.message : 'Source preview failed.' }
      if (value === undefined && raw !== undefined && target && options.states?.[node.id] !== 'error') {
        try { value = resolveEngineeringInput(raw, target, options.projectUnits) }
        catch (cause) { error = cause instanceof Error ? cause.message : 'Input resolution failed.' }
      }
      const sourceParameters = source?.type === 'input.length' || source?.type === 'input.range' ? source.parameters : undefined
      const range = sourceParameters ? { mode: source?.type === 'input.range' || String(sourceParameters.mode ?? 'single') === 'range' ? 'range' as const : 'single' as const, value: typeof sourceParameters.value === 'number' ? sourceParameters.value : undefined, min: typeof sourceParameters.min === 'number' ? sourceParameters.min : undefined, max: typeof sourceParameters.max === 'number' ? sourceParameters.max : undefined, delta: typeof sourceParameters.step === 'number' ? sourceParameters.step : undefined } : undefined
      return [edge.targetPortId, { sourceName: source?.name ?? edge.sourceNodeId, value, error, range }]
    }))
    const rangePreviewValue=node.type==='input.range'?resolvePreview(node.id,'values'):undefined
    const foundationPreview=node.type.startsWith('substructure.foundation.')?resolvePreview(node.id,'candidates'):undefined
    const bearingPreview=node.type.startsWith('substructure.bearing.')?resolvePreview(node.id,'candidates'):undefined
    const girderPreview=node.type.startsWith('structural.girder.')?resolvePreview(node.id,'candidates'):undefined
    const superstructurePreview=node.type==='structural.superstructure'?resolvePreview(node.id,'candidates'):undefined
    const abutmentPreview=node.type==='structural.abutment'?resolvePreview(node.id,'candidates'):undefined
    const pierPreview=node.type.startsWith('substructure.pier.')?resolvePreview(node.id,'candidates'):undefined
    const capPreview=node.type.startsWith('substructure.pier-cap.')?resolvePreview(node.id,'candidates'):undefined
    const previewCandidateCount=Array.isArray(pierPreview)?pierPreview.length:Array.isArray(capPreview)?capPreview.length:Array.isArray(foundationPreview)?foundationPreview.length:Array.isArray(bearingPreview)?bearingPreview.length:Array.isArray(girderPreview)?girderPreview.length:Array.isArray(superstructurePreview)?superstructurePreview.length:Array.isArray(abutmentPreview)?abutmentPreview.length:undefined
    let previewGeneratedCombinations:number|undefined,previewInvalidCombinations:number|undefined
    if(node.type.startsWith('substructure.pier-cap.')&&capPreview!==undefined){
      const inputs:Record<string,GraphValue>={}
      for(const edge of graph.connections.filter(item=>item.targetNodeId===node.id)){const raw=resolvePreview(edge.sourceNodeId,edge.sourcePortId),target=definition?.inputs.find(port=>port.id===edge.targetPortId);if(raw!==undefined&&target){try{inputs[edge.targetPortId]=resolveEngineeringInput(raw,target,options.projectUnits)}catch{/* preview error is already represented on the connected row */}}}
      try{const stats=previewPierCapStatistics(node,inputs,Array.isArray(capPreview)?capPreview.length:0);previewGeneratedCombinations=stats?.generatedCombinations;previewInvalidCombinations=stats?.invalidCombinations}catch{/* node error state remains owned by preview/execution */}
    }
    if(node.type.startsWith('substructure.foundation.')){
      const inputs:Record<string,GraphValue>={}
      for(const edge of graph.connections.filter(item=>item.targetNodeId===node.id)){const raw=resolvePreview(edge.sourceNodeId,edge.sourcePortId),target=definition?.inputs.find(port=>port.id===edge.targetPortId);if(raw!==undefined&&target){try{inputs[edge.targetPortId]=resolveEngineeringInput(raw,target,options.projectUnits)}catch{/* preview error is already represented on the connected row */}}}
      try{const stats=previewFoundationStatistics(node,inputs,Array.isArray(foundationPreview)?foundationPreview.length:0);previewGeneratedCombinations=stats?.generatedCombinations;previewInvalidCombinations=foundationPreview===undefined?undefined:stats?.invalidCombinations}catch{/* node error state remains owned by preview/execution */}
    }
    if(node.type.startsWith('substructure.bearing.')){
      const inputs:Record<string,GraphValue>={}
      for(const edge of graph.connections.filter(item=>item.targetNodeId===node.id)){const raw=resolvePreview(edge.sourceNodeId,edge.sourcePortId),target=definition?.inputs.find(port=>port.id===edge.targetPortId);if(raw!==undefined&&target){try{inputs[edge.targetPortId]=resolveEngineeringInput(raw,target,options.projectUnits)}catch{/* preview error is already represented on the connected row */}}}
      try{const stats=previewBearingStatistics(node,inputs,Array.isArray(bearingPreview)?bearingPreview.length:0);previewGeneratedCombinations=stats?.generatedCombinations;previewInvalidCombinations=bearingPreview===undefined?undefined:stats?.invalidCombinations}catch{/* node error state remains owned by preview/execution */}
    }
    const previewError=previewErrors.get(node.id)
    return { id: node.id, type: 'kopruq', position: { ...node.position }, selected: selectedIds.has(node.id), data: { node, executionState: options.states?.[node.id] ?? (previewError?'error':'idle'), executionError: options.errors?.[node.id] ?? previewError, output: outputValue, previewValue, previewCandidateCount, previewFoundationCandidates:foundationPreview, previewBearingCandidates:bearingPreview, previewSuperstructureCandidates:superstructurePreview, previewAbutmentCandidates: abutmentPreview, previewGeneratedCombinations, previewInvalidCombinations, rangePreviewValue, rangePreviewError:previewErrors.get(node.id), outputAvailability, outputs, connectedInputs, projectUnits: options.projectUnits, projectUnitsKey: options.projectUnitsKey ?? options.projectUnits?.length ?? 'm', isDirty: options.isDirty, onParameterChange: options.onParameterChange } }
  })
}

function previewOutput(node: KopruqNode, portId: string): GraphValue | undefined {
  if (portId === 'value' && node.type === 'input.length') {
    const make = (value: number) => makeQuantity(value, 'length', 'm')
    const mode = String(node.parameters.mode ?? 'single')
    if (mode === 'single') {
      return typeof node.parameters.value === 'number' && Number.isFinite(node.parameters.value)
        ? [make(node.parameters.value)]
        : undefined
    }
    const min = Number(node.parameters.min)
    const max = Number(node.parameters.max)
    const step = Number(node.parameters.step)
    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(step) || step <= 0 || max < min) return undefined
    return Array.from({ length: Math.floor((max - min) / step + 1e-10) + 1 }, (_, index) => make(Number((min + index * step).toFixed(10))))
  }
  if (portId === 'value' && (node.type === 'input.number' || node.type === 'input.integer') && typeof node.parameters.value === 'number') return node.parameters.value
  if (portId === 'values' && node.type === 'input.integer-list') { const values = String(node.parameters.valuesText ?? '').split(',').map(value => Number(value.trim())); return values.length && values.every(value => Number.isFinite(value) && Number.isInteger(value)) ? values : undefined }
  if (portId === 'value' && node.type === 'input.quantity' && typeof node.parameters.value === 'number') return makeQuantity(node.parameters.value, node.parameters.quantityKind as QuantityKind, node.parameters.unit as UnitId)
  if (node.type.startsWith('math.')) return undefined
  if (portId === 'material' && node.type === 'material.concrete' && typeof node.parameters.materialId === 'string' && node.parameters.materialId) return { domainType: 'ConcreteMaterial', id: node.parameters.materialId, name: node.parameters.materialId, properties: {} } satisfies MaterialValue
  if (portId === 'material' && node.type === 'material.structuralSteel' && typeof node.parameters.materialId === 'string' && node.parameters.materialId) return { domainType: 'StructuralSteelMaterial', id: node.parameters.materialId, name: node.parameters.materialId, properties: {} } satisfies MaterialValue
  return undefined
}

export function toReactFlowEdges(graph: KopruqGraph, connectionStyle: ConnectionStyle = 'smooth'): Edge[] {
  return graph.connections.map((connection) => {
    return { id: connection.id, source: connection.sourceNodeId, sourceHandle: connection.sourcePortId, target: connection.targetNodeId, targetHandle: connection.targetPortId, type: connectionStyle === 'smooth' ? 'default' : 'step', animated: false, style: { stroke: getGraphEdgeColor(), strokeWidth: 1.7 } }
  })
}

export function fromReactFlowEdge(edge: Pick<Edge, 'id' | 'source' | 'sourceHandle' | 'target' | 'targetHandle'>): KopruqConnection | undefined {
  if (!edge.source || !edge.sourceHandle || !edge.target || !edge.targetHandle) return undefined
  return { id: edge.id, sourceNodeId: edge.source, sourcePortId: edge.sourceHandle, targetNodeId: edge.target, targetPortId: edge.targetHandle }
}

export function moveNodePositions(nodes: Pick<FlowGraphNode, 'id' | 'position'>[]): Record<string, { x: number; y: number }> {
  return Object.fromEntries(nodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }]))
}
