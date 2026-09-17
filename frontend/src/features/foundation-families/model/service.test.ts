import { describe, expect, it } from 'vitest'
import { derivePiledFoundationDimensions, generateFoundationVariants, statusOf, values } from './service'
import type { FoundationFamily } from './types'

describe('Foundation family generation', () => {
  it('generates the shallow Lx x Ly x H Cartesian product', () => {
    const family: FoundationFamily = { id: 'FS1', name: 'FS1', foundationType: 'SHALLOW', enabled: true, shallowGeneration: { lengthX: { min: 6, max: 10, delta: 1 }, lengthY: { min: 5, max: 8, delta: 1 }, height: { min: 1.5, max: 2.5, delta: 0.5 } }, piledGeneration: null, source: 'PROJECT_DESIGN_SYSTEM' }
    expect(statusOf(family)).toBe('VALID')
    expect(values({ min: 6, max: 10, delta: 3 })).toEqual([6, 9])
    expect(generateFoundationVariants(family)).toHaveLength(60)
    expect(generateFoundationVariants(family)[0]).toMatchObject({ lengthX: 6, lengthY: 5, height: 1.5, foundationType: 'SHALLOW' })
  })

  it('generates integer pile counts and derives Lx/Ly with the canonical axis-specific equations', () => {
    const family: FoundationFamily = { id: 'FP1', name: 'FP1', foundationType: 'PILED', enabled: true, shallowGeneration: null, piledGeneration: { pileDiameter: { min: 1.2, max: 1.2, delta: 0 }, pileCountX: { min: 4, max: 4, delta: 0 }, pileSpacingX: { min: 3, max: 3, delta: 0 }, pileCountY: { min: 3, max: 3, delta: 0 }, pileSpacingY: { min: 3, max: 3, delta: 0 }, height: { min: 2, max: 2, delta: 0 } }, source: 'PROJECT_DESIGN_SYSTEM' }
    const variants = generateFoundationVariants(family)
    expect(statusOf(family)).toBe('VALID')
    expect(variants).toHaveLength(1)
    expect(variants[0]).toMatchObject({ pileCountX: 4, pileCountY: 3, lengthX: 11.4, lengthY: 8.4, height: 2 })
    expect(derivePiledFoundationDimensions(1.2, 4, 3, 3, 3)).toEqual({ lengthX: 11.4, lengthY: 8.4 })
    expect(generateFoundationVariants({ ...family, piledGeneration: { ...family.piledGeneration!, pileCountX: { min: 2.5, max: 4.5, delta: 1 } } })).toHaveLength(0)
  })
})
