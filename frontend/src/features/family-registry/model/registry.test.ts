import { afterEach, describe, expect, it } from 'vitest'
import { INITIAL_BRIDGES } from '../../project/model/types'
import { getFamilies, getFamilyReferences } from './registry'
import { resetProjectData, seedProjectData } from '../../../test/projectStoreTestUtils'

afterEach(() => resetProjectData())

describe('family registry adapters', () => {
  it('reads stable IDs from the existing family catalogs without introducing a store', () => {
    seedProjectData('families.FOUNDATION', ([{ id: 'F-01', name: 'Pile A', foundationType: 'PILED', enabled: true }]))
    expect(getFamilies('FOUNDATION')).toEqual([{ id: 'F-01', name: 'Pile A', category: 'FOUNDATION', type: 'PILED', enabled: true, summary: 'PILED; pile layout with derived Lx/Ly' }])
  })

  it('indexes Bridge Definition family-ID references by bridge and axis', () => {
    seedProjectData('workspace', { bridges: [{ ...INITIAL_BRIDGES[0], id: 'bridge-1', no: 'VIA-01' }, { ...INITIAL_BRIDGES[1], id: 'bridge-2', no: 'VIA-02' }] })
    seedProjectData('bridgeDefinitions', ({ keyBy: 'bridgeId', definitions: {
      'bridge-1': { axisAssignments: { P1: { pierFamilyId: 'P-01' }, P2: { pierFamilyId: 'P-02' } } },
      'bridge-2': { axisAssignments: { P3: { pierFamilyId: 'P-01' } } },
    } }))
    expect(getFamilyReferences('PIER', 'P-01')).toEqual([{ bridgeId: 'bridge-1', bridgeNo: 'VIA-01', location: 'P1' }, { bridgeId: 'bridge-2', bridgeNo: 'VIA-02', location: 'P3' }])
  })

  it('keeps the stable reference while displaying the renamed bridge number', () => {
    seedProjectData('workspace', ({ bridges: [{ id: 'bridge-1', no: 'VIA-99' }] }))
    seedProjectData('bridgeDefinitions', ({ keyBy: 'bridgeId', definitions: {
      'bridge-1': { axisAssignments: { P1: { pierFamilyId: 'P-01' } }, girderFamilyId: 'G-01', abutmentFamilyIds: { A1: 'A-01' } },
    } }))
    expect(getFamilyReferences('PIER', 'P-01')).toEqual([{ bridgeId: 'bridge-1', bridgeNo: 'VIA-99', location: 'P1' }])
    expect(getFamilyReferences('GIRDER', 'G-01')).toEqual([{ bridgeId: 'bridge-1', bridgeNo: 'VIA-99', location: 'Superstructure / Girder' }])
    expect(getFamilyReferences('ABUTMENT', 'A-01')).toEqual([{ bridgeId: 'bridge-1', bridgeNo: 'VIA-99', location: 'A1' }])
  })

  it('lists each concrete class of the MATERIAL catalog once', () => {
    seedProjectData('families.MATERIAL', [{ id: 'm1', concreteClass: 'C30/37' }, { id: 'm2', concreteClass: 'C30/37' }])
    expect(getFamilies('MATERIAL')).toHaveLength(1)
    expect(getFamilies('MATERIAL')[0]).toMatchObject({ id: 'EN1992-1-1:C30/37', name: 'C30/37' })
  })

  it('returns no references while the bridge definitions section is empty', () => {
    resetProjectData()
    expect(getFamilyReferences('PIER', 'P-01')).toEqual([])
  })
})
