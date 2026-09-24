import { describe, expect, it } from 'vitest'
import { candidateColumns, familyGroups, paginateAlternatives } from './graphFamilyPresentation'
import type { FamilyCalculationSnapshot } from '../../graph/family/familyResults'

const snapshot = (sourceNodeId: string, sourceNodeName: string, candidates: any[], category: FamilyCalculationSnapshot['familyCategory'] = 'PIER'): FamilyCalculationSnapshot => ({ snapshotId: `${sourceNodeId}-${category}`, bridgeId: 'VIA-01', graphDocumentId: 'graph-1', sourceNodeId, sourceNodeType: 'structural.pier_rectangular', sourceNodeName, familyCategory: category, graphFingerprint: 'fp', candidates: candidates.map((candidate) => ({ bridgeId: 'VIA-01', graphDocumentId: 'graph-1', sourceNodeId, sourceNodeType: 'structural.pier_rectangular', familyCategory: category, candidateId: candidate.id, candidateData: candidate })), generatedAt: new Date(0).toISOString(), freshness: 'VALID', executionStatus: 'SUCCESS', errors: [] })

describe('graph family presentation', () => {
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

  it('paginates without mutating the candidate collection and clamps page bounds', () => {
    const values = Array.from({ length: 51 }, (_, index) => index)
    const result = paginateAlternatives(values, 99, 25)
    expect(result.page).toBe(3)
    expect(result.pageCount).toBe(3)
    expect(result.items).toEqual([50])
    expect(values).toHaveLength(51)
    expect(paginateAlternatives([], 1, 25)).toMatchObject({ page: 1, pageCount: 0, total: 0, start: 0, end: 0 })
  })
})
