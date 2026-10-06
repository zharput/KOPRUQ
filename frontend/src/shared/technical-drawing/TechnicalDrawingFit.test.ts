import { describe, expect, it } from 'vitest'
import { makeBounds } from './DrawingBounds'
import { computeTechnicalDrawingFit, computeTechnicalDrawingVisualFit } from './TechnicalDrawingFit'

describe('technical drawing fit', () => {
  it('computes a finite uniform fit scale', () => {
    const fit = computeTechnicalDrawingFit({ geometryBounds: makeBounds(0, 200, 0, 100), drawingEnvelope: makeBounds(0, 200, 0, 100), viewport: { width: 400, height: 300 }, safePadding: { top: 24, right: 24, bottom: 24, left: 24 } })
    expect(fit?.scale).toBe(1.76)
    expect(fit?.scaleX).toBe(fit?.scaleY)
  })
  it('guards zero and invalid viewports', () => {
    const geometry = makeBounds(0, 10, 0, 10)
    expect(computeTechnicalDrawingFit({ geometryBounds: geometry, drawingEnvelope: geometry, viewport: { width: 0, height: 300 } })).toBeUndefined()
  })

  it('keeps the geometry centre fixed while applying contained presentation zoom', () => {
    const geometry = makeBounds(-10, 10, -20, 20)
    const fit = computeTechnicalDrawingVisualFit({ geometryBounds: geometry, drawingEnvelope: makeBounds(-11, 11, -21, 21), viewport: { width: 400, height: 300 }, visualScaleFactor: 2 })
    expect(fit?.translateX).toBe(200)
    expect(fit?.translateY).toBe(150)
    expect(fit?.scale).toBeGreaterThan(1)
    expect(fit?.scaleX).toBe(fit?.scaleY)
  })
})
