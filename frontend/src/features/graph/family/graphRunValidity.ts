import type { KopruqGraph } from '../domain/types'
import type { ProjectUnits } from '../domain/quantities'
import { graphFingerprint, stableStringify, unitsFingerprint } from './familyResults'

export type GraphRunValidity = 'VALID' | 'INVALID'
type PersistedRun = { graphFingerprint: string; completedAt: string; nodeFingerprints?: Record<string, string> }
const STORAGE_KEY = 'kopruq.graph.successful-runs.v1'
function read(): Record<string, PersistedRun> { try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); return value && typeof value === 'object' ? value as Record<string, PersistedRun> : {} } catch { return {} } }
function key(graph: Pick<KopruqGraph, 'bridgeId' | 'id'>) { return `${graph.bridgeId ?? ''}|${graph.id}` }
export function currentEngineeringFingerprint(graph: KopruqGraph, units?: ProjectUnits) { return graphFingerprint(graph, units) }
/**
 * A node's result depends on its own parameters, on everything upstream of it (nodes and the connections that feed them)
 * and on the project units, so its fingerprint covers the whole upstream closure.
 */
function nodeFingerprint(graph: KopruqGraph, nodeId: string, units?: ProjectUnits) {
  if (!graph.nodes.some(item => item.id === nodeId)) return JSON.stringify(null)
  const upstream = new Set<string>([nodeId]), queue = [nodeId]
  while (queue.length) { const current = queue.pop()!; for (const edge of graph.connections) if (edge.targetNodeId === current && !upstream.has(edge.sourceNodeId)) { upstream.add(edge.sourceNodeId); queue.push(edge.sourceNodeId) } }
  const nodes = graph.nodes.filter(item => upstream.has(item.id)).map(({ id, type, parameters }) => ({ id, type, parameters })).sort((a, b) => a.id.localeCompare(b.id))
  const edges = graph.connections.filter(edge => upstream.has(edge.targetNodeId)).map(({ id, sourceNodeId, sourcePortId, targetNodeId, targetPortId }) => ({ id, sourceNodeId, sourcePortId, targetNodeId, targetPortId })).sort((a, b) => a.id.localeCompare(b.id))
  return stableStringify({ nodeId, nodes, edges, units: unitsFingerprint(units) })
}
export function recordSuccessfulGraphRun(graph: KopruqGraph, units?: ProjectUnits, fingerprint = currentEngineeringFingerprint(graph, units)) { const runs = read(); runs[key(graph)] = { graphFingerprint: fingerprint, completedAt: new Date().toISOString(), nodeFingerprints: Object.fromEntries(graph.nodes.map(node => [node.id, nodeFingerprint(graph, node.id, units)])) }; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(runs)) } catch { /* runtime remains valid */ }; return fingerprint }
export function graphRunValidity(graph: KopruqGraph, units?: ProjectUnits, fingerprint = currentEngineeringFingerprint(graph, units)): GraphRunValidity { return read()[key(graph)]?.graphFingerprint === fingerprint ? 'VALID' : 'INVALID' }
export function nodeRunValidity(graph: KopruqGraph, nodeId: string, units?: ProjectUnits): boolean { const run = read()[key(graph)]; return Boolean(run?.nodeFingerprints?.[nodeId] && run.nodeFingerprints[nodeId] === nodeFingerprint(graph, nodeId, units)) }
export function clearSuccessfulGraphRuns() { try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore storage failures */ } }
