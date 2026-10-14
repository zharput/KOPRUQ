import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adaptGraphExecutionToFamilySnapshots, graphFingerprint } from './familyResults'
import { clearFamilySnapshots, getFamilyAlternatives, getFamilySnapshot, getFamilySnapshots, markFamilySnapshotsStale, publishFamilySnapshots } from './familySnapshotStore'
import type { GraphExecutionResult, KopruqGraph } from '../domain/types'
import { NEW_PROJECT_DOCUMENT_JSON } from '../../../app/project-session/projectDocumentFixtures'
import { openTestProject } from '../../../test/projectSessionTestUtils'

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

  it('replaces the snapshots of the same graph on publish, so deleted nodes leave no snapshot', () => {
    publishFamilySnapshots(adaptGraphExecutionToFamilySnapshots(graph, result))
    const next: KopruqGraph = { ...graph, nodes: [{ ...graph.nodes[0], id: 'node-2' }] }
    publishFamilySnapshots(adaptGraphExecutionToFamilySnapshots(next, { ...result, values: { 'node-2': result.values['node-1'] } }))
    expect(getFamilySnapshot('bridge-1', 'graph-1', 'node-1')).toBeUndefined(); expect(getFamilySnapshot('bridge-1', 'graph-1', 'node-2')).toBeDefined()
  })

  it('emits kopruq:family-snapshots-changed when snapshots are marked stale, and only then', () => {
    publishFamilySnapshots(adaptGraphExecutionToFamilySnapshots(graph, result))
    const listener = vi.fn(); window.addEventListener('kopruq:family-snapshots-changed', listener)
    markFamilySnapshotsStale('bridge-1', 'graph-1', graphFingerprint(graph)); expect(listener).not.toHaveBeenCalled()
    markFamilySnapshotsStale('bridge-1', 'graph-1', 'other'); expect(listener).toHaveBeenCalledTimes(1)
    markFamilySnapshotsStale('bridge-1', 'graph-1', 'other'); expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener('kopruq:family-snapshots-changed', listener)
  })

  describe('read-time freshness derivation', () => {
    const publish = () => publishFamilySnapshots(adaptGraphExecutionToFamilySnapshots(graph, result))
    it('keeps VALID when the fingerprint matches', () => {
      publish()
      expect(getFamilySnapshots('bridge-1', 'graph-1', graphFingerprint(graph))[0].freshness).toBe('VALID')
    })
    it('derives STALE for a different fingerprint without mutating the store or emitting an event', () => {
      publish()
      const listener = vi.fn(); window.addEventListener('kopruq:family-snapshots-changed', listener)
      expect(getFamilySnapshots('bridge-1', 'graph-1', 'other')[0].freshness).toBe('STALE')
      expect(getFamilySnapshots('bridge-1', 'graph-1', undefined)[0].freshness).toBe('VALID')
      expect(getFamilySnapshot('bridge-1', 'graph-1', 'node-1')?.freshness).toBe('VALID')
      expect(listener).not.toHaveBeenCalled()
      window.removeEventListener('kopruq:family-snapshots-changed', listener)
    })
    it('never upgrades a stored STALE or FAILED snapshot even when the fingerprint matches', () => {
      const fingerprint = graphFingerprint(graph)
      publish(); markFamilySnapshotsStale('bridge-1', 'graph-1', 'other')
      expect(getFamilySnapshots('bridge-1', 'graph-1', fingerprint)[0].freshness).toBe('STALE')
      publishFamilySnapshots([{ ...adaptGraphExecutionToFamilySnapshots(graph, result)[0], freshness: 'FAILED' }])
      expect(getFamilySnapshots('bridge-1', 'graph-1', fingerprint)[0].freshness).toBe('FAILED')
    })
    it('returns the stored snapshots unchanged when called without a fingerprint', () => {
      publish()
      expect(getFamilySnapshots('bridge-1', 'graph-1')).toEqual(adaptGraphExecutionToFamilySnapshots(graph, result).map(item => ({ ...item, generatedAt: expect.any(String) })))
    })
  })

  describe('project switch', () => {
    it('drops every snapshot without a change notification when the project changes', () => {
      publishFamilySnapshots(adaptGraphExecutionToFamilySnapshots(graph, result))
      expect(getFamilySnapshots('bridge-1', 'graph-1')).not.toHaveLength(0)
      const notified = vi.fn()
      window.addEventListener('kopruq:family-snapshots-changed', notified)
      openTestProject(NEW_PROJECT_DOCUMENT_JSON)
      window.removeEventListener('kopruq:family-snapshots-changed', notified)
      expect(getFamilySnapshots('bridge-1', 'graph-1')).toEqual([])
      expect(notified).not.toHaveBeenCalled()
    })
  })
})

