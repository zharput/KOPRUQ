import { describe, expect, it } from 'vitest'
import { candidateColumns, cellValue, parameterRangeDisplay, familyCandidateDisplayIds, familyGroups, filterFamilyCandidates, formatFamilyCandidateId, getPrecastGirderDisplayId, paginateAlternatives } from './graphFamilyPresentation'
import type { FamilyCalculationSnapshot } from '../../graph/family/familyResults'

const snapshot = (sourceNodeId: string, sourceNodeName: string, candidates: any[], category: FamilyCalculationSnapshot['familyCategory'] = 'PIER'): FamilyCalculationSnapshot => ({ snapshotId: `${sourceNodeId}-${category}`, bridgeId: 'VIA-01', graphDocumentId: 'graph-1', sourceNodeId, sourceNodeType: 'structural.pier_rectangular', sourceNodeName, familyCategory: category, graphFingerprint: 'fp', candidates: candidates.map((candidate) => ({ bridgeId: 'VIA-01', graphDocumentId: 'graph-1', sourceNodeId, sourceNodeType: 'structural.pier_rectangular', familyCategory: category, candidateId: candidate.id, candidateData: candidate })), generatedAt: new Date(0).toISOString(), freshness: 'VALID', executionStatus: 'SUCCESS', errors: [] })

