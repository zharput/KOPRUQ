import { describe, expect, it } from 'vitest'
import { kernelStateSchema } from './kernelStateSchema'

const validForm = {
  bridgeName: 'VIA-35',
  totalLengthM: 210,
  deckWidthM: 13.8,
  minSpanM: 30,
  maxSpanM: 45,
  minGirderCount: 4,
  maxGirderCount: 8,
  minGirderDepthM: 1.8,
  maxGirderDepthM: 2.5,
}

describe('kernelStateSchema', () => {
  it('accepts the default form (a real, fractional-value form - the noValidate regression this session caught)', () => {
    expect(kernelStateSchema.safeParse(validForm).success).toBe(true)
  })

  it('rejects an empty bridge name', () => {
    const result = kernelStateSchema.safeParse({ ...validForm, bridgeName: '' })
    expect(result.success).toBe(false)
  })

  it('rejects maxSpanM < minSpanM', () => {
    const result = kernelStateSchema.safeParse({ ...validForm, minSpanM: 50, maxSpanM: 40 })
    expect(result.success).toBe(false)
  })
})
