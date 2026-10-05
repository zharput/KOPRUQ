import { describe, expect, it } from 'vitest'
import { structuralSectionPreviewLayout } from './StructuralSectionPreviewLayout'

describe('structural section preview layout', () => {
  it('fits maximum geometry and keeps axes independent of selected geometry', () => {
    const small = structuralSectionPreviewLayout(300, 270, { width: 3, height: 4 }, { width: 1, height: 2 })
    const large = structuralSectionPreviewLayout(300, 270, { width: 3, height: 4 }, { width: 3, height: 4 })
    expect(small.referenceScale).toBe(large.referenceScale)
    expect(small.xAxis.x2).toBeLessThan(large.xAxis.x2)
    expect(small.yAxis.y1).toBeGreaterThan(large.yAxis.y1)
    expect(small.xLabel.x).toBeLessThan(large.xLabel.x)
    expect(small.yLabel.y).toBeGreaterThan(large.yLabel.y)
    expect(small.geometryFitBounds.right - small.geometryFitBounds.left).toBeGreaterThan(0)
  })
  it('uses SVG user-unit height and the central 68 percent target', () => {
    const layout = structuralSectionPreviewLayout(900, 700, { width: 30, height: 10 }, { width: 3, height: 3 })
    expect(layout.referenceScale).toBe(40)
    expect(10 * layout.referenceScale).toBe(400)
    expect(3 * layout.referenceScale).toBe(120)
  })
})
