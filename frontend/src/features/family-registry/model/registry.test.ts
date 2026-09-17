import { afterEach, describe, expect, it } from 'vitest'
import { getFamilies, getFamilyReferences } from './registry'

afterEach(() => localStorage.clear())

describe('family registry adapters', () => {
  it('reads stable IDs from the existing family catalogs without introducing a store', () => {
    localStorage.setItem('spanova.project-design-system.foundation-families', JSON.stringify([{ id: 'F-01', name: 'Pile A', foundationType: 'PILED', enabled: true }]))
    expect(getFamilies('FOUNDATION')).toEqual([{ id: 'F-01', name: 'Pile A', category: 'FOUNDATION', type: 'PILED', enabled: true, summary: 'PILED; pile layout with derived Lx/Ly' }])
    expect(localStorage.getItem('spanova.family-registry')).toBeNull()
  })

  it('indexes Bridge Definition family-ID references by bridge and axis', () => {
    localStorage.setItem('spanova.bridge-definitions.v1', JSON.stringify({ definitions: {
      'VIA-01': { axisAssignments: { P1: { pierFamilyId: 'P-01' }, P2: { pierFamilyId: 'P-02' } } },
      'VIA-02': { axisAssignments: { P3: { pierFamilyId: 'P-01' } } },
    } }))
    expect(getFamilyReferences('PIER', 'P-01')).toEqual([{ bridgeId: 'VIA-01', location: 'P1' }, { bridgeId: 'VIA-02', location: 'P3' }])
  })
})
