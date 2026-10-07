import { describe, expect, it } from 'vitest'
import { computePierSectionProperties } from './pierSectionProperties'

describe('pier section properties', () => {
  it('calculates rectangular properties', () => expect(computePierSectionProperties('rectangular', { B: 2, D: 3 })).toMatchObject({ area: 6, ix: 4.5, iy: 2 }))
  it('keeps G8.1 B longitudinal and D transverse axis properties', () => expect(computePierSectionProperties('rectangular', { B: 3, D: 10 })).toEqual({ area: 30, ix: 250, iy: 22.5, wx: 50, wy: 15 }))
  it('calculates vertical capsule properties from the overall B/D envelope', () => expect(computePierSectionProperties('oval', { B: 3, D: 6 })?.area).toBeCloseTo(9 + 2.25 * Math.PI))
  it('calculates hollow box and H section properties', () => {
    expect(computePierSectionProperties('box', { B: 3, D: 4, wx: .25, wy: .5 })?.area).toBeCloseTo(5)
    const box = computePierSectionProperties('box', { B: 6, D: 4, wx: .3, wy: .5 })!
    expect(box.area).toBeCloseTo(24 - 5 * 3.4)
    expect(box.ix).toBeCloseTo((6 * 4 ** 3 - 5 * 3.4 ** 3) / 12)
    expect(box.iy).toBeCloseTo((4 * 6 ** 3 - 3.4 * 5 ** 3) / 12)
    expect(computePierSectionProperties('box', { B: 10, D: 6, wx: 1, wy: 1 })?.area).toBe(28)
    const h = computePierSectionProperties('h_section', { B: 3, D: 6, w: 3, ft: .75 })!
    expect(h.area).toBeCloseTo(13.5)
    expect(h.ix).toBeCloseTo(30.375)
    expect(h.iy).toBeCloseTo(12.65625)
    expect(h.wx).toBeCloseTo(10.125)
    expect(h.wy).toBeCloseTo(8.4375)
  })
})
