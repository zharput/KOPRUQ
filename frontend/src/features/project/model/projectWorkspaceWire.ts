import { z } from 'zod'
import { WireMappingError } from '../../../shared/project-store/projectDataValidation'
import type { SectionDefinition } from '../../../shared/project-store/serverSection'
import { normalizeProjectState, type PersistedProjectState } from './projectWorkspaceModel'
import { BRIDGE_TYPES, PIER_SHAPES, type BridgeRow } from './types'

/**
 * Wire mapping of the workspace section (`PUT /workspace`, `workspace` of the project document).
 * Source of the shape: backend `WorkspaceDto` (key order follows its record components). Strict: an unknown key is rejected.
 * No unit conversion: `girderDepthCm` stays centimetres, lengths stay metres.
 */
const text = z.string()
const number = z.number()
const units = z.object({ length: text, force: text, moment: text, stress: text, mass: text, temperature: text }).strict()
const coordinate = z.object({ name: text, epsg: text, horizontalDatum: text, verticalDatum: text, originX: text, originY: text, originZ: text, northAngle: text }).strict()
const criteria = z.object({ designLife: text, reliabilityClass: text, exposure: text, concreteClass: text, cover: text, philosophy: text }).strict()
const environment = z.object({ terrainDatasetId: text.nullable(), landXmlImportId: text.nullable() }).strict()
const projectInfo = z.object({
  name: text, id: text, client: text, designer: text, country: text, region: text, projectType: text, status: text, startDate: text, targetDate: text,
  description: text, locationStart: text, locationEnd: text, coordinateSystem: text, designStandardFamily: text, concreteCode: text, steelCode: text,
  compositeCode: text, seismicCode: text, geotechnicalCode: text, trafficLoadStandard: text, units, coordinate, criteria, environment, lastModified: text,
}).strict()
const bridgeRow = z.object({
  id: text, no: text, km: text, crossingType: text, estimatedLengthM: number, roadWidthM: number, terrain: text, status: text,
  bridgeType: z.enum(BRIDGE_TYPES as [BridgeRow['bridgeType'], ...BridgeRow['bridgeType'][]]),
  spansM: z.array(number), girderDepthCm: z.array(number).nullable(), girderNote: text.nullable(),
  pierShape: z.enum(PIER_SHAPES as [BridgeRow['pierShape'], ...BridgeRow['pierShape'][]]),
}).strict()

export const workspaceWireSchema = z.object({ project: projectInfo, bridges: z.array(bridgeRow) }).strict()
export type WorkspaceWire = z.infer<typeof workspaceWireSchema>

export function workspaceToWire(state: PersistedProjectState): WorkspaceWire {
  const p = state.project
  return {
    project: {
      name: p.name, id: p.id, client: p.client, designer: p.designer, country: p.country, region: p.region, projectType: p.projectType, status: p.status,
      startDate: p.startDate, targetDate: p.targetDate, description: p.description, locationStart: p.locationStart, locationEnd: p.locationEnd,
      coordinateSystem: p.coordinateSystem, designStandardFamily: p.designStandardFamily, concreteCode: p.concreteCode, steelCode: p.steelCode,
      compositeCode: p.compositeCode, seismicCode: p.seismicCode, geotechnicalCode: p.geotechnicalCode, trafficLoadStandard: p.trafficLoadStandard,
      units: { length: p.units.length, force: p.units.force, moment: p.units.moment, stress: p.units.stress, mass: p.units.mass, temperature: p.units.temperature },
      coordinate: {
        name: p.coordinate.name, epsg: p.coordinate.epsg, horizontalDatum: p.coordinate.horizontalDatum, verticalDatum: p.coordinate.verticalDatum,
        originX: p.coordinate.originX, originY: p.coordinate.originY, originZ: p.coordinate.originZ, northAngle: p.coordinate.northAngle,
      },
      criteria: { designLife: p.criteria.designLife, reliabilityClass: p.criteria.reliabilityClass, exposure: p.criteria.exposure, concreteClass: p.criteria.concreteClass, cover: p.criteria.cover, philosophy: p.criteria.philosophy },
      environment: { terrainDatasetId: p.environment.terrainDatasetId ?? null, landXmlImportId: p.environment.landXmlImportId ?? null },
      lastModified: p.lastModified,
    },
    bridges: state.bridges.map((b, index) => {
      if (b.id === undefined || b.id === null) throw new WireMappingError(`bridges[${index}].id`, 'is required')
      if (b.id.trim() === '') throw new WireMappingError(`bridges[${index}].id`, 'must not be blank')
      return {
        id: b.id, no: b.no, km: b.km, crossingType: b.crossingType, estimatedLengthM: b.estimatedLengthM, roadWidthM: b.roadWidthM, terrain: b.terrain, status: b.status,
        bridgeType: b.bridgeType, spansM: b.spansM, girderDepthCm: b.girderDepthCm ?? null, girderNote: b.girderNote ?? null, pierShape: b.pierShape,
      }
    }),
  }
}

/** The backend guarantees non-empty, unique bridge ids, so `ensureBridgeIds` is a no-op; only `normalizeUnitId` can change a value. */
export function workspaceFromWire(wire: WorkspaceWire): PersistedProjectState {
  return normalizeProjectState({ project: wire.project, bridges: wire.bridges }, [])
}

export const WORKSPACE_SECTION: SectionDefinition<PersistedProjectState, WorkspaceWire> = {
  id: 'workspace', path: 'workspace',
  codec: { schema: workspaceWireSchema.nullable(), clearable: false, toWire: workspaceToWire, fromWire: (wire) => wire === null ? undefined : workspaceFromWire(wire) },
}
