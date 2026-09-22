import { describe, expect, it } from 'vitest'
import { makeQuantity } from './quantities'
import { resolveBridgeAssembly } from './bridgeAssembly'
import type { AbutmentCandidate } from './abutmentCandidates'

describe('bridge assembly', () => {
  it('creates terminal abutments, intermediate piers and sequential spans', () => {
    const result = resolveBridgeAssembly([30, 40, 50, 40, 25], 'super-1')
    expect(result.totalLengthM).toBe(185)
    expect(result.supports.map(item => item.name)).toEqual(['A1', 'P1', 'P2', 'P3', 'P4', 'A2'])
    expect(result.spans.map(item => item.name)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5'])
    expect(result.status).toBe('VALID')
  })
  it('keeps canonical length when the input unit changes', () => {
    expect(resolveBridgeAssembly([makeQuantity(30000, 'length', 'mm')], 'super-1').totalLengthM).toBe(30)
  })
  it('keeps family assignments on supports and spans without inventing coordinates', () => {
    const result = resolveBridgeAssembly([30, 40], undefined, {
      abutmentFamilyId: 'AB-01',
      pier: { id: 'PIER-01', pierType: 'CIRCULAR', geometry: { D: 2 }, columnCount: 1, heightM: 10, material: { domainType: 'ConcreteMaterial', id: 'C40/50', name: 'C40/50', properties: {} } },
    })
    expect(result.supports.map(item => item.familyId)).toEqual(['AB-01', 'PIER-01', 'AB-01'])
    expect(result.spans.every(item => item.lengthM > 0)).toBe(true)
    expect(result.supports.every(item => item.coordinate === undefined)).toBe(true)
    expect(result.alignmentResolved).toBe(false)
  })
  it('regenerates terminal supports and stations when span arrangement changes', () => {
    const result = resolveBridgeAssembly([10, 20, 30], 'super-1')
    expect(result.supports.map(item => [item.name, item.stationM])).toEqual([['A1', 0], ['P1', 10], ['P2', 30], ['A2', 60]])
  })
  it('transfers independent A1/A2 abutments with forward and reverse directions', () => {
    const a1 = { id: 'a1', geometry: { foundW: 5.5, found_d: 18, totalH: 8 }, upstream: {}, seismic: { seiU: .03, seiW: .4, seiWClear: .3, status: 'VALID' as const }, validationStatus: 'VALID' as const, validationMessages: [] } as unknown as AbutmentCandidate
    const a2 = { ...a1, id: 'a2', geometry: { foundW: 6.2, found_d: 20, totalH: 9 } }
    const result = resolveBridgeAssembly([30], 'super-1', { abutmentA1: a1, abutmentA2: a2 })
    expect(result.supports[0]).toMatchObject({ name: 'A1', direction: 'FORWARD', abutment: a1 })
    expect(result.supports[1]).toMatchObject({ name: 'A2', direction: 'REVERSE', abutment: a2 })
  })
})
