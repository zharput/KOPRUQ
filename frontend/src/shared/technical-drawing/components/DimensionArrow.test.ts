import { describe, expect, it } from 'vitest'
import { dimensionArrowPoints } from './DimensionArrow'

function points(value: string) {
  return value.split(' ').map(point => point.split(',').map(Number))
}

describe('DimensionArrow geometry', () => {
  it.each([
    ['right', 1, 0],
    ['left', -1, 0],
    ['down', 0, 1],
    ['up', 0, -1],
  ] as const)('uses the endpoint as the tip and points %s', (direction, dx, dy) => {
    const triangle = points(dimensionArrowPoints(20, 30, direction))
    expect(triangle[0]).toEqual([20, 30])
    const base = triangle.slice(1)
    const baseCenter = [
      (base[0][0] + base[1][0]) / 2,
      (base[0][1] + base[1][1]) / 2,
    ]
    expect(Math.sign(20 - baseCenter[0])).toBe(dx)
    expect(Math.sign(30 - baseCenter[1])).toBe(dy)
  })
})
