import { describe, expect, it } from 'vitest'
import type { GraphExecutionResult, SpanovaGraph } from '../domain/types'
import { adaptGraphExecutionToFamilySnapshots, graphFingerprint } from './familyResults'

const graph = (bridgeId = 'bridge-1', parameter = 3): SpanovaGraph => ({ id: 'graph-1', bridgeId, projectId: 'project-1', name: 'Graph', schemaVersion: 1, nodes: [{ id: 'pier-1', type: 'substructure.pier.rectangular', name: 'Pier', position: { x: 10, y: 20 }, parameters: { widthValue: parameter, widthUnit: 'm' } }], connections: [] })
const result = (candidateId = 'candidate-1'): GraphExecutionResult => ({ values: { 'pier-1': { candidates: [{ id: candidateId, pierType: 'RECTANGULAR', geometry: { width: 3, depth: 1.5 }, columnCount: 1, heightM: 10, material: { domainType: 'ConcreteMaterial', id: 'c40', name: 'C40/50', properties: {} } }] } }, resolvedInputs: {}, watchValues: {}, errors: {}, logs: [] })

describe('Family calculation result adapter', () => {
  it('preserves candidate data and source identity', () => {
    const snapshot = adaptGraphExecutionToFamilySnapshots(graph(), result())[0]
    expect(snapshot).toMatchObject({ bridgeId: 'bridge-1', graphDocumentId: 'graph-1', sourceNodeId: 'pier-1', familyCategory: 'PIER', freshness: 'VALID' })
    expect(snapshot.candidates[0].candidateData).toEqual((result().values['pier-1'] as { candidates: unknown[] }).candidates[0])
  })

  it('keeps fingerprints independent from canvas position but changes them for parameters', () => {
    const moved = graph(); moved.nodes[0] = { ...moved.nodes[0], position: { x: 900, y: 800 } }
    expect(graphFingerprint(graph())).toBe(graphFingerprint(moved))
    expect(graphFingerprint(graph())).not.toBe(graphFingerprint(graph('bridge-1', 4)))
  })

  it('isolates the same candidate id by bridge and source graph identity', () => {
    const first = adaptGraphExecutionToFamilySnapshots(graph('bridge-1'), result('same'))[0].candidates[0]
    const second = adaptGraphExecutionToFamilySnapshots(graph('bridge-2'), result('same'))[0].candidates[0]
    expect(first.candidateId).toBe(second.candidateId)
    expect(first.bridgeId).not.toBe(second.bridgeId)
  })
})
