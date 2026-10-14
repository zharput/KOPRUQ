import { BRIDGE_DEFINITIONS_STORAGE_KEY } from '../features/bridge-definition/model/store'
import { familyStorageKey, PRECAST_GIRDER_STORAGE_KEY } from '../features/family-registry/model/familyRepository'
import { GRAPH_DOCUMENTS_STORAGE_KEY } from '../features/graph/state/graphStore'
import { SEISMIC_INPUTS_MODULE, SELF_WEIGHT_INPUTS_MODULE, TEMPERATURE_INPUTS_MODULE, TRAFFIC_LM1_MODULE, WIND_INPUTS_MODULE } from '../features/loads/model/loadsProjectModules'
import { PREFERRED_SPAN_RULES_MODULE } from '../features/preferred-span/model/preferredSpanRulesProjectModule'
import { CROSS_SECTION_VALUES_MODULE } from '../features/superstructure-families/model/crossSectionProjectModule'

/**
 * Test access to the project data a feature stores. Today it is backed by localStorage and emits no events (same as
 * the tests it replaced); when the stores move, only this file changes. Production code must not use it.
 */
export type ProjectDataKey = 'workspace' | 'bridgeDefinitions' | 'families.PIER' | 'families.PIER_CAP' | 'families.FOUNDATION' | 'families.BEARING' | 'families.MATERIAL'
  | 'girderLibrary' | 'preferredSpanRules' | 'crossSection' | 'loads.seismic' | 'loads.wind' | 'loads.temperature' | 'loads.selfWeight' | 'loads.trafficLm1' | 'graphDocuments'

const STORAGE_NAMES: Record<ProjectDataKey, string> = {
  // The workspace key is not exported by production code (private to projectWorkspace.ts); kept in sync by projectWorkspace.test.ts.
  workspace: 'kopruq.project-workspace.v1',
  bridgeDefinitions: BRIDGE_DEFINITIONS_STORAGE_KEY,
  'families.PIER': familyStorageKey('PIER'),
  'families.PIER_CAP': familyStorageKey('PIER_CAP'),
  'families.FOUNDATION': familyStorageKey('FOUNDATION'),
  'families.BEARING': familyStorageKey('BEARING'),
  'families.MATERIAL': familyStorageKey('MATERIAL'),
  girderLibrary: PRECAST_GIRDER_STORAGE_KEY,
  preferredSpanRules: PREFERRED_SPAN_RULES_MODULE.key,
  crossSection: CROSS_SECTION_VALUES_MODULE.key,
  'loads.seismic': SEISMIC_INPUTS_MODULE.key,
  'loads.wind': WIND_INPUTS_MODULE.key,
  'loads.temperature': TEMPERATURE_INPUTS_MODULE.key,
  'loads.selfWeight': SELF_WEIGHT_INPUTS_MODULE.key,
  'loads.trafficLm1': TRAFFIC_LM1_MODULE.key,
  graphDocuments: GRAPH_DOCUMENTS_STORAGE_KEY,
}

/** Stores a value as JSON, without normalizing it. */
export function seedProjectData(key: ProjectDataKey, value: unknown): void { localStorage.setItem(STORAGE_NAMES[key], JSON.stringify(value)) }
/** Stores text as is (for malformed-data tests). */
export function seedRawProjectData(key: ProjectDataKey, text: string): void { localStorage.setItem(STORAGE_NAMES[key], text) }
/** Parsed stored value, or null when absent. */
export function readProjectData<T = unknown>(key: ProjectDataKey): T | null {
  const text = localStorage.getItem(STORAGE_NAMES[key])
  return text === null ? null : JSON.parse(text) as T
}
export function readProjectDataText(key: ProjectDataKey): string | null { return localStorage.getItem(STORAGE_NAMES[key]) }
/** No argument clears everything; with keys, removes exactly those entries. */
export function resetProjectData(keys?: readonly ProjectDataKey[]): void {
  if (keys === undefined) { localStorage.clear(); return }
  keys.forEach((key) => localStorage.removeItem(STORAGE_NAMES[key]))
}
/** Only for registry.test.ts: asserts the registry never created its own storage entry. */
export function browserStorageText(storageKey: string): string | null { return localStorage.getItem(storageKey) }
