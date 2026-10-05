import { describe, expect, it } from 'vitest'
import { circularDimensionGeometry } from './CircularPierFamilyPreview'

describe('circular pier dynamic dimension geometry', () => {
  it('follows the transformed bottom bound with constant clearance', () => {
    const small = circularDimensionGeometry(150, 120, 15, 8)
    const large = circularDimensionGeometry(150, 120, 30, 8)
    expect(large.bottom).toBeGreaterThan(small.bottom)
    expect(large.dimensionY).toBeGreaterThan(small.dimensionY)
    expect(small.dimensionY - small.bottom).toBe(8)
    expect(large.dimensionY - large.bottom).toBe(8)
    expect((large.right - large.left) / (small.right - small.left)).toBe(2)
  })
})
