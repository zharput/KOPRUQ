import { describe, expect, it } from 'vitest'
import { drawingBounds, estimateTechnicalTextBounds } from './DrawingBounds'

describe('annotation-safe drawing bounds', () => {
  it('handles text-anchor semantics and long precision labels', () => {
    const left = estimateTechnicalTextBounds({ text: 'H = 1.0000', x: 20, y: 30, textAnchor: 'end' })
    const right = estimateTechnicalTextBounds({ text: 'th1 = 0.1500', x: 80, y: 30, textAnchor: 'start' })
    expect(left.minX).toBeLessThan(20)
    expect(right.maxX).toBeGreaterThan(80)
  })

  it('includes all dimension annotation envelopes in drawing bounds', () => {
    const bounds = drawingBounds([{ x: 10, y: 10 }, { x: 30, y: 40 }], [
      { id: 'H', label: 'H', formattedValue: '1.0000', side: 'left', from: { x: 10, y: 10 }, to: { x: 10, y: 40 }, text: { point: { x: 8, y: 25 }, anchor: 'end' } },
      { id: 'th1', label: 'th1', formattedValue: '0.1500', side: 'right', from: { x: 30, y: 10 }, to: { x: 30, y: 20 }, text: { point: { x: 32, y: 15 }, anchor: 'start' } },
    ])
    expect(bounds.minX).toBeLessThanOrEqual(estimateTechnicalTextBounds({ text: 'H = 1.0000', x: 8, y: 25, textAnchor: 'end' }).minX)
    expect(bounds.maxX).toBeGreaterThanOrEqual(estimateTechnicalTextBounds({ text: 'th1 = 0.1500', x: 32, y: 15, textAnchor: 'start' }).maxX)
  })
})
