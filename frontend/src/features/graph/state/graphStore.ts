import type { GraphGroup, GraphParameterValue, KopruqConnection, KopruqGraph, KopruqNode } from '../domain/types'
import { validateConnection } from '../engine/graphEngine'
import { createNode, getNodeDefinition } from '../registry/nodeRegistry'
import { onProjectSwitch } from '../../../shared/project-store/activeProject'
import { readProjectUnits } from '../../project/model/projectWorkspace'
import { GRAPH_SERVER_COLLECTION } from './graphServerCollection'

const EVENT = 'kopruq:graph-store-changed'
export type GraphDocuments = { activeGraphId: string; graphs: KopruqGraph[] }
export type GraphStoreSnapshot = GraphDocuments & { canUndo: boolean; canRedo: boolean }
const undo = new Map<string, KopruqGraph[]>(), redo = new Map<string, KopruqGraph[]>()
const subscribers = new Set<() => void>()
// The graph documents are the server collection (one PUT per graph). Only the active graph id, a placeholder graph for a project
// without graphs, the undo/redo history and the drag start live here, in memory; a project switch resets all of them.
let activeGraphId: string | undefined
let placeholder: KopruqGraph | undefined
let documentsCache: { list: readonly KopruqGraph[]; activeGraphId: string | undefined; placeholder: KopruqGraph | undefined; value: GraphDocuments } | undefined
let dragStart: KopruqGraph | undefined
let snapshot: GraphStoreSnapshot | undefined

export function createEmptyGraph(name = 'Untitled Graph', ownership?: Pick<KopruqGraph, 'projectId' | 'bridgeId'>): KopruqGraph {
  return { id: globalThis.crypto?.randomUUID?.() ?? `graph-${Date.now()}-${Math.random().toString(36).slice(2)}`, name, schemaVersion: 1, ...ownership, nodes: [], connections: [], groups: [] }
}
export function serializeGraph(graph: KopruqGraph): string { return JSON.stringify(graph, null, 2) }
export function deserializeGraph(raw: string): KopruqGraph {
  const graph = JSON.parse(raw) as KopruqGraph
  if (graph.schemaVersion !== 1 || typeof graph.id !== 'string' || typeof graph.name !== 'string' || !Array.isArray(graph.nodes) || !Array.isArray(graph.connections)) throw new Error('Unsupported or invalid KOPRUQ graph document.')
  return graph
}
function getDocuments(): GraphDocuments {
  const list = GRAPH_SERVER_COLLECTION.list()
  if (documentsCache && documentsCache.list === list && documentsCache.activeGraphId === activeGraphId && documentsCache.placeholder === placeholder) return documentsCache.value
  let graphs: KopruqGraph[]
  if (list.length > 0) graphs = [...list]
  else { placeholder ??= createEmptyGraph(); graphs = [placeholder] }
  const value = { activeGraphId: graphs.some((graph) => graph.id === activeGraphId) ? activeGraphId as string : graphs[0].id, graphs }
  documentsCache = { list, activeGraphId, placeholder, value }
  return value
}
export function getGraphStoreSnapshot(): GraphStoreSnapshot {
  if (!snapshot) refreshSnapshot()
  return snapshot as GraphStoreSnapshot
}
function refreshSnapshot() {
  const state = getDocuments()
  snapshot = { ...state, canUndo: (undo.get(state.activeGraphId)?.length ?? 0) > 0, canRedo: (redo.get(state.activeGraphId)?.length ?? 0) > 0 }
}
function notify() {
  refreshSnapshot()
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT))
  subscribers.forEach((listener) => listener())
}
// Every change of the collection (own write, server confirmation, hydrate, discard) refreshes the snapshot and notifies.
let collectionNotified = false
GRAPH_SERVER_COLLECTION.subscribe(() => { collectionNotified = true; notify() })
// A project switch drops the in-memory state without notification; the collection is hydrated right after and notifies.
onProjectSwitch(() => { undo.clear(); redo.clear(); dragStart = undefined; activeGraphId = undefined; placeholder = undefined; documentsCache = undefined; snapshot = undefined })
/**
 * Writes the whole graph list (only new or changed graphs are sent). false: no open project or a graph cannot be represented
 * on the wire; nothing changes then. The active graph id is applied before the notification.
 */
