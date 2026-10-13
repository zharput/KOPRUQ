import { z } from 'zod'
import type { GraphGroup, KopruqConnection, KopruqGraph, KopruqNode } from '../domain/types'

/**
 * Structural validation of graph documents inside a .kopruq file. Parameter values are not inspected
 * (legacy `tw*` migrations rely on them); numbers are only checked to be numbers.
 */
const nodeSchema: z.ZodType<KopruqNode, z.ZodTypeDef, unknown> = z.object({
  id: z.string(), type: z.string(), name: z.string(),
  position: z.object({ x: z.number(), y: z.number() }).passthrough(),
  parameters: z.record(z.string(), z.unknown()),
}).passthrough() as unknown as z.ZodType<KopruqNode, z.ZodTypeDef, unknown>
const connectionSchema: z.ZodType<KopruqConnection, z.ZodTypeDef, unknown> = z.object({
  id: z.string(), sourceNodeId: z.string(), sourcePortId: z.string(), targetNodeId: z.string(), targetPortId: z.string(),
}).passthrough()
const groupSchema: z.ZodType<GraphGroup, z.ZodTypeDef, unknown> = z.object({ id: z.string(), name: z.string(), nodeIds: z.array(z.string()), color: z.string() }).passthrough()
export const graphSchema: z.ZodType<KopruqGraph, z.ZodTypeDef, unknown> = z.object({
  id: z.string(), name: z.string(), schemaVersion: z.literal(1),
  projectId: z.string().optional(), bridgeId: z.string().optional(),
  nodes: z.array(nodeSchema), connections: z.array(connectionSchema), groups: z.array(groupSchema).optional(),
}).passthrough()
