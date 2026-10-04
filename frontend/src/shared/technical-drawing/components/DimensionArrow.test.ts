import { describe, expect, it } from 'vitest'
import { dimensionArrowLocalPoints, dimensionArrowPoints, DimensionArrow } from './DimensionArrow'
import { render } from '@testing-library/react'
import { createElement } from 'react'
import { ExtensionLine } from './ExtensionLine'

function points(value: string) {
  return value.split(' ').map(point => point.split(',').map(Number))
}

describe('DimensionArrow geometry', () => {
  it.each([
    ['right', 1, 0],
    ['left', -1, 0],
    ['down', 0, 1],
    ['up', 0, -1],
  ] as const)('uses the endpoint as the tip and points %s', (direction, dx, dy) => {
    const triangle = points(dimensionArrowPoints(20, 30, direction))
    expect(triangle[0]).toEqual([20, 30])
    const base = triangle.slice(1)
    const baseCenter = [
      (base[0][0] + base[1][0]) / 2,
      (base[0][1] + base[1][1]) / 2,
    ]
    expect(Math.sign(20 - baseCenter[0])).toBe(dx)
    expect(Math.sign(30 - baseCenter[1])).toBe(dy)
  })

  it.each(['left', 'right', 'up', 'down'] as const)('renders the actual SVG tip at the endpoint for %s', (direction) => {
    const { container } = render(createElement('svg', null, createElement(DimensionArrow, { x: 100, y: 50, direction })))
    const polygon = container.querySelector('[data-dimension-arrow]')
    expect(polygon?.getAttribute('transform')).toBe('translate(100 50)')
    expect(polygon?.getAttribute('points')?.split(' ')[0]).toBe('0,0')
    expect(polygon?.getAttribute('fill')).toBe('#8FAEC6')
    expect(polygon?.getAttribute('stroke')).toBe('none')
    expect(dimensionArrowLocalPoints(direction).split(' ')[0]).toBe('0,0')
  })

  it('renders extension lines with butt caps', () => {
    const { container } = render(createElement('svg', null, createElement(ExtensionLine, { from: { x: 1, y: 2 }, to: { x: 3, y: 4 } })))
    expect(container.querySelector('[data-extension-line]')?.getAttribute('stroke-linecap')).toBe('butt')
  })
})
