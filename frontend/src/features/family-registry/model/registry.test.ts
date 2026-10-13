import { afterEach, describe, expect, it } from 'vitest'
import { getFamilies, getFamilyReferences } from './registry'

afterEach(() => localStorage.clear())

describe('family registry adapters', () => {
  it('reads stable IDs from the existing family catalogs without introducing a store', () => {
    localStorage.setItem('kopruq.project-design-system.foundation-families', JSON.stringify([{ id: 'F-01', name: 'Pile A', foundationType: 'PILED', enabled: true }]))
    expect(getFamilies('FOUNDATION')).toEqual([{ id: 'F-01', name: 'Pile A', category: 'FOUNDATION', type: 'PILED', enabled: true, summary: 'PILED; pile layout with derived Lx/Ly' }])
    expect(localStorage.getItem('kopruq.family-registry')).toBeNull()
  })

  it('indexes Bridge Definition family-ID references by bridge and axis', () => {
    localStorage.setItem('kopruq.bridge-definitions.v1', JSON.stringify({ definitions: {
      'VIA-01': { axisAssignments: { P1: { pierFamilyId: 'P-01' }, P2: { pierFamilyId: 'P-02' } } },
      'VIA-02': { axisAssignments: { P3: { pierFamilyId: 'P-01' } } },
    } }))
    expect(getFamilyReferences('PIER', 'P-01')).toEqual([{ bridgeId: 'VIA-01', bridgeNo: 'VIA-01', location: 'P1' }, { bridgeId: 'VIA-02', bridgeNo: 'VIA-02', location: 'P3' }])
  })

  it('keeps the stable reference while displaying the renamed bridge number', () => {
    localStorage.setItem('kopruq.project-workspace.v1', JSON.stringify({ bridges: [{ id: 'bridge-1', no: 'VIA-99' }] }))
    localStorage.setItem('kopruq.bridge-definitions.v1', JSON.stringify({ keyBy: 'bridgeId', definitions: {
      'bridge-1': { axisAssignments: { P1: { pierFamilyId: 'P-01' } }, girderFamilyId: 'G-01', abutmentFamilyIds: { A1: 'A-01' } },
    } }))
    expect(getFamilyReferences('PIER', 'P-01')).toEqual([{ bridgeId: 'bridge-1', bridgeNo: 'VIA-99', location: 'P1' }])
    expect(getFamilyReferences('GIRDER', 'G-01')).toEqual([{ bridgeId: 'bridge-1', bridgeNo: 'VIA-99', location: 'Superstructure / Girder' }])
    expect(getFamilyReferences('ABUTMENT', 'A-01')).toEqual([{ bridgeId: 'bridge-1', bridgeNo: 'VIA-99', location: 'A1' }])
  })
})
