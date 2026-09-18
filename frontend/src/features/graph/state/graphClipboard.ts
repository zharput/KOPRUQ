import type { SpanovaConnection, SpanovaGraph, SpanovaNode } from '../domain/types'

export interface GraphClipboard { readonly nodes: readonly SpanovaNode[]; readonly connections: readonly SpanovaConnection[] }
export interface ClonedGraphSelection { readonly nodes: SpanovaNode[]; readonly connections: SpanovaConnection[] }

/** React Flow may emit freshly allocated arrays, and may reorder selected IDs between updates. */
export function sameGraphSelection(current: readonly string[], next: readonly string[]) {
  return current.length === next.length && current.every(id => next.includes(id))
}

export function copyGraphSelection(graph: SpanovaGraph, selectedNodeIds: readonly string[]): GraphClipboard {
  const selected = new Set(selectedNodeIds)
  const nodes = graph.nodes.filter(node => selected.has(node.id)).map(node => structuredClone(node))
  const included = new Set(nodes.map(node => node.id))
  const connections = graph.connections.filter(edge => included.has(edge.sourceNodeId) && included.has(edge.targetNodeId)).map(edge => structuredClone(edge))
  return { nodes, connections }
}

export function cloneGraphSelection(clipboard: GraphClipboard, offset = 30, createId: () => string = createGraphId): ClonedGraphSelection {
  const idMap = new Map(clipboard.nodes.map(node => [node.id, createId()]))
  const nodes = clipboard.nodes.map(node => ({
    ...structuredClone(node),
    id: idMap.get(node.id)!,
    position: { x: node.position.x + offset, y: node.position.y + offset },
  }))
  const connections = clipboard.connections
    .filter(edge => idMap.has(edge.sourceNodeId) && idMap.has(edge.targetNodeId))
    .map(edge => ({ ...structuredClone(edge), id: createId(), sourceNodeId: idMap.get(edge.sourceNodeId)!, targetNodeId: idMap.get(edge.targetNodeId)! }))
  return { nodes, connections }
}

function createGraphId() { return globalThis.crypto?.randomUUID?.() ?? `graph-copy-${Date.now()}-${Math.random().toString(36).slice(2)}` }
