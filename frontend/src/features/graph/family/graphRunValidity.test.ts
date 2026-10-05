import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyGraph } from '../state/graphStore'
import { clearSuccessfulGraphRuns, graphRunValidity, recordSuccessfulGraphRun } from './graphRunValidity'

describe('Graph run validity', () => {
  beforeEach(() => { localStorage.clear(); clearSuccessfulGraphRuns() })
  it('starts INVALID and becomes VALID only after a successful run is recorded', () => {
    const graph = { ...createEmptyGraph('test', { bridgeId: 'bridge-1' }), nodes: [], connections: [] }
    expect(graphRunValidity(graph)).toBe('INVALID')
    recordSuccessfulGraphRun(graph)
    expect(graphRunValidity(graph)).toBe('VALID')
  })
  it('becomes INVALID when engineering graph inputs change', () => {
    const graph = { ...createEmptyGraph('test', { bridgeId: 'bridge-1' }), nodes: [], connections: [] }
    recordSuccessfulGraphRun(graph)
    const changed = { ...graph, name: 'renamed' }
    expect(graphRunValidity(changed)).toBe('VALID')
    const edited = { ...graph, nodes: [{ id: 'n', type: 'input.number', name: 'N', position: { x: 0, y: 0 }, parameters: { value: 2 } }] }
    expect(graphRunValidity(edited)).toBe('INVALID')
  })
})
