import { z } from 'zod'
import { parseProjectData } from '../../shared/project-store/projectDataValidation'
import type { CollectionDefinition, SectionDefinition } from '../../shared/project-store/serverSection'
import { BRIDGE_DEFINITIONS_SECTION, bridgeDefinitionsWireSchema } from '../../features/bridge-definition/model/bridgeDefinitionWire'
import type { BridgeDefinitionStore } from '../../features/bridge-definition/model/types'
import {
  FAMILY_SECTIONS, GIRDER_LIBRARY_SECTION, familiesWireSchema, girderLibraryWireSchema, type FamilyRecordOf, type GirderLibraryValue,
} from '../../features/family-registry/model/familyWire'
import type { FamilyRepositoryCategory } from '../../features/family-registry/model/familyRepository'
import { GRAPH_COLLECTION, graphWireSchema } from '../../features/graph/state/graphWire'
import type { GraphWire } from '../../features/graph/state/graphWire'
import type { KopruqGraph } from '../../features/graph/domain/types'
import type { Lm1Parameters } from '../../features/loads/api/trafficLoadsService'
import {
  SEISMIC_SECTION, SELF_WEIGHT_SECTION, TEMPERATURE_SECTION, TRAFFIC_LM1_SECTION, WIND_SECTION, WIND_SNAPSHOT_SECTION, loadsWireSchema,
  type SeismicInputs, type SelfWeightInputs, type TemperatureInputs, type WindInputs,
} from '../../features/loads/model/loadsWire'
import type { WindCalculationSnapshot } from '../../features/loads/model/windTypes'
import { PREFERRED_SPAN_RULES_SECTION, preferredSpanRulesWireSchema } from '../../features/preferred-span/model/preferredSpanWire'
import type { PreferredSpanRule } from '../../features/preferred-span/model/types'
import { WORKSPACE_SECTION, workspaceToWire, workspaceWireSchema, type WorkspaceWire } from '../../features/project/model/projectWorkspaceWire'
import type { PersistedProjectState } from '../../features/project/model/projectWorkspace'
import { CROSS_SECTION_SECTION, crossSectionWireSchema } from '../../features/superstructure-families/model/crossSectionWire'
import type { CrossSectionValues } from '../../features/superstructure-families/model/types'

/**
 * The project document of `GET /api/projects/{id}` (and `POST /api/projects`): the 12 keys in the backend order
 * (`ProjectDocumentResponse`). Strict: an unknown key anywhere is a contract drift and rejects the whole document.
 */
export const projectDocumentSchema = z.object({
  projectId: z.string(), revision: z.number(), createdAt: z.string(), updatedAt: z.string(),
  workspace: workspaceWireSchema.nullable(), bridgeDefinitions: bridgeDefinitionsWireSchema.nullable(), families: familiesWireSchema,
  girderLibrary: girderLibraryWireSchema.nullable(), preferredSpanRules: preferredSpanRulesWireSchema.nullable(), crossSection: crossSectionWireSchema.nullable(),
  loads: loadsWireSchema, graphs: z.array(graphWireSchema),
}).strict()
export type ProjectDocumentWire = z.infer<typeof projectDocumentSchema>

export type LoadedProjectDocument = {
  projectId: string
  revision: number
  createdAt: string
  updatedAt: string
  workspace: PersistedProjectState | undefined
  bridgeDefinitions: BridgeDefinitionStore | undefined
  families: { [C in FamilyRepositoryCategory]: FamilyRecordOf<C>[] | undefined }
  girderLibrary: GirderLibraryValue | undefined
  preferredSpanRules: PreferredSpanRule[] | undefined
  crossSection: CrossSectionValues | undefined
  loads: {
    seismic: SeismicInputs | undefined
    wind: WindInputs | undefined
    temperature: TemperatureInputs | undefined
    selfWeight: SelfWeightInputs | undefined
    trafficLm1: Lm1Parameters | undefined
    windSnapshot: WindCalculationSnapshot | undefined
  }
  graphs: KopruqGraph[]
}

