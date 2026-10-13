import { z } from 'zod'
import type { AxisFamilyAssignments, BridgeAxis, BridgeConstraint, BridgeInstanceDefinition } from './types'

/**
 * File-level validation of `bridgeDefinitions`. Per-definition fields may be absent in older files
 * (`ensureBridgeDefinitions` fills them from `createBridgeDefinition`) but must have the right type when present.
 * Numbers are only checked to be numbers; the existing normalization keeps filtering spans.
 */
const text = z.string()
const nullableText = text.nullable()
const nullableNumber = z.number().nullable()

const axisSchema: z.ZodType<BridgeAxis, z.ZodTypeDef, unknown> = z.object({
  id: text, name: text, type: z.enum(['ABUTMENT', 'PIER']), chainageM: z.number(),
  elevationM: nullableNumber.optional(), skewDegrees: nullableNumber.optional(),
}).passthrough() as unknown as z.ZodType<BridgeAxis, z.ZodTypeDef, unknown>
const constraintSchema: z.ZodType<BridgeConstraint, z.ZodTypeDef, unknown> = z.object({
  id: text, kind: z.enum(['ROAD_RAILWAY', 'RIVER', 'CLEARANCE', 'UTILITY', 'ENVIRONMENT', 'OTHER']), name: text,
  startChainageM: nullableNumber, endChainageM: nullableNumber, note: text,
}).passthrough()
const assignmentsSchema: z.ZodType<Partial<AxisFamilyAssignments>, z.ZodTypeDef, unknown> = z.object({
  pierFamilyId: nullableText, pierHeightM: nullableNumber, pierCapFamilyId: nullableText, foundationFamilyId: nullableText, foundationElevationM: nullableNumber, soilReference: text,
  bearingFamilyId: nullableText, bearingQuantity: nullableNumber, bearingOrientation: text, longitudinalBehavior: text, transverseBehavior: text,
}).partial().passthrough()
const definitionSchema: z.ZodType<Partial<BridgeInstanceDefinition>, z.ZodTypeDef, unknown> = z.object({
  bridgeId: text, spanLengthsM: z.array(z.number()), axes: z.array(axisSchema), selectedAxisId: nullableText, superstructureType: text,
  girderFamilyId: nullableText, girderVariantId: nullableText, girderCount: nullableNumber, deckWidthOverrideM: nullableNumber,
  axisAssignments: z.record(z.string(), assignmentsSchema), abutmentFamilyIds: z.object({ A1: nullableText, A2: nullableText }).partial().passthrough(),
  constructionMethod: text, constructionStagesNote: text, constraints: z.array(constraintSchema), selectedConstraintId: nullableText,
  viewMode: z.enum(['3D', 'PLAN', 'PROFILE']), terrainVisible: z.boolean(),
}).partial().passthrough() as unknown as z.ZodType<Partial<BridgeInstanceDefinition>, z.ZodTypeDef, unknown>

export type BridgeDefinitionStoreFileInput = { selectedBridgeId?: string | null; definitions: Record<string, Partial<BridgeInstanceDefinition>> }
export const bridgeDefinitionStoreFileSchema: z.ZodType<BridgeDefinitionStoreFileInput, z.ZodTypeDef, unknown> = z.object({
  selectedBridgeId: nullableText.optional(),
  definitions: z.record(z.string(), definitionSchema),
}).passthrough()
