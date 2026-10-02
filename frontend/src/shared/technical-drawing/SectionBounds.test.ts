import { describe, expect, it } from 'vitest'
import { sectionBounds } from './SectionBounds'
import { dimensionAxis, laneOffset } from './DimensionLayout'

describe('technical drawing layout', () => {
  const bounds = sectionBounds([{ x: 10, y: 20 }, { x: 30, y: 60 }])
  it('calculates section bounds', () => expect(bounds).toMatchObject({ minX: 10, maxX: 30, minY: 20, maxY: 60, width: 20, height: 40, centerX: 20, centerY: 40 }))
  it('supports side and lane placement', () => {
    expect(dimensionAxis(bounds, 'right', 1, 4)).toBe(34)
    expect(dimensionAxis(bounds, 'left', 2, 4, 16)).toBe(-10)
    expect(dimensionAxis(bounds, 'top', 1, 4)).toBe(16)
    expect(dimensionAxis(bounds, 'bottom', 2, 4, 16)).toBe(80)
    expect(laneOffset(2, 16)).toBe(16)
  })
  it('keeps lane spacing and side direction stable', () => {
    for (const side of ['right', 'left', 'top', 'bottom'] as const) {
      expect(dimensionAxis(bounds, side, 2, 4, 16)! - dimensionAxis(bounds, side, 1, 4, 16)!).toBe(side === 'left' || side === 'top' ? -16 : 16)
    }
  })
})

describe('section bounds edge cases', () => {
  it('calculates negative and single-point coordinates', () => {
    expect(sectionBounds([{ x: -12, y: -8 }, { x: 4, y: 10 }, { x: -2, y: 3 }])).toEqual({ minX: -12, maxX: 4, minY: -8, maxY: 10, width: 16, height: 18, centerX: -4, centerY: 1 })
    expect(sectionBounds([{ x: 3, y: -2 }])).toEqual({ minX: 3, maxX: 3, minY: -2, maxY: -2, width: 0, height: 0, centerX: 3, centerY: -2 })
  })
})
