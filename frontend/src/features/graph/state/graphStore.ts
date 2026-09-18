import type { GraphParameterValue, SpanovaConnection, SpanovaGraph, SpanovaNode } from '../domain/types'
import { validateConnection } from '../engine/graphEngine'
import { getNodeDefinition } from '../registry/nodeRegistry'
import { readProjectState } from '../../project/model/projectWorkspace'

const STORAGE_KEY = 'spanova.graph.documents.v1'
const EVENT = 'spanova:graph-store-changed'
export type GraphDocuments = { activeGraphId: string; graphs: SpanovaGraph[] }
export type GraphStoreSnapshot = GraphDocuments & { canUndo: boolean; canRedo: boolean }
const undo = new Map<string, SpanovaGraph[]>(), redo = new Map<string, SpanovaGraph[]>()
const subscribers = new Set<() => void>()
let documents: GraphDocuments | undefined
let dragStart: SpanovaGraph | undefined
let snapshot: GraphStoreSnapshot | undefined

export function createEmptyGraph(name = 'Untitled Graph'): SpanovaGraph {
  return { id: globalThis.crypto?.randomUUID?.() ?? `graph-${Date.now()}-${Math.random().toString(36).slice(2)}`, name, schemaVersion: 1, nodes: [], connections: [] }
}
export function serializeGraph(graph: SpanovaGraph): string { return JSON.stringify(graph, null, 2) }
export function deserializeGraph(raw: string): SpanovaGraph {
  const graph = JSON.parse(raw) as SpanovaGraph
  if (graph.schemaVersion !== 1 || typeof graph.id !== 'string' || typeof graph.name !== 'string' || !Array.isArray(graph.nodes) || !Array.isArray(graph.connections)) throw new Error('Unsupported or invalid SPANOVA graph document.')
  return graph
}
function readDocuments(): GraphDocuments {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as GraphDocuments | null
    if (saved && Array.isArray(saved.graphs) && saved.graphs.every((graph) => graph.schemaVersion === 1 && Array.isArray(graph.nodes) && Array.isArray(graph.connections))) {
      const graphs = saved.graphs.length ? saved.graphs : [createEmptyGraph()]
      return { activeGraphId: graphs.some((graph) => graph.id === saved.activeGraphId) ? saved.activeGraphId : graphs[0].id, graphs }
    }
  } catch { /* start a new graph without discarding unrelated app state */ }
  const graph = createEmptyGraph()
  return { activeGraphId: graph.id, graphs: [graph] }
}
function getDocuments() { return documents ??= readDocuments() }
export function getGraphStoreSnapshot(): GraphStoreSnapshot {
  if (!snapshot) {
    const state = getDocuments()
    snapshot = { ...state, canUndo: (undo.get(state.activeGraphId)?.length ?? 0) > 0, canRedo: (redo.get(state.activeGraphId)?.length ?? 0) > 0 }
  }
  return snapshot
}
function refreshSnapshot() {
  const state = getDocuments()
  snapshot = { ...state, canUndo: (undo.get(state.activeGraphId)?.length ?? 0) > 0, canRedo: (redo.get(state.activeGraphId)?.length ?? 0) > 0 }
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(getDocuments())) } catch { /* keep active in-memory graph */ }
}
export function persistGraphStore() { persist() }
function notify() {
  refreshSnapshot(); persist()
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT))
  subscribers.forEach((listener) => listener())
}
export function subscribeGraphStore(listener: () => void) {
  subscribers.add(listener)
  if (typeof window !== 'undefined') {
    const sync = () => { documents = readDocuments(); notify() }
    window.addEventListener('storage', sync)
    return () => { subscribers.delete(listener); window.removeEventListener('storage', sync) }
  }
  return () => subscribers.delete(listener)
}
export function getActiveGraph() { const state = getDocuments(); return state.graphs.find((graph) => graph.id === state.activeGraphId) ?? state.graphs[0] }
function replaceActiveGraph(next: SpanovaGraph, history = true) {
  const previous = getActiveGraph()
  if (history && !dragStart) { if (graphDiagnosticsEnabled()) console.count('[graph diagnostics] history commit'); undo.set(previous.id, [...(undo.get(previous.id) ?? []), structuredClone(previous)].slice(-100)); redo.set(previous.id, []) }
  documents = { ...getDocuments(), graphs: getDocuments().graphs.map((graph) => graph.id === previous.id ? next : graph) }
  notify()
}
export function addNode(type: string, position: { x: number; y: number }) {
  const definition = getNodeDefinition(type); if (!definition) return
  const graph = getActiveGraph(), count = graph.nodes.filter((node) => node.type === type).length + 1
  const projectUnits = typeof localStorage === 'undefined' ? undefined : readProjectState([]).project.units
  const node: SpanovaNode = { id: globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-${Math.random().toString(36).slice(2)}`, type, name: `${definition.label}-${count}`, position, parameters: definition.createDefaultParameters(projectUnits) }
  if (graphDiagnosticsEnabled()) console.count('[graph diagnostics] node insertion')
  replaceActiveGraph({ ...graph, nodes: [...graph.nodes, node] })
  return node.id
}
export function updateNode(id: string, change: (node: SpanovaNode) => SpanovaNode) { const graph = getActiveGraph(); replaceActiveGraph({ ...graph, nodes: graph.nodes.map((node) => node.id === id ? change(node) : node) }) }
export function setNodeParameter(id: string, key: string, value: GraphParameterValue) { updateNode(id, (node) => ({ ...node, parameters: { ...node.parameters, [key]: value } })) }
export function deleteNodes(ids: string[]) { const graph = getActiveGraph(), selected = new Set(ids); replaceActiveGraph({ ...graph, nodes: graph.nodes.filter((node) => !selected.has(node.id)), connections: graph.connections.filter((edge) => !selected.has(edge.sourceNodeId) && !selected.has(edge.targetNodeId)) }) }
export function addConnection(connection: SpanovaConnection) {
  const graph = getActiveGraph()
  if (graph.connections.some(item => item.id === connection.id || (item.sourceNodeId === connection.sourceNodeId && item.sourcePortId === connection.sourcePortId && item.targetNodeId === connection.targetNodeId && item.targetPortId === connection.targetPortId))) return false
  const validationGraph = { ...graph, connections: graph.connections.filter(item => item.targetNodeId !== connection.targetNodeId || item.targetPortId !== connection.targetPortId) }
  if (validateConnection(validationGraph, connection)) return false
  if (graphDiagnosticsEnabled()) console.count('[graph diagnostics] edge insertion')
  replaceActiveGraph({ ...graph, connections: [...validationGraph.connections, connection] })
  return true
}
/** Replace or remove an existing edge as one authoring/history transaction. */
export function reconnectConnection(edgeId: string, replacement?: Omit<SpanovaConnection, 'id'>) {
  const graph = getActiveGraph(), existing = graph.connections.find(edge => edge.id === edgeId)
  if (!existing) return false
  const withoutEdge = graph.connections.filter(edge => edge.id !== edgeId)
  if (!replacement || (replacement.sourceNodeId === existing.sourceNodeId && replacement.sourcePortId === existing.sourcePortId && replacement.targetNodeId === existing.targetNodeId && replacement.targetPortId === existing.targetPortId)) {
    replaceActiveGraph({ ...graph, connections: withoutEdge })
    return true
  }
  const candidate = { ...replacement, id: existing.id }
  const validationGraph = { ...graph, connections: withoutEdge.filter(edge => edge.targetNodeId !== candidate.targetNodeId || edge.targetPortId !== candidate.targetPortId) }
  if (validateConnection(validationGraph, candidate)) return false
  replaceActiveGraph({ ...graph, connections: [...validationGraph.connections, candidate] })
  return true
}
/** Commit a pasted subgraph in one GraphStore history operation. */
export function pasteGraphSelection(nodes: SpanovaNode[], connections: SpanovaConnection[]) {
  if (!nodes.length) return []
  const graph = getActiveGraph()
  const ids = new Set(nodes.map(node => node.id))
  const internalConnections = connections.filter(edge => ids.has(edge.sourceNodeId) && ids.has(edge.targetNodeId))
  if (graphDiagnosticsEnabled()) { console.count('[graph diagnostics] node batch insertion'); console.count('[graph diagnostics] edge batch insertion') }
  replaceActiveGraph({ ...graph, nodes: [...graph.nodes, ...structuredClone(nodes)], connections: [...graph.connections, ...structuredClone(internalConnections)] })
  return nodes.map(node => node.id)
}
export function deleteConnections(ids: string[]) { const graph = getActiveGraph(), selected = new Set(ids); replaceActiveGraph({ ...graph, connections: graph.connections.filter((edge) => !selected.has(edge.id)) }) }
export function updatePositions(positions: Record<string, { x: number; y: number }>) {
  const graph = getActiveGraph()
  replaceActiveGraph({ ...graph, nodes: graph.nodes.map((node) => positions[node.id] ? { ...node, position: positions[node.id] } : node) }, false)
}
export function beginMoveHistory() { dragStart = structuredClone(getActiveGraph()) }
export function endMoveHistory() {
  if (!dragStart) return
  const current = getActiveGraph()
  if (JSON.stringify(dragStart.nodes.map((node) => node.position)) !== JSON.stringify(current.nodes.map((node) => node.position))) {
    undo.set(current.id, [...(undo.get(current.id) ?? []), dragStart].slice(-100)); redo.set(current.id, []); notify()
  }
  dragStart = undefined
}
export function undoGraph() {
  const current = getActiveGraph(), past = undo.get(current.id) ?? []
  if (!past.length) return
  const previous = past[past.length - 1]
  undo.set(current.id, past.slice(0, -1)); redo.set(current.id, [...(redo.get(current.id) ?? []), structuredClone(current)])
  documents = { ...getDocuments(), graphs: getDocuments().graphs.map((graph) => graph.id === current.id ? previous : graph) }; notify()
}
export function redoGraph() {
  const current = getActiveGraph(), future = redo.get(current.id) ?? []
  if (!future.length) return
  const next = future[future.length - 1]
  redo.set(current.id, future.slice(0, -1)); undo.set(current.id, [...(undo.get(current.id) ?? []), structuredClone(current)])
  documents = { ...getDocuments(), graphs: getDocuments().graphs.map((graph) => graph.id === current.id ? next : graph) }; notify()
}
export function renameActiveGraph(name: string) { const graph = getActiveGraph(); documents = { ...getDocuments(), graphs: getDocuments().graphs.map((item) => item.id === graph.id ? { ...item, name } : item) }; notify() }
export function createGraphDocument(name = 'Untitled Graph') { const graph = createEmptyGraph(name); documents = { ...getDocuments(), activeGraphId: graph.id, graphs: [...getDocuments().graphs, graph] }; notify(); return graph.id }
export function selectGraphDocument(id: string) { if (!getDocuments().graphs.some((graph) => graph.id === id)) return; documents = { ...getDocuments(), activeGraphId: id }; notify() }

function graphDiagnosticsEnabled() { return import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('graphDiagnostics') }
