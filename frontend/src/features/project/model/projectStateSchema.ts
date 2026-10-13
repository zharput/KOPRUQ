import { z } from 'zod'
import { BRIDGE_TYPES, PIER_SHAPES, type BridgeRow } from './types'
import type { ProjectWorkspaceData } from './projectWorkspace'

/**
 * File-level validation of `projectState`. Project fields may be absent in older files (they are filled from
 * INITIAL_PROJECT by `normalizeProjectState`) but must have the right type when present. Bridge rows follow the
 * `BridgeRow` type: every field that is not normalized on open is required. Numbers are only checked to be numbers.
 */
const text = z.string()
const partialStrings = <T extends z.ZodRawShape>(shape: T) => z.object(shape).partial().passthrough()
const unitsSchema = partialStrings({ length: text, force: text, moment: text, stress: text, mass: text, temperature: text })
const coordinateSchema = partialStrings({ name: text, epsg: text, horizontalDatum: text, verticalDatum: text, originX: text, originY: text, originZ: text, northAngle: text })
const criteriaSchema = partialStrings({ designLife: text, reliabilityClass: text, exposure: text, concreteClass: text, cover: text, philosophy: text })
const environmentSchema = z.object({ terrainDatasetId: text.nullable(), landXmlImportId: text.nullable() }).partial().passthrough()

export type ProjectFileProject = Partial<Omit<ProjectWorkspaceData, 'units' | 'coordinate' | 'criteria' | 'environment'>> & {
  units?: Partial<ProjectWorkspaceData['units']>; coordinate?: Partial<ProjectWorkspaceData['coordinate']>; criteria?: Partial<ProjectWorkspaceData['criteria']>; environment?: Partial<ProjectWorkspaceData['environment']>
}
const projectSchema: z.ZodType<ProjectFileProject, z.ZodTypeDef, unknown> = z.object({
  name: text, id: text, client: text, designer: text, country: text, region: text, projectType: text, status: text, startDate: text, targetDate: text, description: text, locationStart: text, locationEnd: text, coordinateSystem: text,
  designStandardFamily: text, concreteCode: text, steelCode: text, compositeCode: text, seismicCode: text, geotechnicalCode: text, trafficLoadStandard: text, lastModified: text,
  units: unitsSchema, coordinate: coordinateSchema, criteria: criteriaSchema, environment: environmentSchema,
}).partial().passthrough()

export const bridgeRowSchema: z.ZodType<BridgeRow, z.ZodTypeDef, unknown> = z.object({
  id: text.optional(), no: text, km: text, crossingType: text, estimatedLengthM: z.number(), roadWidthM: z.number(), terrain: text, status: text,
  bridgeType: z.enum(BRIDGE_TYPES as [BridgeRow['bridgeType'], ...BridgeRow['bridgeType'][]]),
  spansM: z.array(z.number()), girderDepthCm: z.array(z.number()).nullable(), girderNote: text.nullable(),
  pierShape: z.enum(PIER_SHAPES as [BridgeRow['pierShape'], ...BridgeRow['pierShape'][]]),
}).passthrough()

export type ProjectStateFileInput = { project: ProjectFileProject; bridges: BridgeRow[] }
export const projectStateFileSchema: z.ZodType<ProjectStateFileInput, z.ZodTypeDef, unknown> = z.object({ project: projectSchema, bridges: z.array(bridgeRowSchema) }).passthrough()
