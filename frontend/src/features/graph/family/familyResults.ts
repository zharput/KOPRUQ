import type { GraphExecutionResult, GraphValue, SpanovaGraph, SpanovaNode } from '../domain/types'

export type FamilyCategory = 'SPAN_ARRANGEMENT' | 'GIRDER' | 'SUPERSTRUCTURE' | 'PIER' | 'PIER_CAP' | 'FOUNDATION' | 'BEARING' | 'ABUTMENT'
export type SnapshotFreshness = 'NO_RESULT' | 'VALID' | 'STALE' | 'FAILED' | 'INCOMPLETE'

export interface FamilyAlternative {
  readonly projectId?: string
  readonly bridgeId: string
  readonly graphDocumentId: string
  readonly sourceNodeId: string
  readonly sourceNodeType: string
  readonly familyCategory: FamilyCategory
  readonly candidateId: string
  readonly candidateData: GraphValue
  readonly validation?: Readonly<Record<string, unknown>>
}

export interface FamilyCalculationSnapshot {
  readonly snapshotId: string
  readonly projectId?: string
  readonly bridgeId: string
  readonly graphDocumentId: string
  readonly sourceNodeId: string
  readonly sourceNodeType: string
  readonly sourceNodeName: string
  readonly familyCategory: FamilyCategory
  readonly graphFingerprint: string
  readonly candidates: readonly FamilyAlternative[]
  readonly generatedAt: string
  readonly freshness: SnapshotFreshness
  readonly executionStatus: 'SUCCESS' | 'FAILED' | 'INCOMPLETE' | 'NO_RESULT'
  readonly errors: readonly string[]
}

const OUTPUT_CATEGORIES: Readonly<Record<string, FamilyCategory>> = {
  'spanArrangementCandidate[]': 'SPAN_ARRANGEMENT',
  'girderCandidate[]': 'GIRDER',
  'superstructureCandidate[]': 'SUPERSTRUCTURE',
  'pierCandidate[]': 'PIER',
  'pierCapCandidate[]': 'PIER_CAP',
  'foundationCandidate[]': 'FOUNDATION',
  'bearingCandidate[]': 'BEARING',
  'abutmentCandidate[]': 'ABUTMENT',
}

export function graphFingerprint(graph: SpanovaGraph): string {
  return stableStringify({ id: graph.id, bridgeId: graph.bridgeId ?? null, nodes: graph.nodes.map(({ id, type, parameters }) => ({ id, type, parameters })).sort(byId), connections: graph.connections.slice().sort(byId).map(({ id, sourceNodeId, sourcePortId, targetNodeId, targetPortId }) => ({ id, sourceNodeId, sourcePortId, targetNodeId, targetPortId })) })
}

export function adaptGraphExecutionToFamilySnapshots(graph: SpanovaGraph, result: GraphExecutionResult, generatedAt = new Date().toISOString()): FamilyCalculationSnapshot[] {
  const fingerprint = graphFingerprint(graph)
  return graph.nodes.flatMap(node => familySnapshotsForNode(graph, node, result, fingerprint, generatedAt))
}

function familySnapshotsForNode(graph: SpanovaGraph, node: SpanovaNode, result: GraphExecutionResult, fingerprint: string, generatedAt: string): FamilyCalculationSnapshot[] {
  const outputs = result.values[node.id]
  const errors = result.errors[node.id] ? [result.errors[node.id]] : []
  if (!outputs) return errors.length ? [makeSnapshot(graph, node, outputCategory(node, 'candidates') ?? 'PIER', fingerprint, [], generatedAt, 'FAILED', errors)] : []
  return Object.entries(outputs).flatMap(([port, value]) => {
    const category = outputCategory(node, port)
    if (!category) return []
    const values = Array.isArray(value) ? value : [value]
    const candidates = values.filter(isObject).map((candidate, index) => alternative(graph, node, category, candidate, index))
    const incomplete = typeof outputs.status === 'string' && outputs.status !== 'COMPLETE' && outputs.status !== 'SUCCESS'
    return [makeSnapshot(graph, node, category, fingerprint, candidates, generatedAt, incomplete ? 'INCOMPLETE' : 'SUCCESS', errors)]
  })
}

function outputCategory(node: SpanovaNode, port: string): FamilyCategory | undefined {
  const definition = node.type
  if (port === 'candidates') {
    if (definition.includes('span_arrangement')) return 'SPAN_ARRANGEMENT'
    if (definition.includes('girder')) return 'GIRDER'
    if (definition.includes('superstructure')) return 'SUPERSTRUCTURE'
    if (definition.includes('pier-cap')) return 'PIER_CAP'
    if (definition.includes('pier')) return 'PIER'
    if (definition.includes('foundation')) return 'FOUNDATION'
    if (definition.includes('bearing')) return 'BEARING'
    if (definition.includes('abutment')) return 'ABUTMENT'
  }
  return OUTPUT_CATEGORIES[port]
}

function alternative(graph: SpanovaGraph, node: SpanovaNode, familyCategory: FamilyCategory, candidateData: GraphValue, index: number): FamilyAlternative {
  const candidateId = isObject(candidateData) && typeof candidateData.id === 'string' ? candidateData.id : `${node.id}:${index}`
  return { ...(graph.projectId ? { projectId: graph.projectId } : {}), bridgeId: graph.bridgeId ?? '', graphDocumentId: graph.id, sourceNodeId: node.id, sourceNodeType: node.type, familyCategory, candidateId, candidateData }
}

function makeSnapshot(graph: SpanovaGraph, node: SpanovaNode, familyCategory: FamilyCategory, fingerprint: string, candidates: FamilyAlternative[], generatedAt: string, status: 'SUCCESS' | 'FAILED' | 'INCOMPLETE', errors: string[]): FamilyCalculationSnapshot {
  const freshness: SnapshotFreshness = status === 'SUCCESS' ? candidates.length ? 'VALID' : 'NO_RESULT' : status
  return { snapshotId: `${graph.bridgeId ?? 'unassigned'}:${graph.id}:${node.id}:${familyCategory}`, ...(graph.projectId ? { projectId: graph.projectId } : {}), bridgeId: graph.bridgeId ?? '', graphDocumentId: graph.id, sourceNodeId: node.id, sourceNodeType: node.type, sourceNodeName: node.name, familyCategory, graphFingerprint: fingerprint, candidates, generatedAt, freshness, executionStatus: status, errors }
}

function isObject(value: GraphValue): value is GraphValue & Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function byId(a: { id: string }, b: { id: string }) { return a.id.localeCompare(b.id) }
function stableStringify(value: unknown): string { if (value === null || typeof value !== 'object') return JSON.stringify(value); if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`; return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}` }
