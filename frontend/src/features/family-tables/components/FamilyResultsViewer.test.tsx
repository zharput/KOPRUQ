import { beforeEach, describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { INITIAL_PROJECT } from '../../project/model/projectWorkspace'
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

describe('FamilyResultsViewer count parameters', () => {
  it('shows a piled-foundation pile count without length conversion under a mm project unit', () => {
    localStorage.setItem('kopruq.project-workspace.v1', JSON.stringify({ project: { ...INITIAL_PROJECT, units: { ...INITIAL_PROJECT.units, length: 'mm' } }, bridges: [] }))
    localStorage.setItem('kopruq.graph.documents.v1', JSON.stringify({ activeGraphId: 'graph-1', graphs: [{ id: 'graph-1', bridgeId: 'bridge-1', name: 'G', schemaVersion: 1, nodes: [{ id: 'n1', type: 'substructure.foundation.piled', name: 'Piled', position: { x: 0, y: 0 }, parameters: { pileCountXValue: 4 } }], connections: [] }] }))
    publishFamilySnapshots([{ ...snapshot('VALID'), sourceNodeType: 'substructure.foundation.piled', familyCategory: 'FOUNDATION' }])
    render(<FamilyResultsViewer bridges={bridges} />)
    fireEvent.click(screen.getByRole('button', { name: /Piled Foundation/ }))
    const row = within(screen.getByTestId('family-parameters-panel')).getByText('pileCountX').closest('tr')!
    expect(within(row).getAllByText('4.00').length).toBeGreaterThan(0)
    expect(row.textContent).not.toContain('4000')
  })
})
