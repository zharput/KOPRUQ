import { afterEach, describe, expect, it } from 'vitest'
import { getFamilies, getFamilyReferences } from './registry'
import { browserStorageText, resetProjectData, seedProjectData, seedRawProjectData } from '../../../test/projectStoreTestUtils'

afterEach(() => resetProjectData())

describe('family registry adapters', () => {
  it('reads stable IDs from the existing family catalogs without introducing a store', () => {
    seedProjectData('families.FOUNDATION', ([{ id: 'F-01', name: 'Pile A', foundationType: 'PILED', enabled: true }]))
    expect(getFamilies('FOUNDATION')).toEqual([{ id: 'F-01', name: 'Pile A', category: 'FOUNDATION', type: 'PILED', enabled: true, summary: 'PILED; pile layout with derived Lx/Ly' }])
    expect(browserStorageText('kopruq.family-registry')).toBeNull()
  })

  it('indexes Bridge Definition family-ID references by bridge and axis', () => {
    seedProjectData('bridgeDefinitions', ({ definitions: {
      'VIA-01': { axisAssignments: { P1: { pierFamilyId: 'P-01' }, P2: { pierFamilyId: 'P-02' } } },
      'VIA-02': { axisAssignments: { P3: { pierFamilyId: 'P-01' } } },
    } }))
    expect(getFamilyReferences('PIER', 'P-01')).toEqual([{ bridgeId: 'VIA-01', bridgeNo: 'VIA-01', location: 'P1' }, { bridgeId: 'VIA-02', bridgeNo: 'VIA-02', location: 'P3' }])
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

  it('keeps only object rows of the MATERIAL catalog and lists each concrete class once', () => {
    seedProjectData('families.MATERIAL', [null, 5, { concreteClass: 'C30/37' }, { concreteClass: 'C30/37' }])
    expect(getFamilies('MATERIAL')).toHaveLength(1)
    expect(getFamilies('MATERIAL')[0]).toMatchObject({ id: 'EN1992-1-1:C30/37', name: 'C30/37' })
  })

  it('returns no references for unreadable bridge definitions or an empty store', () => {
    expect(getFamilyReferences('PIER', 'P-01')).toEqual([])
    seedRawProjectData('bridgeDefinitions', '{bad')
    expect(getFamilyReferences('PIER', 'P-01')).toEqual([])
  })

  it('uses the stored key as bridge number for legacy stores without keyBy', () => {
    seedProjectData('workspace', { bridges: [{ id: 'bridge-1', no: 'VIA-99' }] })
    seedProjectData('bridgeDefinitions', { definitions: { 'bridge-1': { axisAssignments: { P1: { pierFamilyId: 'P-01' } } } } })
    expect(getFamilyReferences('PIER', 'P-01')).toEqual([{ bridgeId: 'bridge-1', bridgeNo: 'bridge-1', location: 'P1' }])
  })
})
