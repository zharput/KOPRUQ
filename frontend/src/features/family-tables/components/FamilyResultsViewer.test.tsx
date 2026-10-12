import { beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import FamilyResultsViewer from './FamilyResultsViewer'
import { clearFamilySnapshots, publishFamilySnapshots } from '../../graph/family/familySnapshotStore'
import type { FamilyCalculationSnapshot } from '../../graph/family/familyResults'

const bridges = [{ id: 'bridge-1', no: 'VIA-01' }] as never
const snapshot = (freshness: FamilyCalculationSnapshot['freshness']): FamilyCalculationSnapshot => ({ snapshotId: 's', bridgeId: 'bridge-1', graphDocumentId: 'graph-1', sourceNodeId: 'n1', sourceNodeType: 'structural.girder.precast', sourceNodeName: 'Girder', familyCategory: 'GIRDER', graphFingerprint: 'fp', candidates: [], generatedAt: '2026-01-01T00:00:00Z', freshness, executionStatus: 'SUCCESS', errors: [] })

beforeEach(() => {
  clearFamilySnapshots(); localStorage.clear()
  localStorage.setItem('kopruq.graph.documents.v1', JSON.stringify({ activeGraphId: 'graph-1', graphs: [{ id: 'graph-1', bridgeId: 'bridge-1', name: 'G', schemaVersion: 1, nodes: [], connections: [] }] }))
})

describe('FamilyResultsViewer freshness', () => {
  it('shows a STALE badge for a stale snapshot and does not present it as current', () => {
    publishFamilySnapshots([snapshot('STALE')])
    render(<FamilyResultsViewer bridges={bridges} />)
    expect(screen.getByText('STALE')).toBeInTheDocument(); expect(screen.getByText(/not current/i)).toBeInTheDocument()
  })
  it('updates the badge when snapshots change', () => {
    publishFamilySnapshots([snapshot('VALID')])
    render(<FamilyResultsViewer bridges={bridges} />)
    expect(screen.queryByText(/not current/i)).not.toBeInTheDocument()
    act(() => publishFamilySnapshots([snapshot('FAILED')]))
    expect(screen.getByText('FAILED')).toBeInTheDocument()
  })
})
