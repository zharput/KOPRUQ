import { describe, expect, it } from 'vitest'
import { generateValues } from './ParamSweepCard'

/**
 * `generateValues` is the exact logic that had the Oval-column bug this
 * session (a value list that either wrapped ugly or showed the wrong
 * thing) - a pure function, cheap and high-value to pin down with tests
 * (architecture migration Milestone 4, 2026-09-12).
 */
describe('generateValues', () => {
  it('returns an empty sweep when min/max/delta are all exactly 0 ("not configured")', () => {
    expect(generateValues(0, 0, 0)).toEqual([])
  })

  it('returns the single value when min === max, regardless of delta (a given value, not an invented range)', () => {
    expect(generateValues(190, 190, 0)).toEqual([190])
    expect(generateValues(15, 15, 5)).toEqual([15])
  })

  it('returns an empty sweep for an invalid range (max < min) or a non-positive delta with a real range', () => {
    expect(generateValues(300, 200, 25)).toEqual([])
    expect(generateValues(200, 300, 0)).toEqual([])
  })

  it("reproduces the engineer's own Circular pier worked example (200-300 cm step 25 cm)", () => {
    expect(generateValues(200, 300, 25)).toEqual([200, 225, 250, 275, 300])
  })
})
