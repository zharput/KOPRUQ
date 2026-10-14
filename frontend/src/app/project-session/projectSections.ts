import { activeProjectSession, activeSections } from '../../shared/project-store/activeProject'
import { ProjectDataValidationError, WireMappingError } from '../../shared/project-store/projectDataValidation'
import type { SectionDefinition, ServerSection } from '../../shared/project-store/serverSection'
import { BRIDGE_DEFINITIONS_SERVER_SECTION } from '../../features/bridge-definition/model/bridgeDefinitionServerSection'
import { ensureBridgeDefinitions } from '../../features/bridge-definition/model/store'
import type { BridgeDefinitionStore } from '../../features/bridge-definition/model/types'
import { FAMILY_SERVER_SECTIONS, GIRDER_LIBRARY_SERVER_SECTION } from '../../features/family-registry/model/familyServerSections'
import { GRAPH_SERVER_COLLECTION } from '../../features/graph/state/graphServerCollection'
import type { KopruqGraph } from '../../features/graph/domain/types'
import {
  SEISMIC_SERVER_SECTION, SELF_WEIGHT_SERVER_SECTION, TEMPERATURE_SERVER_SECTION, TRAFFIC_LM1_SERVER_SECTION, WIND_SERVER_SECTION, WIND_SNAPSHOT_SERVER_SECTION,
} from '../../features/loads/model/loadsServerSections'
import { PREFERRED_SPAN_RULES_SERVER_SECTION } from '../../features/preferred-span/model/preferredSpanServerSection'
import type { PersistedProjectState } from '../../features/project/model/projectWorkspace'
import { WORKSPACE_SERVER_SECTION } from '../../features/project/model/projectWorkspaceServerSection'
import { CROSS_SECTION_SERVER_SECTION } from '../../features/superstructure-families/model/crossSectionServerSection'
import { GRAPH_COLLECTION_DEFINITION, PROJECT_SECTION_DEFINITIONS, type LoadedProjectDocument } from './projectDocument'

/**
 * Two-step opening of a project (BACKEND-DB-PERSISTENCE M5b, D8):
 * 1. `prepareLoadedProject` is pure. It reconciles the bridge definitions with the workspace and checks that every value can be mapped to
 *    the wire (what a later `hydrate` does anyway). It touches neither the session, the queue nor any section.
 * 2. `applyPreparedProject` begins the session (the write queue resets itself, project-switch listeners run) and hydrates all sections.
 *    It cannot fail for a value that came out of `prepareLoadedProject`; hydrating never sends a request.
 */
declare const preparedBrand: unique symbol
export type PreparedProject = Readonly<{
  projectId: string
  revision: number
  workspace: PersistedProjectState | undefined
  /** Always reconciled with the workspace, never undefined. */
  bridgeDefinitions: BridgeDefinitionStore
  families: LoadedProjectDocument['families']
  girderLibrary: LoadedProjectDocument['girderLibrary']
  preferredSpanRules: LoadedProjectDocument['preferredSpanRules']
  crossSection: LoadedProjectDocument['crossSection']
  loads: LoadedProjectDocument['loads']
  graphs: readonly KopruqGraph[]
}> & { readonly [preparedBrand]: true }

type Binding = { path: string; validate(): void; hydrate(): void }
type Content = Omit<PreparedProject, typeof preparedBrand>

function bind<T, W>(definition: SectionDefinition<T, W>, section: ServerSection<T>, value: T | undefined): Binding {
  return {
    path: definition.path,
    validate() { if (value !== undefined) definition.codec.toWire(value) },
    hydrate() { section.hydrate(value) },
  }
}

