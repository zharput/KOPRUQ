import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { parseProjectData, WireMappingError } from '../../../shared/project-store/projectDataValidation'
import type { KopruqGraph } from '../domain/types'
import { GRAPH_COLLECTION, graphFromWire, graphToWire, graphWireSchema } from './graphWire'
import { createEmptyGraph } from './graphStore'

const FULL: KopruqGraph = {
  id: 'g-1', name: 'Main', schemaVersion: 1, projectId: 'proj-1', bridgeId: 'bridge-1',
  nodes: [
    { id: 'n1', type: 'number', name: 'Span', position: { x: 10, y: -20.5 }, parameters: { value: 35, flag: true, label: 'abc', list: [30, 35, 40], none: [] } },
    { id: 'n2', type: 'display', name: 'Out', position: { x: 0, y: 0 }, parameters: {} },
  ],
  connections: [{ id: 'c1', sourceNodeId: 'n1', sourcePortId: 'out', targetNodeId: 'n2', targetPortId: 'in' }],
  groups: [{ id: 'grp', name: 'Group', nodeIds: ['n1'], color: '#fff' }],
}

describe('graph wire mapping', () => {
  it('round-trips a graph with all four parameter kinds, groups and ownership', () => {
    const wire = graphToWire(FULL)
    expect(wire.nodes[0].parameters).toEqual([
      { key: 'value', kind: 'NUMBER', value: 35 }, { key: 'flag', kind: 'BOOLEAN', value: true }, { key: 'label', kind: 'STRING', value: 'abc' },
      { key: 'list', kind: 'NUMBER_ARRAY', value: [30, 35, 40] }, { key: 'none', kind: 'NUMBER_ARRAY', value: [] },
    ])
    expect(parseProjectData(graphWireSchema, JSON.parse(JSON.stringify(wire)), 'value')).toEqual(wire)
    expect(graphFromWire(wire)).toEqual(FULL)
  })
  it('round-trips a graph without groups or ownership (null -> key omitted) and keeps [] groups', () => {
    const bare: KopruqGraph = { id: 'g-2', name: 'Bare', schemaVersion: 1, nodes: [], connections: [] }
    const wire = graphToWire(bare)
    expect(wire).toMatchObject({ projectId: null, bridgeId: null, groups: null })
    const back = graphFromWire(wire)
    expect(back).toEqual(bare); expect('groups' in back).toBe(false); expect('projectId' in back).toBe(false)
    const empty = createEmptyGraph('E'); expect(graphToWire(empty).groups).toEqual([]); expect(graphFromWire(graphToWire(empty))).toEqual(empty)
  })
  it('emits keys in the backend record order and drops passthrough and UI-only fields', () => {
    const wire = graphToWire({ ...FULL, extra: 1, activeGraphId: 'g-1' } as KopruqGraph)
    expect(Object.keys(wire)).toEqual(['id', 'name', 'schemaVersion', 'projectId', 'bridgeId', 'nodes', 'connections', 'groups'])
    expect(Object.keys(wire.nodes[0])).toEqual(['id', 'type', 'name', 'position', 'parameters'])
    expect(Object.keys(wire.nodes[0].position)).toEqual(['x', 'y'])
    expect(Object.keys(wire.nodes[0].parameters[0])).toEqual(['key', 'kind', 'value'])
    expect(Object.keys(wire.connections[0])).toEqual(['id', 'sourceNodeId', 'sourcePortId', 'targetNodeId', 'targetPortId'])
    expect(Object.keys(wire.groups?.[0] as object)).toEqual(['id', 'name', 'nodeIds', 'color'])
    const text = JSON.stringify(wire); expect(text).not.toContain('extra'); expect(text).not.toContain('activeGraphId')
  })
  it('toWire rejects a parameter that none of the four kinds can represent, with the path', () => {
    const bad = (value: unknown): KopruqGraph => ({ ...FULL, nodes: [FULL.nodes[0], { ...FULL.nodes[1], parameters: { a: value } as never }] })
    for (const value of [{ x: 1 }, null, ['a'], [1, 'a'], undefined]) {
      expect(() => graphToWire(bad(value))).toThrow(WireMappingError)
    }
    expect(() => graphToWire(bad({ x: 1 }))).toThrow('Cannot send project data: nodes[1].parameters.a - must be a number, boolean, string or number array')
  })
  it('the strict schema rejects unknown keys, an unknown kind, schemaVersion 2 and a kind/value mismatch with the full path', () => {
    const wire = JSON.parse(JSON.stringify(graphToWire(FULL)))
    const doc = (graph: unknown) => ({ graphs: [graph] })
    const schema = z.object({ graphs: z.array(graphWireSchema) })
    expect(() => parseProjectData(schema, doc({ ...wire, extra: 1 }), '')).toThrow('graphs[0]')
    const kind = JSON.parse(JSON.stringify(wire)); kind.nodes[0].parameters[0].kind = 'OBJECT'
    expect(() => parseProjectData(schema, doc(kind), '')).toThrow('graphs[0].nodes[0].parameters[0].kind')
    const version = JSON.parse(JSON.stringify(wire)); version.schemaVersion = 2
    expect(() => parseProjectData(schema, doc(version), '')).toThrow('graphs[0].schemaVersion')
    const mismatch = JSON.parse(JSON.stringify(wire)); mismatch.nodes[0].parameters[1].value = 'true'
    expect(() => parseProjectData(schema, doc(mismatch), '')).toThrow('graphs[0].nodes[0].parameters[1].value')
  })
  it('collection definition: path per graph id, id of a graph', () => {
    expect(GRAPH_COLLECTION.pathOf('g/1 x')).toBe('graphs/g%2F1%20x'); expect(GRAPH_COLLECTION.codec.idOf(FULL)).toBe('g-1')
  })
})
