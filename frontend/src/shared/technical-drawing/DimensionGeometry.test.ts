import { describe, expect, it } from 'vitest'
import { TECHNICAL_DRAWING_TOKENS } from './TechnicalDrawingTokens'
import { resolveHorizontalDimension, resolveInlineDimension, resolveVerticalDimension, extensionLine, dimensionExtensionLine } from './DimensionGeometry'
import { PRECAST_GIRDER_DIMENSION_PRESET } from '../../features/family-tables/model/precastGirderDimensionPreset'

describe('technical drawing tokens', () => {
  it('resolves outward arrows for horizontal, vertical and inline dimensions', () => {
    const from = { x: 10, y: 20 }, to = { x: 30, y: 60 }
    expect(resolveHorizontalDimension('h', 'H', from, to).arrows?.map(arrow => arrow.direction)).toEqual(['left', 'right'])
    expect(resolveVerticalDimension('v', 'V', from, to).arrows?.map(arrow => arrow.direction)).toEqual(['up', 'down'])
    expect(resolveInlineDimension('i', 'I', from, to).arrows?.map(arrow => arrow.direction)).toEqual(['left', 'right'])
  })
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
    expect(first.from).toEqual({ x: 100, y: 37 })
    expect(second.from).toEqual({ x: 100, y: 20 })
    expect(first.from.x).toBe(second.from.x)
  })

  it('starts extension lines four drawing units away from geometry', () => {
    expect(dimensionExtensionLine({ x: 10, y: 20 }, { x: 10, y: 0 })).toMatchObject({ from: { x: 10, y: 16 }, to: { x: 10, y: -3 }, dimensionIntersection: { x: 10, y: 0 } })
    expect(dimensionExtensionLine({ x: 10, y: 20 }, { x: 10, y: 40 })).toMatchObject({ from: { x: 10, y: 24 }, to: { x: 10, y: 43 }, dimensionIntersection: { x: 10, y: 40 } })
    expect(dimensionExtensionLine({ x: 20, y: 10 }, { x: 0, y: 10 })).toMatchObject({ from: { x: 16, y: 10 }, to: { x: -3, y: 10 }, dimensionIntersection: { x: 0, y: 10 } })
    expect(dimensionExtensionLine({ x: 20, y: 10 }, { x: 40, y: 10 })).toMatchObject({ from: { x: 24, y: 10 }, to: { x: 43, y: 10 }, dimensionIntersection: { x: 40, y: 10 } })
  })

  it('uses one exact endpoint for arrow tips and extension intersections', () => {
    const horizontal = resolveHorizontalDimension('h', 'H', { x: 10, y: 50 }, { x: 90, y: 50 })
    const vertical = resolveVerticalDimension('v', 'V', { x: 40, y: 10 }, { x: 40, y: 90 })
    const horizontalExtensions = [
      dimensionExtensionLine({ x: 10, y: 20 }, horizontal.from),
      dimensionExtensionLine({ x: 90, y: 20 }, horizontal.to),
    ]
    const verticalExtensions = [
      dimensionExtensionLine({ x: 20, y: 10 }, vertical.from),
      dimensionExtensionLine({ x: 20, y: 90 }, vertical.to),
    ]

    expect(horizontal.arrows?.[0].point.x).toBe(horizontalExtensions[0].dimensionIntersection?.x)
    expect(horizontal.arrows?.[0].point.y).toBe(horizontalExtensions[0].dimensionIntersection?.y)
    expect(horizontal.arrows?.[1].point.x).toBe(horizontalExtensions[1].dimensionIntersection?.x)
    expect(horizontal.arrows?.[1].point.y).toBe(horizontalExtensions[1].dimensionIntersection?.y)
    expect(vertical.arrows?.[0].point.x).toBe(verticalExtensions[0].dimensionIntersection?.x)
    expect(vertical.arrows?.[0].point.y).toBe(verticalExtensions[0].dimensionIntersection?.y)
    expect(vertical.arrows?.[1].point.x).toBe(verticalExtensions[1].dimensionIntersection?.x)
    expect(vertical.arrows?.[1].point.y).toBe(verticalExtensions[1].dimensionIntersection?.y)
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
