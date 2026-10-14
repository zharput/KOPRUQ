import { z } from 'zod'
import { WireMappingError } from '../../../shared/project-store/projectDataValidation'
import type { CollectionDefinition } from '../../../shared/project-store/serverSection'
import type { GraphParameterValue, KopruqGraph } from '../domain/types'

/**
 * Wire mapping of one graph document (`PUT /graphs/{graphId}`). Source of the shape: backend `GraphDtos` (key order follows
 * the record components). A node parameter is `{ key, kind, value }` where `kind` is NUMBER, BOOLEAN, STRING or NUMBER_ARRAY
 * and `value` must be the matching JSON type. `activeGraphId`, undo/redo, run state and view preferences are not part of the document.
 */
const text = z.string()
const parameter = z.discriminatedUnion('kind', [
  z.object({ key: text, kind: z.literal('NUMBER'), value: z.number() }).strict(),
  z.object({ key: text, kind: z.literal('BOOLEAN'), value: z.boolean() }).strict(),
  z.object({ key: text, kind: z.literal('STRING'), value: text }).strict(),
  z.object({ key: text, kind: z.literal('NUMBER_ARRAY'), value: z.array(z.number()) }).strict(),
])
const node = z.object({ id: text, type: text, name: text, position: z.object({ x: z.number(), y: z.number() }).strict(), parameters: z.array(parameter) }).strict()
const connection = z.object({ id: text, sourceNodeId: text, sourcePortId: text, targetNodeId: text, targetPortId: text }).strict()
const group = z.object({ id: text, name: text, nodeIds: z.array(text), color: text }).strict()

export const graphWireSchema = z.object({
  id: text, name: text, schemaVersion: z.literal(1), projectId: text.nullable(), bridgeId: text.nullable(),
  nodes: z.array(node), connections: z.array(connection), groups: z.array(group).nullable(),
}).strict()
export type GraphWire = z.infer<typeof graphWireSchema>
type ParameterWire = z.infer<typeof parameter>

function parameterToWire(path: string, key: string, value: unknown): ParameterWire {
  if (typeof value === 'number') return { key, kind: 'NUMBER', value }
  if (typeof value === 'boolean') return { key, kind: 'BOOLEAN', value }
  if (typeof value === 'string') return { key, kind: 'STRING', value }
  if (Array.isArray(value) && value.every((item) => typeof item === 'number')) return { key, kind: 'NUMBER_ARRAY', value: value as number[] }
  throw new WireMappingError(path, 'must be a number, boolean, string or number array')
}

export function graphToWire(graph: KopruqGraph): GraphWire {
  return {
    id: graph.id, name: graph.name, schemaVersion: 1, projectId: graph.projectId ?? null, bridgeId: graph.bridgeId ?? null,
    nodes: graph.nodes.map((n, index) => ({
      id: n.id, type: n.type, name: n.name, position: { x: n.position.x, y: n.position.y },
      parameters: Object.entries(n.parameters).map(([key, value]) => parameterToWire(`nodes[${index}].parameters.${key}`, key, value)),
    })),
    connections: graph.connections.map((c) => ({ id: c.id, sourceNodeId: c.sourceNodeId, sourcePortId: c.sourcePortId, targetNodeId: c.targetNodeId, targetPortId: c.targetPortId })),
    groups: graph.groups ? graph.groups.map((g) => ({ id: g.id, name: g.name, nodeIds: [...g.nodeIds], color: g.color })) : null,
  }
}

export function graphFromWire(wire: GraphWire): KopruqGraph {
  return {
    id: wire.id, name: wire.name, schemaVersion: 1,
    ...(wire.projectId !== null && { projectId: wire.projectId }), ...(wire.bridgeId !== null && { bridgeId: wire.bridgeId }),
    nodes: wire.nodes.map((n) => ({
      id: n.id, type: n.type, name: n.name, position: { x: n.position.x, y: n.position.y },
      parameters: Object.fromEntries(n.parameters.map((p) => [p.key, p.value as GraphParameterValue])),
    })),
    connections: wire.connections.map((c) => ({ ...c })),
    ...(wire.groups !== null && { groups: wire.groups.map((g) => ({ id: g.id, name: g.name, nodeIds: [...g.nodeIds], color: g.color })) }),
  }
}

/** One PUT per graph at `graphs/<id>`; graphs are upserted, never deleted. */
export const GRAPH_COLLECTION: CollectionDefinition<KopruqGraph, GraphWire> = {
  id: 'graphs',
  pathOf: (id) => `graphs/${encodeURIComponent(id)}`,
  codec: { schema: graphWireSchema, idOf: (graph) => graph.id, toWire: graphToWire, fromWire: graphFromWire },
}
