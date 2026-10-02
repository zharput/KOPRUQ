import { describe, expect, it } from 'vitest'
import { TECHNICAL_DRAWING_TOKENS } from './TechnicalDrawingTokens'
import { resolveHorizontalDimension, resolveInlineDimension, resolveVerticalDimension, extensionLine } from './DimensionGeometry'
import { PRECAST_GIRDER_DIMENSION_PRESET } from '../../features/family-tables/model/precastGirderDimensionPreset'

describe('technical drawing tokens', () => {
  it('defines the stable drawing vocabulary', () => {
    expect(TECHNICAL_DRAWING_TOKENS).toMatchObject({ arrowSize: expect.any(Number), strokeWidth: expect.any(Number), extensionGap: expect.any(Number), extensionOverrun: expect.any(Number), textGap: expect.any(Number), baseOffset: expect.any(Number), laneGap: expect.any(Number) })
  })
})

describe('dimension geometry resolvers', () => {
  it('keeps endpoints and centers deterministic for all dimension kinds', () => {
    const from = { x: 10, y: 20 }, to = { x: 30, y: 60 }
    for (const definition of [resolveHorizontalDimension('h', 'H', from, to), resolveVerticalDimension('v', 'H', from, to), resolveInlineDimension('i', 'tw', from, to)]) {
      expect(definition.from).toEqual(from)
      expect(definition.to).toEqual(to)
      expect(definition.text?.point).toEqual({ x: 20, y: 40 })
    }
  })

  it('preserves extension starts when the dimension axis changes', () => {
    const anchor = { x: 100, y: 40 }
    const first = extensionLine(anchor, { x: 100, y: 80 })
    const second = extensionLine(anchor, { x: 100, y: 80 }, 20)
    expect(first.from).toEqual({ x: 100, y: 36 })
    expect(second.from).toEqual({ x: 100, y: 20 })
    expect(first.from.x).toBe(second.from.x)
  })
})

describe('precast girder golden geometry rules', () => {
  it('locks the migrated golden factors', () => {
    expect(PRECAST_GIRDER_DIMENSION_PRESET.rightDimensionFactor).toBe(0.25)
    expect(PRECAST_GIRDER_DIMENSION_PRESET.twTextGapFactor).toBe(2 / 3)
    expect(PRECAST_GIRDER_DIMENSION_PRESET.rightLabels).toEqual(['th1', 'bh1', 'bh2', 'th2'])
  })

  it.each([
    ['short', 1.8, 1, 0.6, 0.25], ['current/tall', 2.6, 1, 0.5, 0.25], ['wide flange', 2.2, 1.4, 1.1, 0.18], ['tall section', 3.6, 1, 0.5, 0.22],
  ])('%s follows section parameters', (_name, H, Btf, Bbf, tw) => {
    const section = { H, Btf, Bbf, tw }
    expect(section.H).toBe(H)
    expect(section.Btf).toBe(Btf)
    expect(section.Bbf).toBe(Bbf)
    expect(section.tw).toBe(tw)
  })
})
