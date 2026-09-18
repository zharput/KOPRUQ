import { describe, expect, it } from 'vitest'
import { makeQuantity } from './quantities'
import { generatePierCandidates, generatePierCandidatesWithStats, normalizeCandidateInput } from './pierCandidates'
import type { MaterialValue } from './types'

const concrete: MaterialValue = { domainType: 'ConcreteMaterial', id: 'C40/50', name: 'C40/50', properties: {} }
const base = { pierType: 'CIRCULAR' as const, geometry: { D: makeQuantity(2, 'length', 'm') }, height: makeQuantity(10, 'length', 'm'), columnCount: 1, material: concrete }

describe('Pier candidate domain', () => {
  it('normalizes scalars and preserves range order while converting to canonical meters', () => {
    expect(normalizeCandidateInput(makeQuantity(2000, 'length', 'mm'), 'D')).toEqual([2])
    expect(normalizeCandidateInput([makeQuantity(2, 'length', 'm'), makeQuantity(2250, 'length', 'mm')], 'D')).toEqual([2, 2.25])
  })

  it('creates deterministic circular candidates with normalized geometry and preserved material', () => {
    const a = generatePierCandidates(base), b = generatePierCandidates({ ...base, geometry: { D: makeQuantity(2000, 'length', 'mm') } })
    expect(a).toEqual(b)
    expect(a[0]).toMatchObject({ pierType: 'CIRCULAR', geometry: { D: 2 }, heightM: 10, material: concrete, columnCount: 1 })
  })

  it('generates the rectangular geometry-height Cartesian product in deterministic order', () => {
    const result = generatePierCandidates({ ...base, pierType: 'RECTANGULAR', geometry: { B: [2, 2.5, 3], D: [3, 4] }, height: [10, 15, 20] })
    expect(result).toHaveLength(18)
    expect(result.slice(0, 4).map(item => [item.geometry.B, item.geometry.D, item.heightM])).toEqual([[2,3,10],[2,3,15],[2,3,20],[2,4,10]])
  })

  it('produces twelve alternatives for 3 by 2 dimensional choices and two heights', () => {
    const result=generatePierCandidates({ ...base, pierType:'RECTANGULAR',geometry:{B:[2,2.5,3],D:[3,4]},height:[10,12] })
    expect(result).toHaveLength(12)
    expect(result.slice(0,4).map(item=>[item.geometry.B,item.geometry.D,item.heightM])).toEqual([[2,3,10],[2,3,12],[2,4,10],[2,4,12]])
    expect(result.map(item=>item.id)).toEqual(generatePierCandidates({ ...base,pierType:'RECTANGULAR',geometry:{B:[2,2.5,3],D:[3,4]},height:[10,12] }).map(item=>item.id))
  })

  it('generates oval candidates and filters invalid uniform-wall box combinations', () => {
    expect(generatePierCandidates({ ...base, pierType: 'OVAL', geometry: { B: 3, D: 1.5 } })[0].geometry).toEqual({ B: 3, D: 1.5 })
    expect(generatePierCandidates({ ...base, pierType: 'BOX', geometry: { B: 3, D: 1.5, tw: .3 } })).toHaveLength(1)
    const result = generatePierCandidatesWithStats({ ...base, pierType: 'BOX', geometry: { B: [3, 3.5], D: [5, 6], tw: [.4, 2] } })
    expect(result.generatedCombinations).toBe(8)
    expect(result.invalidCombinations).toBe(4)
    expect(result.candidates).toHaveLength(4)
  })

  it('generates H-section candidates and filters invalid web/flange combinations', () => {
    const result = generatePierCandidatesWithStats({ ...base, pierType: 'H_SECTION', geometry: { B: [3, 3.5], D: [5, 6], tw: [.5], tf: [.6, 3.1] } })
    expect(result.generatedCombinations).toBe(8)
    expect(result.invalidCombinations).toBe(4)
    expect(result.candidates).toHaveLength(4)
    expect(result.candidates[0].geometry).toEqual({ B: 3, D: 5, tw: .5, tf: .6 })
  })

  it('rejects invalid columns and candidate explosion', () => {
    expect(() => generatePierCandidates({ ...base, columnCount: 3 })).toThrow('1 or 2')
    expect(() => generatePierCandidates({ ...base, geometry: { D: Array.from({ length: 101 }, (_, i) => i + 1) }, height: Array.from({ length: 100 }, (_, i) => i + 1) })).toThrow('10,100 combinations')
  })

  it('generates 100 candidates within the limit and reports invalid combinations', () => {
    const result = generatePierCandidatesWithStats({ ...base, pierType: 'H_SECTION', geometry: { B: Array.from({ length: 10 }, (_, i) => i + 2), D: [5], tw: [.5], tf: [.5] }, height: Array.from({ length: 10 }, (_, i) => i + 1) })
    expect(result.generatedCombinations).toBe(100)
    expect(result.candidates).toHaveLength(100)
    expect(result.invalidCombinations).toBe(0)
  })

  it('generates one thousand candidates without changing deterministic identity/order', () => {
    const input = { ...base, geometry: { D: Array.from({ length: 100 }, (_, i) => i + 1) }, height: Array.from({ length: 10 }, (_, i) => i + 1) }
    const first = generatePierCandidates(input)
    expect(first).toHaveLength(1000)
    expect(first.map(item => item.id)).toEqual(generatePierCandidates(input).map(item => item.id))
  })
})