/** The 16 sections in `PROJECT_SECTION_DEFINITIONS` order. */
function bindingsOf(project: Content): Binding[] {
  const { families, loads } = project
  const bindings = [
    bind(PROJECT_SECTION_DEFINITIONS[0], WORKSPACE_SERVER_SECTION, project.workspace),
    bind(PROJECT_SECTION_DEFINITIONS[1], BRIDGE_DEFINITIONS_SERVER_SECTION, project.bridgeDefinitions),
    bind(PROJECT_SECTION_DEFINITIONS[2], FAMILY_SERVER_SECTIONS.PIER, families.PIER),
    bind(PROJECT_SECTION_DEFINITIONS[3], FAMILY_SERVER_SECTIONS.PIER_CAP, families.PIER_CAP),
    bind(PROJECT_SECTION_DEFINITIONS[4], FAMILY_SERVER_SECTIONS.FOUNDATION, families.FOUNDATION),
    bind(PROJECT_SECTION_DEFINITIONS[5], FAMILY_SERVER_SECTIONS.BEARING, families.BEARING),
    bind(PROJECT_SECTION_DEFINITIONS[6], FAMILY_SERVER_SECTIONS.MATERIAL, families.MATERIAL),
    bind(PROJECT_SECTION_DEFINITIONS[7], GIRDER_LIBRARY_SERVER_SECTION, project.girderLibrary),
    bind(PROJECT_SECTION_DEFINITIONS[8], PREFERRED_SPAN_RULES_SERVER_SECTION, project.preferredSpanRules),
    bind(PROJECT_SECTION_DEFINITIONS[9], CROSS_SECTION_SERVER_SECTION, project.crossSection),
    bind(PROJECT_SECTION_DEFINITIONS[10], SEISMIC_SERVER_SECTION, loads.seismic),
    bind(PROJECT_SECTION_DEFINITIONS[11], WIND_SERVER_SECTION, loads.wind),
    bind(PROJECT_SECTION_DEFINITIONS[12], TEMPERATURE_SERVER_SECTION, loads.temperature),
    bind(PROJECT_SECTION_DEFINITIONS[13], SELF_WEIGHT_SERVER_SECTION, loads.selfWeight),
    bind(PROJECT_SECTION_DEFINITIONS[14], TRAFFIC_LM1_SERVER_SECTION, loads.trafficLm1),
    bind(PROJECT_SECTION_DEFINITIONS[15], WIND_SNAPSHOT_SERVER_SECTION, loads.windSnapshot),
  ]
  bindings.forEach((binding, index) => {
    if (binding.path !== PROJECT_SECTION_DEFINITIONS[index].path) throw new Error(`Section binding ${index} does not match its definition`)
  })
  return bindings
}

function validateGraphs(graphs: readonly KopruqGraph[]): void {
  const { idOf, toWire } = GRAPH_COLLECTION_DEFINITION.codec
  const ids = new Set<string>()
  graphs.forEach((graph, index) => {
    try {
      const id = idOf(graph)
      if (ids.has(id)) throw new ProjectDataValidationError([{ path: `graphs[${index}].id`, message: `Duplicate graph id: ${id}` }])
      ids.add(id)
      toWire(graph)
    } catch (error) {
      if (error instanceof WireMappingError) throw new ProjectDataValidationError([{ path: `graphs[${index}]`, message: error.message }])
      throw error
    }
  })
}

function check(binding: Binding): void {
  try { binding.validate() } catch (error) {
    if (error instanceof WireMappingError) throw new ProjectDataValidationError([{ path: binding.path, message: error.message }])
    throw error
  }
}

export function prepareLoadedProject(loaded: LoadedProjectDocument): PreparedProject {
  // The workspace is checked first: reconciliation needs usable bridge rows.
  check(bind(PROJECT_SECTION_DEFINITIONS[0], WORKSPACE_SERVER_SECTION, loaded.workspace))
  const bridgeDefinitions: BridgeDefinitionStore = ensureBridgeDefinitions(loaded.bridgeDefinitions ?? {}, loaded.workspace?.bridges ?? [])
  const content: Content = {
    projectId: loaded.projectId, revision: loaded.revision, workspace: loaded.workspace, bridgeDefinitions,
    families: loaded.families, girderLibrary: loaded.girderLibrary, preferredSpanRules: loaded.preferredSpanRules,
    crossSection: loaded.crossSection, loads: loaded.loads, graphs: loaded.graphs,
  }
  bindingsOf(content).forEach(check)
  validateGraphs(content.graphs)
  return content as PreparedProject
}

export function applyPreparedProject(project: PreparedProject): void {
  activeProjectSession.begin(project.projectId, project.revision)
  for (const binding of bindingsOf(project)) binding.hydrate()
  GRAPH_SERVER_COLLECTION.hydrate(project.graphs)
}

/** Closes the open project: the session ends, every registered section becomes empty. Never writes (no `write(undefined)`), so no request is made. */
export function closeActiveProject(): void {
  activeProjectSession.end()
  for (const entry of activeSections()) entry.hydrateEmpty()
}
