import { BRIDGE_DEFINITIONS_SERVER_SECTION } from '../features/bridge-definition/model/bridgeDefinitionServerSection'
import { ensureBridgeDefinitions } from '../features/bridge-definition/model/store'
import type { BridgeDefinitionStore } from '../features/bridge-definition/model/types'
import { FAMILY_SERVER_SECTIONS, GIRDER_LIBRARY_SERVER_SECTION } from '../features/family-registry/model/familyServerSections'
import { GRAPH_SERVER_COLLECTION } from '../features/graph/state/graphServerCollection'
import { getGraphStoreSnapshot, selectGraphDocument, type GraphDocuments } from '../features/graph/state/graphStore'
import {
  SEISMIC_SERVER_SECTION, SELF_WEIGHT_SERVER_SECTION, TEMPERATURE_SERVER_SECTION, TRAFFIC_LM1_SERVER_SECTION, WIND_SERVER_SECTION, WIND_SNAPSHOT_SERVER_SECTION,
} from '../features/loads/model/loadsServerSections'
import { PREFERRED_SPAN_RULES_SERVER_SECTION } from '../features/preferred-span/model/preferredSpanServerSection'
import { normalizeProjectState } from '../features/project/model/projectWorkspaceModel'
import { WORKSPACE_SERVER_SECTION } from '../features/project/model/projectWorkspaceServerSection'
import { CROSS_SECTION_SERVER_SECTION } from '../features/superstructure-families/model/crossSectionServerSection'
import { activeSections } from '../shared/project-store/activeProject'
import type { ServerSection } from '../shared/project-store/serverSection'

/**
 * Test access to the project data a feature keeps. It works on the server section mirrors of the open (test) project: seeding hydrates
 * a section (no request is made), reading returns the section value. Production code must not use it.
 */
export type ProjectDataKey = 'workspace' | 'bridgeDefinitions' | 'families.PIER' | 'families.PIER_CAP' | 'families.FOUNDATION' | 'families.BEARING' | 'families.MATERIAL'
  | 'girderLibrary' | 'preferredSpanRules' | 'crossSection' | 'loads.seismic' | 'loads.wind' | 'loads.temperature' | 'loads.selfWeight' | 'loads.trafficLm1' | 'loads.windSnapshot'
  | 'graphDocuments'

const SECTIONS: Record<Exclude<ProjectDataKey, 'graphDocuments'>, ServerSection<never>> = {
  workspace: WORKSPACE_SERVER_SECTION as ServerSection<never>,
  bridgeDefinitions: BRIDGE_DEFINITIONS_SERVER_SECTION as ServerSection<never>,
  'families.PIER': FAMILY_SERVER_SECTIONS.PIER as ServerSection<never>,
  'families.PIER_CAP': FAMILY_SERVER_SECTIONS.PIER_CAP as ServerSection<never>,
  'families.FOUNDATION': FAMILY_SERVER_SECTIONS.FOUNDATION as ServerSection<never>,
  'families.BEARING': FAMILY_SERVER_SECTIONS.BEARING as ServerSection<never>,
  'families.MATERIAL': FAMILY_SERVER_SECTIONS.MATERIAL as ServerSection<never>,
  girderLibrary: GIRDER_LIBRARY_SERVER_SECTION as ServerSection<never>,
  preferredSpanRules: PREFERRED_SPAN_RULES_SERVER_SECTION as ServerSection<never>,
  crossSection: CROSS_SECTION_SERVER_SECTION as ServerSection<never>,
  'loads.seismic': SEISMIC_SERVER_SECTION as ServerSection<never>,
  'loads.wind': WIND_SERVER_SECTION as ServerSection<never>,
  'loads.temperature': TEMPERATURE_SERVER_SECTION as ServerSection<never>,
  'loads.selfWeight': SELF_WEIGHT_SERVER_SECTION as ServerSection<never>,
  'loads.trafficLm1': TRAFFIC_LM1_SERVER_SECTION as ServerSection<never>,
  'loads.windSnapshot': WIND_SNAPSHOT_SERVER_SECTION as ServerSection<never>,
}

/**
 * Puts a value into the section mirror as if the server had returned it (no request). The workspace is normalized and the bridge
 * definitions are reconciled with the workspace bridges first (like `prepareLoadedProject`); other values must already be complete.
 * `graphDocuments` takes `{ activeGraphId, graphs }`.
 */
export function seedProjectData(key: ProjectDataKey, value: unknown): void {
  if (key === 'graphDocuments') {
    const documents = value as GraphDocuments
    GRAPH_SERVER_COLLECTION.hydrate(documents.graphs)
    selectGraphDocument(documents.activeGraphId)
    return
  }
  let seeded = value
  if (key === 'workspace') seeded = normalizeProjectState(value as Parameters<typeof normalizeProjectState>[0], [])
  if (key === 'bridgeDefinitions') seeded = ensureBridgeDefinitions(value as Partial<BridgeDefinitionStore>, (SECTIONS.workspace.read() as unknown as { bridges: Parameters<typeof ensureBridgeDefinitions>[1] } | undefined)?.bridges ?? [])
  ;(SECTIONS[key].hydrate as (next: unknown) => void)(seeded)
}
/** The current section value, or null when the section has none. */
export function readProjectData<T = unknown>(key: ProjectDataKey): T | null {
  if (key === 'graphDocuments') { const { activeGraphId, graphs } = getGraphStoreSnapshot(); return { activeGraphId, graphs } as T }
  return (SECTIONS[key].read() ?? null) as T | null
}
/** No argument empties every section; with keys, exactly those sections. No request is made. */
export function resetProjectData(keys?: readonly ProjectDataKey[]): void {
  if (keys === undefined) { activeSections().forEach((entry) => entry.hydrateEmpty()); return }
  keys.forEach((key) => {
    if (key === 'graphDocuments') GRAPH_SERVER_COLLECTION.hydrate([])
    else (SECTIONS[key].hydrate as (next: unknown) => void)(undefined)
  })
}
