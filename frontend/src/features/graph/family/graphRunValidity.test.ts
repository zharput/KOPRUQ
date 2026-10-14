import { beforeEach, describe, expect, it } from 'vitest'
import { NEW_PROJECT_DOCUMENT_JSON } from '../../../app/project-session/projectDocumentFixtures'
import { openTestProject } from '../../../test/projectSessionTestUtils'
import { createEmptyGraph } from '../state/graphStore'
import { clearSuccessfulGraphRuns, graphRunValidity, nodeRunValidity, recordSuccessfulGraphRun } from './graphRunValidity'

describe('Graph run validity', () => {
  beforeEach(() => { clearSuccessfulGraphRuns() })
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
  const node = (id: string, type: string, parameters: Record<string, number>) => ({ id, type, name: id, position: { x: 0, y: 0 }, parameters })
  const chain = (upstreamValue: number, targetPortId = 'a') => ({ ...createEmptyGraph('chain', { bridgeId: 'bridge-1' }), id: 'chain-graph', nodes: [node('up', 'input.number', { value: upstreamValue }), node('down', 'math.add', { b: 1 }), node('other', 'input.number', { value: 5 })], connections: [{ id: 'e1', sourceNodeId: 'up', sourcePortId: 'value', targetNodeId: 'down', targetPortId }] })
  it('invalidates a downstream node when an upstream parameter changes, but not an unrelated node', () => {
    recordSuccessfulGraphRun(chain(1))
    expect(nodeRunValidity(chain(1), 'down')).toBe(true)
    expect(nodeRunValidity(chain(2), 'down')).toBe(false); expect(nodeRunValidity(chain(2), 'up')).toBe(false); expect(nodeRunValidity(chain(2), 'other')).toBe(true)
  })
  it('invalidates a downstream node when its incoming connection is rewired', () => {
    recordSuccessfulGraphRun(chain(1, 'a'))
    expect(nodeRunValidity(chain(1, 'b'), 'down')).toBe(false)
  })
  it('becomes INVALID when the project length unit changes', () => {
    const graph = chain(1)
    recordSuccessfulGraphRun(graph, { length: 'm', force: 'kN' })
    expect(graphRunValidity(graph, { length: 'm', force: 'kN' })).toBe('VALID')
    expect(graphRunValidity(graph, { length: 'mm', force: 'kN' })).toBe('INVALID')
    expect(nodeRunValidity(graph, 'down', { length: 'mm', force: 'kN' })).toBe(false)
  })
  it('forgets successful runs when the project changes', () => {
    const graph = chain(1)
    recordSuccessfulGraphRun(graph)
    expect(graphRunValidity(graph)).toBe('VALID')
    openTestProject(NEW_PROJECT_DOCUMENT_JSON)
    expect(graphRunValidity(graph)).toBe('INVALID')
    expect(nodeRunValidity(graph, 'down')).toBe(false)
  })
})
