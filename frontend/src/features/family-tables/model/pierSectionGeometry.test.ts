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
    const geometry = buildPierSectionGeometry('oval', { B: 6, D: 2 })!
    expect(geometry.bounds.width).toBe(6)
    expect(geometry.bounds.height).toBe(2)
    expect(geometry.oval).toMatchObject({ radius: 1, straightLength: 4, topLeft: { x: -3, y: 1 }, topRight: { x: 3, y: 1 }, bottomRight: { x: 3, y: -1 }, bottomLeft: { x: -3, y: -1 } })
    expect(geometry.polygons[0].length).toBeGreaterThan(20)
    expect(geometry.polygons[0]).toContainEqual({ x: 2, y: 1 })
    expect(geometry.polygons[0]).toContainEqual({ x: -2, y: -1 })
  })
  it('degenerates an oval with B equal to D to a circle envelope', () => {
    const geometry = buildPierSectionGeometry('oval', { B: 3, D: 3 })!
    expect(geometry.bounds.width).toBe(3)
    expect(geometry.bounds.height).toBe(3)
  })
  it('moves box void and H web/flange vertices with parameters', () => {
    const box = buildPierSectionGeometry('box', { B: 6, D: 4, tw: 0.5 })!
    expect(box.holes[0][0]).toEqual({ x: -2.5, y: 1.5 })
    const h = buildPierSectionGeometry('h_section', { B: 6, D: 4, tw: 1, tf: 0.5 })!
    expect(h.polygons[0]).toContainEqual({ x: 0.5, y: 1.5 })
  })
})