describe('graph family presentation', () => {
  it('keeps Precast Girder display IDs stable across pagination and filtering', () => {
    expect(getPrecastGirderDisplayId(0)).toBe('PG-001')
    expect(getPrecastGirderDisplayId(24)).toBe('PG-025')
    expect(getPrecastGirderDisplayId(25)).toBe('PG-026')
    expect(getPrecastGirderDisplayId(49)).toBe('PG-050')
    expect(getPrecastGirderDisplayId(53)).toBe('PG-054')
  })
  it('formats central display IDs and assigns family prefixes without changing internal IDs', () => {
    expect(formatFamilyCandidateId('PG', 0)).toBe('PG-001')
    expect(formatFamilyCandidateId('PG', 32)).toBe('PG-033')
    expect(formatFamilyCandidateId('RP', 9)).toBe('RP-010')
    expect(formatFamilyCandidateId('RP', 99)).toBe('RP-100')
    const alternatives = [{ candidateId: 'rectangular-3_0.5_10_1_C40%2F50', candidateData: { id: 'rectangular-3_0.5_10_1_C40%2F50', pierType: 'RECTANGULAR', geometry: { B: 3 } } } as any]
    expect(familyCandidateDisplayIds('PIER', alternatives).get(alternatives[0].candidateId)).toBe('RP-001')
  })
  it('keeps same-category source nodes and duplicate candidate ids separate', () => {
    const groups = familyGroups([snapshot('pier-1', 'Rectangular Pier-1', [{ id: 'ALT-001' }]), snapshot('pier-2', 'Rectangular Pier-2', [{ id: 'ALT-001' }])])
    const pier = groups.find(group => group.category === 'PIER')!
    expect(pier.snapshots.map(item => item.sourceNodeId)).toEqual(['pier-1', 'pier-2'])
    expect(pier.candidateCount).toBe(2)
  })

  it('creates dynamic span columns from candidate payloads', () => {
    const columns = candidateColumns('SPAN_ARRANGEMENT', [{ candidateId: 'a', bridgeId: 'b', graphDocumentId: 'g', sourceNodeId: 's', sourceNodeType: 'span', familyCategory: 'SPAN_ARRANGEMENT', candidateData: { id: 'a', spanLengthsM: [30, 40, 50] } as any }])
    expect(columns.map(column => column.key)).toContain('span:2')
  })
  it('keeps Candidate first and Validation last while omitting redundant type/material columns', () => {
    const columns = candidateColumns('PIER', [{ candidateId: 'x', bridgeId: 'b', graphDocumentId: 'g', sourceNodeId: 's', sourceNodeType: 'pier', familyCategory: 'PIER', candidateData: { id: 'x', pierType: 'RECTANGULAR', material: { name: 'C40/50' }, geometry: { B: 3 }, validationStatus: 'VALID' } } as any])
    expect(columns[0].key).toBe('candidateId')
    expect(columns[0].label).toBe('Candidate ID')
    expect(columns.at(-1)?.key).toBe('validation')
    expect(columns.map(column => column.key)).not.toContain('pierType')
    expect(columns.map(column => column.key)).not.toContain('material')
  })

  it('paginates without mutating the candidate collection and clamps page bounds', () => {
    const values = Array.from({ length: 51 }, (_, index) => index)
    const result = paginateAlternatives(values, 99, 25)
    expect(result.page).toBe(3)
    expect(result.pageCount).toBe(3)
    expect(result.items).toEqual([50])
    expect(values).toHaveLength(51)
    expect(paginateAlternatives([], 1, 25)).toMatchObject({ page: 1, pageCount: 0, total: 0, start: 0, end: 0 })
  })

  it('searches the displayed candidate columns case-insensitively and trims the query', () => {
    const alternatives = [
      { candidateId: 'internal-7', bridgeId: 'b', graphDocumentId: 'g', sourceNodeId: 's', sourceNodeType: 'girder', familyCategory: 'GIRDER', candidateData: { id: 'internal-7', geometry: { H: 2.4 }, validationStatus: 'VALID' } } as any,
      { candidateId: 'internal-8', bridgeId: 'b', graphDocumentId: 'g', sourceNodeId: 's', sourceNodeType: 'girder', familyCategory: 'GIRDER', candidateData: { id: 'internal-8', geometry: { H: 1.8 }, validationStatus: 'INCOMPLETE' } } as any,
    ]
    const ids = new Map([['internal-7', 'PG-007'], ['internal-8', 'PG-008']])
    const columns = candidateColumns('GIRDER', alternatives, { length: 'm' }, ids)
    expect(filterFamilyCandidates(alternatives, columns, '  pg-007  ', { length: 'm' }, ids)).toHaveLength(1)
    expect(filterFamilyCandidates(alternatives, columns, '2.40', { length: 'm' }, ids)).toHaveLength(1)
    expect(filterFamilyCandidates(alternatives, columns, 'valid', { length: 'm' }, ids)).toHaveLength(1)
    expect(filterFamilyCandidates(alternatives, columns, '', { length: 'm' }, ids)).toHaveLength(2)
  })
  const bearing = (stiffness: Record<string, number>) => ({ candidateId: 'EB-1', candidateData: { stiffness } }) as any
  it('converts rotational bearing stiffness with the rotation unit, not the translational one', () => {
    // quantities.ts: kN/mm = 1000 kN/m; kNmm/rad = 0.001 kNm/rad. Canonical kx=1000 kN/m -> 1 kN/mm; krx=1000 kNm/rad -> 1,000,000 kNmm/rad.
    const units = { force: 'kN', length: 'mm', moment: 'kNmm' }
    expect(cellValue(bearing({ kx: 1000, krx: 1000 }), 'stiffness.kx', units)).toBe('1.00')
    expect(cellValue(bearing({ kx: 1000, krx: 1000 }), 'stiffness.krx', units)).toBe('1000000.00')
  })
  it('shows parameter ranges in the project unit with the project unit label', () => {
    // quantities.ts: mm = 0.001 m, so canonical 1.6 m = 1600 mm.
    expect(parameterRangeDisplay([1.6, 1.8, 2], 'm', { length: 'mm' })).toEqual({ min: '1600.00', max: '2000.00', step: '200.00', unit: 'mm' })
    expect(parameterRangeDisplay([1.6], 'mm', { length: 'm' })).toMatchObject({ min: '1.60', max: '1.60', unit: 'm' })
  })
  it('converts a local node value to the project unit when no candidate range exists', () => {
    expect(parameterRangeDisplay([], 'cm', { length: 'mm' }, 160)).toEqual({ min: '1600.00', max: '1600.00', step: '—', unit: 'mm' })
    expect(parameterRangeDisplay([], 'm', { length: 'm' }, undefined)).toEqual({ min: '—', max: '—', step: '—', unit: 'm' })
  })
  it('does not unit-convert unitless (count) parameters', () => {
    // A count parameter has no `...Unit` key: 4 piles stay 4 under a mm project length unit.
    expect(parameterRangeDisplay([], undefined, { length: 'mm' }, 4)).toEqual({ min: '4.00', max: '4.00', step: '—', unit: '' })
    expect(parameterRangeDisplay([3, 4, 5], undefined, { length: 'mm' })).toEqual({ min: '3.00', max: '5.00', step: '1.00', unit: '' })
    expect(parameterRangeDisplay([], undefined, { length: 'mm' }, undefined)).toEqual({ min: '—', max: '—', step: '—', unit: '' })
  })
})
