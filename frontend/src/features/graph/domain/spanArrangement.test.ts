import { describe, expect, it } from 'vitest'
import { generateSpanArrangements } from './spanArrangement'

describe('span arrangement generator', () => {
  it('generates ordered fixed-count alternatives with exact total length', () => {
    const result = generateSpanArrangements({ mode:'FIXED_COUNT', totalLengthM:100, spanCount:2, minSpanLengthM:40, maxSpanLengthM:60, spanIncrementM:10, generationLimit:100 })
    expect(result.status).toBe('COMPLETE')
    expect(result.candidates.map(item => item.spanLengthsM)).toEqual([[40,60],[50,50],[60,40]])
    expect(result.candidates[0].supportStationsM).toEqual([0,40,100])
    expect(result.candidates[0].pierCount).toBe(1)
    expect(result.candidates[0].id).toBe('span-arrangement-2-0-2')
  })
  it('supports variable count and reports truncation without claiming completeness', () => {
    const result = generateSpanArrangements({ mode:'VARIABLE_COUNT', totalLengthM:120, minSpanCount:2, maxSpanCount:4, minSpanLengthM:40, maxSpanLengthM:80, spanIncrementM:10, generationLimit:2 })
    expect(result.status).toBe('INCOMPLETE')
    expect(result.truncated).toBe(true)
    expect(result.candidates).toHaveLength(2)
  })
  it('rejects non-integral increments and never creates rounded alternatives', () => {
    const result = generateSpanArrangements({ mode:'FIXED_COUNT', totalLengthM:101, spanCount:2, minSpanLengthM:40, maxSpanLengthM:50, spanIncrementM:10, generationLimit:100 })
    expect(result.status).toBe('NO_FEASIBLE_ALTERNATIVE')
    expect(result.candidates).toHaveLength(0)
  })
  it('validates the 185 m engineering example in both modes', () => {
    const common = { totalLengthM:185, minSpanLengthM:25, maxSpanLengthM:50, spanIncrementM:5, generationLimit:10000 } as const
    const fixed = generateSpanArrangements({ ...common, mode:'FIXED_COUNT', spanCount:5 })
    const variable = generateSpanArrangements({ ...common, mode:'VARIABLE_COUNT', minSpanCount:4, maxSpanCount:6 })
    expect(fixed.status).toBe('COMPLETE')
    expect(variable.status).toBe('COMPLETE')
    expect(fixed.candidates).toHaveLength(780)
    expect(variable.candidates.filter(item => item.spanCount === 4)).toHaveLength(20)
    expect(variable.candidates.filter(item => item.spanCount === 5)).toHaveLength(780)
    expect(variable.candidates.filter(item => item.spanCount === 6)).toHaveLength(756)
    for (const candidate of [...fixed.candidates, ...variable.candidates]) {
      expect(candidate.spanLengthsM.reduce((sum, length) => sum + length, 0)).toBeCloseTo(185, 8)
      expect(candidate.supportStationsM.at(-1)).toBe(185)
      expect(candidate.pierCount).toBe(candidate.spanCount - 1)
      expect(new Set(candidate.spanLengthsM.map(length => Math.round((length - 25) / 5))).size).toBeGreaterThan(0)
    }
  })
  it('marks exactly-full limits complete and larger spaces incomplete', () => {
    const input = { mode:'FIXED_COUNT' as const, totalLengthM:100, spanCount:2, minSpanLengthM:40, maxSpanLengthM:60, spanIncrementM:10 }
    expect(generateSpanArrangements({ ...input, generationLimit:3 }).status).toBe('COMPLETE')
    const partial = generateSpanArrangements({ ...input, generationLimit:2 })
    expect(partial.status).toBe('INCOMPLETE')
    expect(partial.candidates).toHaveLength(2)
    expect(partial.alternativeCount).toBe(2)
  })
  it('handles invalid input, no-feasible input, decimal precision and deterministic output', () => {
    expect(generateSpanArrangements({ mode:'FIXED_COUNT', totalLengthM:100, spanCount:0, minSpanLengthM:40, maxSpanLengthM:60, spanIncrementM:10, generationLimit:10 }).status).toBe('INVALID_INPUT')
    expect(generateSpanArrangements({ mode:'FIXED_COUNT', totalLengthM:99, spanCount:2, minSpanLengthM:40, maxSpanLengthM:60, spanIncrementM:10, generationLimit:10 }).status).toBe('NO_FEASIBLE_ALTERNATIVE')
    const decimal = generateSpanArrangements({ mode:'FIXED_COUNT', totalLengthM:0.3, spanCount:3, minSpanLengthM:0.1, maxSpanLengthM:0.1, spanIncrementM:0.1, generationLimit:10 })
    expect(decimal.status).toBe('COMPLETE')
    const first = generateSpanArrangements({ mode:'FIXED_COUNT', totalLengthM:100, spanCount:2, minSpanLengthM:40, maxSpanLengthM:60, spanIncrementM:10, generationLimit:10 })
    const second = generateSpanArrangements({ mode:'FIXED_COUNT', totalLengthM:100, spanCount:2, minSpanLengthM:40, maxSpanLengthM:60, spanIncrementM:10, generationLimit:10 })
    expect(second.candidates.map(item => item.id)).toEqual(first.candidates.map(item => item.id))
  })
})
