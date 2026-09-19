import { describe, expect, it } from 'vitest'
import { mergeBoxSelection, normalizedBox, selectNodeIdsByBox, selectionMode, transformBox } from './boxSelection'

describe('CAD directional box selection', () => {
  const nodes = [
    { id: 'inside', bounds: { left: 20, top: 20, right: 40, bottom: 40 } },
    { id: 'partial', bounds: { left: 90, top: 20, right: 110, bottom: 40 } },
    { id: 'touch', bounds: { left: 100, top: 40, right: 120, bottom: 60 } },
  ]
  const box = { left: 10, top: 10, right: 100, bottom: 50 }
  it('uses horizontal drag direction and normalizes either vertical direction', () => {
    expect(selectionMode(10, 100)).toBe('window')
    expect(selectionMode(100, 10)).toBe('crossing')
    expect(normalizedBox({ x: 100, y: 10 }, { x: 10, y: 100 })).toEqual({ left: 10, top: 10, right: 100, bottom: 100 })
  })
  it('requires complete enclosure for window and includes touching intersections for crossing', () => {
    expect(selectNodeIdsByBox(nodes, box, 'window')).toEqual(['inside'])
    expect(selectNodeIdsByBox(nodes, box, 'crossing')).toEqual(['inside', 'partial', 'touch'])
  })
  it('replaces selection or adds unique IDs with Shift', () => {
    expect(mergeBoxSelection(['old'], ['new', 'new'], false)).toEqual(['new'])
    expect(mergeBoxSelection(['old', 'shared'], ['shared', 'new'], true)).toEqual(['old', 'shared', 'new'])
  })
  it.each([0.5, 1, 2])('converts screen bounds through a zoom %s viewport with pan', zoom => {
    const viewport = { x: 317, y: -129 }
    const toScreen = (point: { x: number; y: number }) => ({ x: viewport.x + zoom * point.x, y: viewport.y + zoom * point.y })
    const toFlow = (point: { x: number; y: number }) => ({ x: (point.x - viewport.x) / zoom, y: (point.y - viewport.y) / zoom })
    const flowNode = { left: 20, top: 30, right: 60, bottom: 70 }
    const flowSelection = { left: 10, top: 20, right: 80, bottom: 90 }
    const screenNode = transformBox(flowNode, toScreen)
    const screenSelection = transformBox(flowSelection, toScreen)
    expect(selectNodeIdsByBox([{ id: 'scaled', bounds: transformBox(screenNode, toFlow) }], transformBox(screenSelection, toFlow), 'window')).toEqual(['scaled'])
  })
})
