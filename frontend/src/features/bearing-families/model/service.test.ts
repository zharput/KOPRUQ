import { describe, expect, it } from 'vitest'
import { generateBearingVariants, statusOf } from './service'
import type { BearingFamily } from './types'

const family: BearingFamily = {
  id: 'stable-bearing-id', name: 'B1', bearingType: 'ELASTOMERIC', enabled: true,
  length: { min: 400, max: 500, delta: 50 }, width: { min: 300, max: 400, delta: 50 }, height: { min: 80, max: 120, delta: 20 }, source: 'PROJECT_DESIGN_SYSTEM',
}

describe('bearing family geometry generation', () => {
  it('generates the length x width x height product and stable family-based IDs', () => {
    const variants = generateBearingVariants(family)
    expect(variants).toHaveLength(27)
    expect(variants[0]).toEqual({ id: 'stable-bearing-id-400-300-80', bearingFamilyId: 'stable-bearing-id', length: 400, width: 300, height: 80 })
    expect(new Set(variants.map((variant) => variant.id)).size).toBe(27)
  })

  it('keeps max values off the delta grid out and allows a single value', () => {
    expect(generateBearingVariants({ ...family, length: { min: 400, max: 510, delta: 50 } })).toHaveLength(27)
    expect(generateBearingVariants({ ...family, height: { min: 100, max: 100, delta: 0 } })).toHaveLength(9)
  })

  it('keeps variants geometric when disabled while the family remains valid', () => {
    expect(statusOf({ ...family, enabled: false })).toBe('VALID')
    expect(generateBearingVariants({ ...family, enabled: false })).toHaveLength(27)
  })

  it('produces the requested B1 acceptance case and rejects non-positive minima', () => {
    const b1 = { ...family, length: { min: 300, max: 400, delta: 50 }, width: { min: 300, max: 400, delta: 50 }, height: { min: 200, max: 400, delta: 50 } }
    expect(generateBearingVariants(b1)).toHaveLength(45)
    expect(statusOf({ ...b1, length: { min: -100, max: 400, delta: 100 } })).toBe('INVALID')
  })
})