function commit(graphs: KopruqGraph[], nextActiveGraphId = getDocuments().activeGraphId, history?: { id: string; undo: KopruqGraph[]; redo: KopruqGraph[] }): boolean {
  const before = { activeGraphId, undo: history ? undo.get(history.id) : undefined, redo: history ? redo.get(history.id) : undefined }
  activeGraphId = nextActiveGraphId
  if (history) { undo.set(history.id, history.undo); redo.set(history.id, history.redo) }
  collectionNotified = false
  if (!GRAPH_SERVER_COLLECTION.write(graphs)) {
    activeGraphId = before.activeGraphId
    if (history) { if (before.undo) undo.set(history.id, before.undo); else undo.delete(history.id); if (before.redo) redo.set(history.id, before.redo); else redo.delete(history.id) }
    return false
  }
  placeholder = undefined
  if (!collectionNotified) notify()
  return true
}
export function subscribeGraphStore(listener: () => void) {
  subscribers.add(listener)
  return () => { subscribers.delete(listener) }
}
export function getActiveGraph() { const state = getDocuments(); return state.graphs.find((graph) => graph.id === state.activeGraphId) ?? state.graphs[0] }
function replaceActiveGraph(next: KopruqGraph, history = true): boolean {
  const previous = getActiveGraph()
  const graphs = getDocuments().graphs.map((graph) => graph.id === previous.id ? next : graph)
  if (history && !dragStart) {
    if (graphDiagnosticsEnabled()) console.count('[graph diagnostics] history commit')
    return commit(graphs, undefined, { id: previous.id, undo: [...(undo.get(previous.id) ?? []), structuredClone(previous)].slice(-100), redo: [] })
  }
  return commit(graphs)
}
export function addNode(type: string, position: { x: number; y: number }) {
  const definition = getNodeDefinition(type); if (!definition) return
  const graph = getActiveGraph(), count = graph.nodes.filter((node) => node.type === type).length + 1
  const projectUnits = readProjectUnits()
  const node = createNode(definition, { id: globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: `${definition.label}-${count}`, position, projectUnits })
  if (graphDiagnosticsEnabled()) console.count('[graph diagnostics] node insertion')
  replaceActiveGraph({ ...graph, nodes: [...graph.nodes, node] })
  return node.id
}
export function updateNode(id: string, change: (node: KopruqNode) => KopruqNode) { const graph = getActiveGraph(); replaceActiveGraph({ ...graph, nodes: graph.nodes.map((node) => node.id === id ? change(node) : node) }) }
export function setNodeParameter(id: string, key: string, value: GraphParameterValue) { updateNode(id, (node) => ({ ...node, parameters: { ...node.parameters, [key]: value } })) }
export function deleteNodes(ids: string[]) { const graph = getActiveGraph(), selected = new Set(ids); const groups = (graph.groups ?? []).map(group => ({ ...group, nodeIds: group.nodeIds.filter(id => !selected.has(id)) })).filter(group => group.nodeIds.length >= 2); replaceActiveGraph({ ...graph, nodes: graph.nodes.filter((node) => !selected.has(node.id)), connections: graph.connections.filter((edge) => !selected.has(edge.sourceNodeId) && !selected.has(edge.targetNodeId)), groups }) }
export function createGraphGroup(nodeIds: string[], name?: string) {
  const graph = getActiveGraph(), ids = [...new Set(nodeIds)], existing = new Set((graph.groups ?? []).flatMap(group => group.nodeIds))
  if (ids.length < 2 || ids.some(id => existing.has(id)) || ids.some(id => !graph.nodes.some(node => node.id === id))) return undefined
  const index = (graph.groups ?? []).length
  const group: GraphGroup = { id: `group-${String(index + 1).padStart(3, '0')}`, name: name?.trim() || `Group ${index + 1}`, nodeIds: ids, color: ['#5C7C99', '#6F8F72', '#8A6F91', '#9A7658', '#7A8796', '#8C6D6D', '#6F8790', '#857A5C'][index % 8] }
  replaceActiveGraph({ ...graph, groups: [...(graph.groups ?? []), group] }); return group.id
}
export function updateGraphGroup(id: string, change: (group: GraphGroup) => GraphGroup) { const graph = getActiveGraph(); replaceActiveGraph({ ...graph, groups: (graph.groups ?? []).map(group => group.id === id ? change(group) : group) }) }
export function ungroupGraph(id: string) { const graph = getActiveGraph(); replaceActiveGraph({ ...graph, groups: (graph.groups ?? []).filter(group => group.id !== id) }) }
export function addConnection(connection: KopruqConnection) {
  const graph = getActiveGraph()
  if (graph.connections.some(item => item.id === connection.id || (item.sourceNodeId === connection.sourceNodeId && item.sourcePortId === connection.sourcePortId && item.targetNodeId === connection.targetNodeId && item.targetPortId === connection.targetPortId))) return false
  const validationGraph = { ...graph, connections: graph.connections.filter(item => item.targetNodeId !== connection.targetNodeId || item.targetPortId !== connection.targetPortId) }
  if (validateConnection(validationGraph, connection)) return false
  if (graphDiagnosticsEnabled()) console.count('[graph diagnostics] edge insertion')
  replaceActiveGraph({ ...graph, connections: [...validationGraph.connections, connection] })
  return true
}
/** Replace or remove an existing edge as one authoring/history transaction. */
export function reconnectConnection(edgeId: string, replacement?: Omit<KopruqConnection, 'id'>) {
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
export function pasteGraphSelection(nodes: KopruqNode[], connections: KopruqConnection[]) {
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
export function moveGraphGroup(id: string, delta: { x: number; y: number }) {
  const graph = getActiveGraph(), group = (graph.groups ?? []).find(item => item.id === id)
  if (!group) return
  updatePositions(Object.fromEntries(group.nodeIds.flatMap(nodeId => { const node = graph.nodes.find(item => item.id === nodeId); return node ? [[nodeId, { x: node.position.x + delta.x, y: node.position.y + delta.y }]] : [] })))
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
  commit(getDocuments().graphs.map((graph) => graph.id === current.id ? previous : graph), undefined, { id: current.id, undo: past.slice(0, -1), redo: [...(redo.get(current.id) ?? []), structuredClone(current)] })
}
export function redoGraph() {
  const current = getActiveGraph(), future = redo.get(current.id) ?? []
  if (!future.length) return
  const next = future[future.length - 1]
  commit(getDocuments().graphs.map((graph) => graph.id === current.id ? next : graph), undefined, { id: current.id, undo: [...(undo.get(current.id) ?? []), structuredClone(current)], redo: future.slice(0, -1) })
}
export function renameActiveGraph(name: string) { const graph = getActiveGraph(); commit(getDocuments().graphs.map((item) => item.id === graph.id ? { ...item, name } : item)) }
export function createGraphDocument(name = 'Untitled Graph') { const graph = createEmptyGraph(name); commit([...getDocuments().graphs, graph], graph.id); return graph.id }
export function selectGraphDocument(id: string) { if (!getDocuments().graphs.some((graph) => graph.id === id)) return; activeGraphId = id; notify() }

export function getGraphForBridge(bridgeId: string) {
  return getDocuments().graphs.find((graph) => graph.bridgeId === bridgeId)
}

/** Select an existing bridge graph or create exactly one empty primary graph. */
export function selectOrCreateBridgeGraph(bridgeId: string, projectId?: string, name = bridgeId) {
  const existing = getGraphForBridge(bridgeId)
  if (existing) { selectGraphDocument(existing.id); return existing.id }
  const graph = createEmptyGraph(name, { bridgeId, ...(projectId ? { projectId } : {}) })
  commit([...getDocuments().graphs, graph], graph.id)
  return graph.id
}

function graphDiagnosticsEnabled() { return import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('graphDiagnostics') }
