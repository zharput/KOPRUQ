import { z } from 'zod'
import { WireMappingError } from '../../../shared/project-store/projectDataValidation'
import type { SectionDefinition } from '../../../shared/project-store/serverSection'
import type { AxisFamilyAssignments, BridgeAxis, BridgeConstraint, BridgeDefinitionStore, BridgeInstanceDefinition } from './types'

/**
 * Wire mapping of the bridge definitions section (`PUT /bridge-definitions`). Source of the shape: backend
 * `BridgeDefinitionsDto` (key order follows its record components). Lengths and chainages are metres, skew is degrees; nothing is converted.
 * UI-only state (`keyBy`, `selectedBridgeId`, `selectedAxisId`, `selectedConstraintId`, `viewMode`, `terrainVisible`) is not sent.
 */
const text = z.string()
const number = z.number()
const axis = z.object({ id: text, name: text, type: z.enum(['ABUTMENT', 'PIER']), chainageM: number, elevationM: number.nullable(), skewDegrees: number.nullable() }).strict()
const assignment = z.object({
  axisId: text, pierFamilyId: text.nullable(), pierHeightM: number.nullable(), pierCapFamilyId: text.nullable(), foundationFamilyId: text.nullable(),
  foundationElevationM: number.nullable(), soilReference: text, bearingFamilyId: text.nullable(), bearingQuantity: number.nullable(),
  bearingOrientation: text, longitudinalBehavior: text, transverseBehavior: text,
}).strict()
const constraint = z.object({
  id: text, kind: z.enum(['ROAD_RAILWAY', 'RIVER', 'CLEARANCE', 'UTILITY', 'ENVIRONMENT', 'OTHER']), name: text,
  startChainageM: number.nullable(), endChainageM: number.nullable(), note: text,
}).strict()
const definition = z.object({
  definitionKey: text, bridgeId: text, spanLengthsM: z.array(number), axes: z.array(axis), superstructureType: text,
  girderFamilyId: text.nullable(), girderVariantId: text.nullable(), girderCount: number.nullable(), deckWidthOverrideM: number.nullable(),
  axisAssignments: z.array(assignment), abutmentFamilyIds: z.object({ A1: text.nullable(), A2: text.nullable() }).strict(),
  constructionMethod: text, constructionStagesNote: text, constraints: z.array(constraint),
}).strict()

export const bridgeDefinitionsWireSchema = z.object({ definitions: z.array(definition) }).strict()
export type BridgeDefinitionsWire = z.infer<typeof bridgeDefinitionsWireSchema>

function nonBlank(path: string, value: string) {
  if (value.trim() === '') throw new WireMappingError(path, 'must not be blank')
  return value
}

export function bridgeDefinitionsToWire(store: BridgeDefinitionStore): BridgeDefinitionsWire {
  if (store.keyBy !== 'bridgeId') throw new WireMappingError('keyBy', 'must be bridgeId')
  return {
    definitions: Object.entries(store.definitions).map(([key, d], index) => {
      const at = `definitions[${index}]`
      return {
        definitionKey: nonBlank(`${at}.definitionKey`, key), bridgeId: d.bridgeId, spanLengthsM: d.spanLengthsM,
        axes: d.axes.map((a) => ({ id: a.id, name: a.name, type: a.type, chainageM: a.chainageM, elevationM: a.elevationM ?? null, skewDegrees: a.skewDegrees ?? null })),
        superstructureType: d.superstructureType, girderFamilyId: d.girderFamilyId ?? null, girderVariantId: d.girderVariantId ?? null,
        girderCount: d.girderCount ?? null, deckWidthOverrideM: d.deckWidthOverrideM ?? null,
        axisAssignments: Object.entries(d.axisAssignments).map(([axisId, a]) => ({
          axisId: nonBlank(`${at}.axisAssignments.${axisId}`, axisId), pierFamilyId: a.pierFamilyId ?? null, pierHeightM: a.pierHeightM ?? null,
          pierCapFamilyId: a.pierCapFamilyId ?? null, foundationFamilyId: a.foundationFamilyId ?? null, foundationElevationM: a.foundationElevationM ?? null,
          soilReference: a.soilReference, bearingFamilyId: a.bearingFamilyId ?? null, bearingQuantity: a.bearingQuantity ?? null,
          bearingOrientation: a.bearingOrientation, longitudinalBehavior: a.longitudinalBehavior, transverseBehavior: a.transverseBehavior,
        })),
        abutmentFamilyIds: { A1: d.abutmentFamilyIds.A1 ?? null, A2: d.abutmentFamilyIds.A2 ?? null },
        constructionMethod: d.constructionMethod, constructionStagesNote: d.constructionStagesNote,
        constraints: d.constraints.map((c) => ({ id: c.id, kind: c.kind, name: c.name, startChainageM: c.startChainageM ?? null, endChainageM: c.endChainageM ?? null, note: c.note })),
      }
    }),
  }
}

/**
 * UI-only fields get the same values `createBridgeDefinition` / `mergeDefinition` give (selected axis = first axis, no constraint selected,
 * PROFILE view, terrain visible); a test keeps them equal. `selectedBridgeId` is null. Reconciliation with the workspace
 * (`ensureBridgeDefinitions`) is the caller's decision and is deliberately not done here.
 */
export function bridgeDefinitionsFromWire(wire: BridgeDefinitionsWire): BridgeDefinitionStore {
  // Object.fromEntries defines own properties, so keys such as `__proto__` are kept (plain assignment would drop them).
  const entries: [string, BridgeInstanceDefinition][] = []
  for (const d of wire.definitions) {
    const axes: BridgeAxis[] = d.axes.map((a) => ({ id: a.id, name: a.name, type: a.type, chainageM: a.chainageM, elevationM: a.elevationM, skewDegrees: a.skewDegrees }))
    const axisAssignments: Record<string, AxisFamilyAssignments> = Object.fromEntries(d.axisAssignments.map(({ axisId, ...rest }) => [axisId, rest]))
    const constraints: BridgeConstraint[] = d.constraints.map((c) => ({ ...c }))
    entries.push([d.definitionKey, {
      bridgeId: d.bridgeId, spanLengthsM: [...d.spanLengthsM], axes, selectedAxisId: axes[0]?.id ?? null, superstructureType: d.superstructureType,
      girderFamilyId: d.girderFamilyId, girderVariantId: d.girderVariantId, girderCount: d.girderCount, deckWidthOverrideM: d.deckWidthOverrideM,
      axisAssignments, abutmentFamilyIds: { A1: d.abutmentFamilyIds.A1, A2: d.abutmentFamilyIds.A2 }, constructionMethod: d.constructionMethod,
      constructionStagesNote: d.constructionStagesNote, constraints, selectedConstraintId: null, viewMode: 'PROFILE', terrainVisible: true,
    }])
  }
  return { keyBy: 'bridgeId', selectedBridgeId: null, definitions: Object.fromEntries(entries) }
}

export const BRIDGE_DEFINITIONS_SECTION: SectionDefinition<BridgeDefinitionStore, BridgeDefinitionsWire> = {
  id: 'bridgeDefinitions', path: 'bridge-definitions',
  codec: { schema: bridgeDefinitionsWireSchema.nullable(), clearable: false, toWire: bridgeDefinitionsToWire, fromWire: (wire) => wire === null ? undefined : bridgeDefinitionsFromWire(wire) },
}
