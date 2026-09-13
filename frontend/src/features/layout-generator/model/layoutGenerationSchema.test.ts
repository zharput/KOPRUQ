import { describe, expect, it } from 'vitest'
import { layoutGenerationSchema } from './layoutGenerationSchema'

const validForm = {
  alignmentLengthM: 150,
  siteStartChainageM: 10,
  siteEndChainageM: 140,
  crossingType: 'River',
  noPierZones: [{ id: 'NPZ-1', startChainageM: 70, endChainageM: 80, description: 'Main river channel' }],
  minSpanM: 25,
  maxSpanM: 45,
  minSpanCount: 3,
  maxSpanCount: 5,
  spanLengthStepM: 5,
  c1StepM: 5,
}

describe('layoutGenerationSchema', () => {
  it('accepts the default form', () => {
    expect(layoutGenerationSchema.safeParse(validForm).success).toBe(true)
  })

  it('rejects maxSpanCount < minSpanCount', () => {
    const result = layoutGenerationSchema.safeParse({ ...validForm, minSpanCount: 6, maxSpanCount: 5 })
    expect(result.success).toBe(false)
  })

  it('rejects a no-pier zone whose end chainage is before its start chainage', () => {
    const result = layoutGenerationSchema.safeParse({
      ...validForm,
      noPierZones: [{ id: 'NPZ-1', startChainageM: 80, endChainageM: 70, description: '' }],
    })
    expect(result.success).toBe(false)
  })
})
