import { describe, expect, it } from 'vitest'
import { computePierSectionProperties } from './pierSectionProperties'

describe('pier section properties', () => {
  it('calculates rectangular properties', () => expect(computePierSectionProperties('rectangular', { B: 2, D: 3 })).toMatchObject({ area: 6, ix: 4.5, iy: 2 }))
  it('calculates capsule properties from the overall B/D envelope', () => expect(computePierSectionProperties('oval', { B: 4, D: 2 })?.area).toBeCloseTo(2 * 2 + Math.PI))
  it('calculates hollow box and H section properties', () => {
    expect(computePierSectionProperties('box', { B: 3, D: 4, tw: .25 })?.area).toBeCloseTo(3.25)
    expect(computePierSectionProperties('h_section', { B: 3, D: 4, tw: .3, tf: .4 })?.area).toBeCloseTo(3 * .8 + .3 * 3.2)
  })
})
