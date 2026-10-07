import { describe, expect, it } from 'vitest'
import { computeGraphGroupBounds, normalizeGroups } from './graphGroups'

describe('graph group derived bounds', () => {
  it('contains member node dimensions and drawing-space padding', () => {
    const bounds = computeGraphGroupBounds(['a', 'b'], [
      { id: 'a', position: { x: 10, y: 20 } },
      { id: 'b', position: { x: 300, y: 100 } },
    ], { a: { width: 200, height: 80 }, b: { width: 160, height: 120 } })
    expect(bounds).toEqual({ x: -16, y: -20, width: 502, height: 266 })
  })
  it('uses live wide-node measurements and includes socket visual extent', () => {
    const bounds = computeGraphGroupBounds(['range', 'pier'], [
      { id: 'range', position: { x: 0, y: 0 } },
      { id: 'pier', position: { x: 240, y: 40 } },
    ], { range: { width: 180, height: 100 }, pier: { width: 420, height: 180, visualExtent: 8 } })
    expect(bounds?.x).toBe(-26)
    expect(bounds?.width).toBe(714)
    expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeGreaterThan(240 + 420 + 8)
  })
  it('drops orphaned and single-member groups when nodes are removed', () => {
    const groups = normalizeGroups([{ id: 'g', name: 'Group', color: '#fff', nodeIds: ['a', 'b'] }], new Set(['a']))
    expect(groups).toEqual([])
  })
})