/**
 * Pure and all-or-nothing: an invalid document throws `ProjectDataValidationError` (paths like `workspace.bridges[2].spansM[0]`)
 * and nothing is written to any store, storage or event. A section the server has never stored (null) is `undefined`.
 * Reconciliation with the workspace (`ensureBridgeDefinitions`) and fallbacks (`INITIAL_CROSS_SECTION_VALUES`) are the caller's job.
 */
export function loadProjectDocument(json: unknown): LoadedProjectDocument {
  const doc = parseProjectData(projectDocumentSchema, json, '')
  return {
    projectId: doc.projectId, revision: doc.revision, createdAt: doc.createdAt, updatedAt: doc.updatedAt,
    workspace: WORKSPACE_SECTION.codec.fromWire(doc.workspace),
    bridgeDefinitions: BRIDGE_DEFINITIONS_SECTION.codec.fromWire(doc.bridgeDefinitions),
    families: {
      PIER: FAMILY_SECTIONS.PIER.codec.fromWire(doc.families.piers),
      PIER_CAP: FAMILY_SECTIONS.PIER_CAP.codec.fromWire(doc.families.pierCaps),
      FOUNDATION: FAMILY_SECTIONS.FOUNDATION.codec.fromWire(doc.families.foundations),
      BEARING: FAMILY_SECTIONS.BEARING.codec.fromWire(doc.families.bearings),
      MATERIAL: FAMILY_SECTIONS.MATERIAL.codec.fromWire(doc.families.materials),
    },
    girderLibrary: GIRDER_LIBRARY_SECTION.codec.fromWire(doc.girderLibrary) as GirderLibraryValue | undefined,
    preferredSpanRules: PREFERRED_SPAN_RULES_SECTION.codec.fromWire(doc.preferredSpanRules),
    crossSection: CROSS_SECTION_SECTION.codec.fromWire(doc.crossSection),
    loads: {
      seismic: SEISMIC_SECTION.codec.fromWire(doc.loads.seismic),
      wind: WIND_SECTION.codec.fromWire(doc.loads.wind),
      temperature: TEMPERATURE_SECTION.codec.fromWire(doc.loads.temperature),
      selfWeight: SELF_WEIGHT_SECTION.codec.fromWire(doc.loads.selfWeight),
      trafficLm1: TRAFFIC_LM1_SECTION.codec.fromWire(doc.loads.trafficLm1),
      windSnapshot: WIND_SNAPSHOT_SECTION.codec.fromWire(doc.loads.windSnapshot),
    },
    graphs: doc.graphs.map((graph) => GRAPH_COLLECTION.codec.fromWire(graph)),
  }
}

/** The 16 static sections, in PUT path order. M5 builds a `ServerSection` from each. */
/* heterogeneous list: T and W differ per entry */
export const PROJECT_SECTION_DEFINITIONS: readonly SectionDefinition<any, any>[] = [
  WORKSPACE_SECTION, BRIDGE_DEFINITIONS_SECTION,
  FAMILY_SECTIONS.PIER, FAMILY_SECTIONS.PIER_CAP, FAMILY_SECTIONS.FOUNDATION, FAMILY_SECTIONS.BEARING, FAMILY_SECTIONS.MATERIAL,
  GIRDER_LIBRARY_SECTION, PREFERRED_SPAN_RULES_SECTION, CROSS_SECTION_SECTION,
  SEISMIC_SECTION, WIND_SECTION, TEMPERATURE_SECTION, SELF_WEIGHT_SECTION, TRAFFIC_LM1_SECTION, WIND_SNAPSHOT_SECTION,
]

export const GRAPH_COLLECTION_DEFINITION: CollectionDefinition<KopruqGraph, GraphWire> = GRAPH_COLLECTION

/** Body of `POST /api/projects`: the client creates the project from the initial workspace (`INITIAL_PROJECT`, no bridges). */
export function createProjectRequestBody(state: PersistedProjectState): { workspace: WorkspaceWire } {
  return { workspace: workspaceToWire(state) }
}
