import { beforeEach, describe, expect, it } from 'vitest'
import { adaptGraphExecutionToFamilySnapshots, graphFingerprint } from './familyResults'
import { clearFamilySnapshots, getFamilyAlternatives, getFamilySnapshot, getFamilySnapshots, markFamilySnapshotsStale, publishFamilySnapshots } from './familySnapshotStore'
import type { GraphExecutionResult, KopruqGraph } from '../domain/types'

const graph: KopruqGraph = { id: 'graph-1', bridgeId: 'bridge-1', name: 'Graph', schemaVersion: 1, nodes: [{ id: 'node-1', type: 'substructure.pier.rectangular', name: 'Pier', position: { x: 0, y: 0 }, parameters: {} }], connections: [] }
const result: GraphExecutionResult = { values: { 'node-1': { candidates: [{ id: 'c-1', pierType: 'RECTANGULAR', geometry: {}, columnCount: 1, heightM: 1, material: { domainType: 'ConcreteMaterial', id: 'm', name: 'C', properties: {} } }] } }, resolvedInputs: {}, watchValues: {}, errors: {}, logs: [] }

describe('Family snapshot runtime store', () => {
  beforeEach(() => clearFamilySnapshots())

  it('queries by bridge, graph, source and category', () => {
    publishFamilySnapshots(adaptGraphExecutionToFamilySnapshots(graph, result))
    expect(getFamilySnapshots('bridge-1', 'graph-1')).toHaveLength(1)
    expect(getFamilySnapshot('bridge-1', 'graph-1', 'node-1')?.familyCategory).toBe('PIER')
    expect(getFamilyAlternatives('bridge-1', 'graph-1', 'PIER')).toHaveLength(1)
    expect(getFamilySnapshots('bridge-2', 'graph-1')).toHaveLength(0)
  })

  it('marks an old fingerprint stale and returns no result for an unknown source', () => {
    publishFamilySnapshots(adaptGraphExecutionToFamilySnapshots(graph, result))
    markFamilySnapshotsStale('bridge-1', 'graph-1', `${graphFingerprint(graph)}-changed`)
    expect(getFamilySnapshot('bridge-1', 'graph-1', 'node-1')?.freshness).toBe('STALE')
    expect(getFamilySnapshot('bridge-1', 'graph-1', 'missing')).toBeUndefined()
  })
})
