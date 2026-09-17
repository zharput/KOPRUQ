import type { Edge, Node } from '@xyflow/react'
import type { GraphExecutionState, GraphParameterValue, GraphValue, SpanovaConnection, SpanovaGraph, SpanovaNode } from '../domain/types'
import { getNodeDefinition } from '../registry/nodeRegistry'
import type { ConnectionStyle } from '../state/graphViewPreferences'

export type GraphNodeViewData = {
  node: SpanovaNode
  executionState: GraphExecutionState
  executionError?: string
  output?: GraphValue
  onParameterChange: (nodeId: string, key: string, value: GraphParameterValue) => void
}
export type FlowGraphNode = Node<GraphNodeViewData, 'spanova'>

export function toReactFlowNodes(graph: SpanovaGraph, options: { selectedIds?: string[]; states?: Record<string, GraphExecutionState>; errors?: Record<string, string>; outputs?: Record<string, Record<string, GraphValue>>; onParameterChange: GraphNodeViewData['onParameterChange'] }): FlowGraphNode[] {
  const selectedIds = new Set(options.selectedIds ?? [])
  return graph.nodes.map((node) => ({ id: node.id, type: 'spanova', position: { ...node.position }, selected: selectedIds.has(node.id), data: { node, executionState: options.states?.[node.id] ?? 'idle', executionError: options.errors?.[node.id], output: Object.values(options.outputs?.[node.id] ?? {})[0], onParameterChange: options.onParameterChange } }))
}

export function toReactFlowEdges(graph: SpanovaGraph, connectionStyle: ConnectionStyle = 'smooth'): Edge[] {
  return graph.connections.map((connection) => {
    const type = getNodeDefinition(graph.nodes.find((node) => node.id === connection.sourceNodeId)?.type ?? '')?.outputs.find((port) => port.id === connection.sourcePortId)?.type
    return { id: connection.id, source: connection.sourceNodeId, sourceHandle: connection.sourcePortId, target: connection.targetNodeId, targetHandle: connection.targetPortId, type: connectionStyle === 'smooth' ? 'default' : 'step', animated: false, style: { stroke: portColor(type), strokeWidth: 1.7 } }
  })
}

export function fromReactFlowEdge(edge: Pick<Edge, 'id' | 'source' | 'sourceHandle' | 'target' | 'targetHandle'>): SpanovaConnection | undefined {
  if (!edge.source || !edge.sourceHandle || !edge.target || !edge.targetHandle) return undefined
  return { id: edge.id, sourceNodeId: edge.source, sourcePortId: edge.sourceHandle, targetNodeId: edge.target, targetPortId: edge.targetHandle }
}

export function moveNodePositions(nodes: Pick<FlowGraphNode, 'id' | 'position'>[]): Record<string, { x: number; y: number }> {
  return Object.fromEntries(nodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }]))
}

function portColor(type?: string) { return type === 'boolean' ? '#c18af7' : type?.endsWith('[]') ? '#e4b65c' : type === 'integer' ? '#6bbcc4' : '#4c91ff' }
