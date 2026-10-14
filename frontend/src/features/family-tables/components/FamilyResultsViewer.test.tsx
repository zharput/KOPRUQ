import { beforeEach, describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { INITIAL_PROJECT } from '../../project/model/projectWorkspace'
import FamilyResultsViewer from './FamilyResultsViewer'
import { clearFamilySnapshots, getFamilySnapshots, publishFamilySnapshots } from '../../graph/family/familySnapshotStore'
import { graphFingerprint, type FamilyCalculationSnapshot } from '../../graph/family/familyResults'
import { importGraphDocuments } from '../../graph/state/graphStore'
import type { KopruqGraph } from '../../graph/domain/types'
import { resetProjectData, seedProjectData } from '../../../test/projectStoreTestUtils'

const bridges = [{ id: 'bridge-1', no: 'VIA-01' }] as never
const testGraph = (nodes: KopruqGraph['nodes'] = [{ id: 'n1', type: 'structural.girder.precast', name: 'Girder', position: { x: 0, y: 0 }, parameters: { tfValue: 1 } }]): KopruqGraph => ({ id: 'graph-1', bridgeId: 'bridge-1', name: 'G', schemaVersion: 1, nodes, connections: [] })
const setGraph = (graph: KopruqGraph) => importGraphDocuments({ activeGraphId: graph.id, graphs: [graph] })
const snapshot = (freshness: FamilyCalculationSnapshot['freshness']): FamilyCalculationSnapshot => ({ snapshotId: 's', bridgeId: 'bridge-1', graphDocumentId: 'graph-1', sourceNodeId: 'n1', sourceNodeType: 'structural.girder.precast', sourceNodeName: 'Girder', familyCategory: 'GIRDER', graphFingerprint: graphFingerprint(testGraph(), INITIAL_PROJECT.units), candidates: [], generatedAt: '2026-01-01T00:00:00Z', freshness, executionStatus: 'SUCCESS', errors: [] })

beforeEach(() => {
  clearFamilySnapshots(); resetProjectData()
  setGraph(testGraph())
})

describe('FamilyResultsViewer freshness', () => {
  it('shows a STALE badge for a stale snapshot and does not present it as current', () => {
    publishFamilySnapshots([snapshot('STALE')])
    render(<FamilyResultsViewer bridges={bridges} projectUnits={INITIAL_PROJECT.units} />)
    expect(screen.getByText('STALE')).toBeInTheDocument(); expect(screen.getByText(/not current/i)).toBeInTheDocument()
  })
  it('updates the badge when snapshots change', () => {
    publishFamilySnapshots([snapshot('VALID')])
    render(<FamilyResultsViewer bridges={bridges} projectUnits={INITIAL_PROJECT.units} />)
    expect(screen.queryByText(/not current/i)).not.toBeInTheDocument()
    act(() => publishFamilySnapshots([snapshot('FAILED')]))
    expect(screen.getByText('FAILED')).toBeInTheDocument()
  })
})

describe('FamilyResultsViewer read-time freshness', () => {
  const mm = { ...INITIAL_PROJECT.units, length: 'mm' }
  it('keeps a VALID snapshot VALID for the same graph and units (no false STALE)', () => {
    publishFamilySnapshots([snapshot('VALID')])
    render(<FamilyResultsViewer bridges={bridges} projectUnits={INITIAL_PROJECT.units} />)
    expect(screen.getByText('VALID')).toBeInTheDocument(); expect(screen.queryByText(/not current/i)).not.toBeInTheDocument()
  })
  it('becomes STALE when the project length unit changes, without the graph screen and without marking the store', () => {
    publishFamilySnapshots([snapshot('VALID')])
    const view = render(<FamilyResultsViewer bridges={bridges} projectUnits={INITIAL_PROJECT.units} />)
    view.rerender(<FamilyResultsViewer bridges={bridges} projectUnits={mm} />)
    expect(screen.getByText('STALE')).toBeInTheDocument(); expect(screen.getByText(/not current/i)).toBeInTheDocument()
    expect(getFamilySnapshots('bridge-1', 'graph-1')[0].freshness).toBe('VALID')
    view.rerender(<FamilyResultsViewer bridges={bridges} projectUnits={INITIAL_PROJECT.units} />)
    expect(screen.getByText('VALID')).toBeInTheDocument()
  })
  it('becomes STALE when the graph store changes and VALID again when the change is reverted', () => {
    publishFamilySnapshots([snapshot('VALID')])
    render(<FamilyResultsViewer bridges={bridges} projectUnits={INITIAL_PROJECT.units} />)
    act(() => setGraph(testGraph([{ id: 'n1', type: 'structural.girder.precast', name: 'Girder', position: { x: 0, y: 0 }, parameters: { tfValue: 2 } }])))
    expect(screen.getByText('STALE')).toBeInTheDocument(); expect(screen.getByText(/not current/i)).toBeInTheDocument()
    act(() => setGraph(testGraph()))
    expect(screen.getByText('VALID')).toBeInTheDocument(); expect(screen.queryByText(/not current/i)).not.toBeInTheDocument()
  })
  it('never shows a stored STALE or FAILED snapshot as VALID', () => {
    publishFamilySnapshots([snapshot('FAILED')])
    render(<FamilyResultsViewer bridges={bridges} projectUnits={INITIAL_PROJECT.units} />)
    expect(screen.getByText('FAILED')).toBeInTheDocument()
  })
})

describe('FamilyResultsViewer count parameters', () => {
  it('shows a piled-foundation pile count without length conversion under a mm project unit', () => {
    seedProjectData('workspace', ({ project: { ...INITIAL_PROJECT, units: { ...INITIAL_PROJECT.units, length: 'mm' } }, bridges: [] }))
    const piledGraph = testGraph([{ id: 'n1', type: 'substructure.foundation.piled', name: 'Piled', position: { x: 0, y: 0 }, parameters: { pileCountXValue: 4 } }]), mmUnits = { ...INITIAL_PROJECT.units, length: 'mm' }
    setGraph(piledGraph)
    publishFamilySnapshots([{ ...snapshot('VALID'), graphFingerprint: graphFingerprint(piledGraph, mmUnits), sourceNodeType: 'substructure.foundation.piled', familyCategory: 'FOUNDATION' }])
    render(<FamilyResultsViewer bridges={bridges} projectUnits={mmUnits} />)
    fireEvent.click(screen.getByRole('button', { name: /Piled Foundation/ }))
    const row = within(screen.getByTestId('family-parameters-panel')).getByText('pileCountX').closest('tr')!
    expect(within(row).getAllByText('4.00').length).toBeGreaterThan(0)
    expect(row.textContent).not.toContain('4000')
  })
})
