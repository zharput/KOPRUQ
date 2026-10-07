import { describe, expect, it } from 'vitest'
import { buildPierSectionGeometry } from './pierSectionGeometry'

describe('pier section geometry', () => {
  it('uses both rectangular dimensions in engineering space', () => {
    const geometry = buildPierSectionGeometry('rectangular', { B: 6, D: 3 })!
    expect(geometry.bounds.width / geometry.bounds.height).toBe(2)
  })
  it('keeps circular sections equal in both axes', () => {
    const geometry = buildPierSectionGeometry('circular', { D: 3 })!
    expect(geometry.bounds.width).toBe(3)
    expect(geometry.bounds.height).toBe(3)
  })
  it('rebuilds capsule radius and straight length from B and D', () => {
    const geometry = buildPierSectionGeometry('oval', { B: 3, D: 6 })!
    expect(geometry.bounds.width).toBe(3)
    expect(geometry.bounds.height).toBe(6)
    expect(geometry.oval).toMatchObject({ radius: 1.5, straightLength: 3, topLeft: { x: -1.5, y: 3 }, topRight: { x: 1.5, y: 3 }, bottomRight: { x: 1.5, y: -3 }, bottomLeft: { x: -1.5, y: -3 } })
    expect(geometry.polygons[0].length).toBeGreaterThan(20)
    expect(Math.max(...geometry.polygons[0].map(point => point.y))).toBeCloseTo(3)
    expect(Math.min(...geometry.polygons[0].map(point => point.y))).toBeCloseTo(-3)
  })
  it('degenerates an oval with B equal to D to a circle envelope', () => {
    const geometry = buildPierSectionGeometry('oval', { B: 3, D: 3 })!
    expect(geometry.bounds.width).toBe(3)
    expect(geometry.bounds.height).toBe(3)
  })
  it('moves box void and H web/flange vertices with parameters', () => {
    const box = buildPierSectionGeometry('box', { B: 6, D: 4, wx: 0.5, wy: 1 })!
    expect(box.holes[0][0]).toEqual({ x: -2, y: 1.5 })
    const h = buildPierSectionGeometry('h_section', { B: 6, D: 4, w: 1, ft: 0.5 })!
    expect(h.polygons[0]).toContainEqual({ x: -2.5, y: 2 })
  })
})
