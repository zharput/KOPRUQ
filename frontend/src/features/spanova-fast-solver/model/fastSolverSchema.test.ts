import { describe, expect, it } from 'vitest'
import { fastSolverSchema } from './fastSolverSchema'

const validForm = {
  spanLengthsM: [30, 40, 50, 40, 25],
  deckWidthM: 15,
  deckThicknessM: 1,
  sdlKnPerM: 10,
  pierHeightsM: [10, 15, 20, 8],
  columnLongitudinalM: 2,
  columnTransverseM: 4,
  columnSpacingTransverseM: 8,
  capBeamWidthM: 3,
  capBeamDepthM: 1.5,
  concreteFckMpa: 30,
  bearingKx: 3000,
  bearingKy: 30000,
  bearingKz: 100000,
  bearingKrx: 100000,
  bearingKry: 100000,
  bearingKrz: 100000,
}

describe('fastSolverSchema', () => {
  it("accepts the engineer's own worked test case defaults", () => {
    expect(fastSolverSchema.safeParse(validForm).success).toBe(true)
  })

  it('rejects a non-positive span length', () => {
    const result = fastSolverSchema.safeParse({ ...validForm, spanLengthsM: [30, 40, 0, 40, 25] })
    expect(result.success).toBe(false)
  })

  it('does not constrain bearing stiffness sign/range - only the engineer-given values are ever used', () => {
    expect(fastSolverSchema.safeParse({ ...validForm, bearingKx: -1 }).success).toBe(true)
  })
})
