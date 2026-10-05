import type { KopruqGraph } from '../domain/types'
import { graphFingerprint } from './familyResults'

export type GraphRunValidity = 'VALID' | 'INVALID'
type PersistedRun = { graphFingerprint: string; completedAt: string; nodeFingerprints?: Record<string, string> }
const STORAGE_KEY = 'kopruq.graph.successful-runs.v1'
function read(): Record<string, PersistedRun> { try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); return value && typeof value === 'object' ? value as Record<string, PersistedRun> : {} } catch { return {} } }
function key(graph: Pick<KopruqGraph, 'bridgeId' | 'id'>) { return `${graph.bridgeId ?? ''}|${graph.id}` }
export function currentEngineeringFingerprint(graph: KopruqGraph) { return graphFingerprint(graph) }
function nodeFingerprint(graph: KopruqGraph, nodeId: string) { const node = graph.nodes.find(item => item.id === nodeId); return JSON.stringify(node ? { id: node.id, type: node.type, parameters: node.parameters } : null) }
export function recordSuccessfulGraphRun(graph: KopruqGraph, fingerprint = currentEngineeringFingerprint(graph)) { const runs = read(); runs[key(graph)] = { graphFingerprint: fingerprint, completedAt: new Date().toISOString(), nodeFingerprints: Object.fromEntries(graph.nodes.map(node => [node.id, nodeFingerprint(graph, node.id)])) }; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(runs)) } catch { /* runtime remains valid */ }; return fingerprint }
export function graphRunValidity(graph: KopruqGraph, fingerprint = currentEngineeringFingerprint(graph)): GraphRunValidity { return read()[key(graph)]?.graphFingerprint === fingerprint ? 'VALID' : 'INVALID' }
export function nodeRunValidity(graph: KopruqGraph, nodeId: string): boolean { const run = read()[key(graph)]; return Boolean(run?.nodeFingerprints?.[nodeId] && run.nodeFingerprints[nodeId] === nodeFingerprint(graph, nodeId)) }
export function clearSuccessfulGraphRuns() { try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore storage failures */ } }
