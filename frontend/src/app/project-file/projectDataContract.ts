import { exportGraphDocuments, GRAPH_DOCUMENTS_STORAGE_KEY, importGraphDocuments, resetGraphDocuments, validateGraphDocuments, type GraphDocuments } from '../../features/graph/state/graphStore'
import { FAMILY_CATEGORIES, familyStorageKey, getFamilyRecords, saveFamilyRecords, savePrecastGirderDefinition, type FamilyRepositoryCategory } from '../../features/family-registry/model/familyRepository'
import { z } from 'zod'
import { parseWithSchema } from '../../shared/project-file/projectFileValidation'
import { projectStateFileSchema } from '../../features/project/model/projectStateSchema'
import { bridgeDefinitionStoreFileSchema } from '../../features/bridge-definition/model/schema'

export { ProjectFileValidationError } from '../../shared/project-file/projectFileValidation'
import { parseFamilyRecords } from '../../features/family-registry/model/familySchemas'
import { PROJECT_MODULES, PROJECT_MODULE_IDS, type ProjectModuleId } from './projectModules'
import { PROJECT_MODULE_CHANGED_EVENT } from '../../shared/project-file/projectModuleStore'

/**
 * One project-scoped dataset that lives in localStorage and travels with the .kopruq file.
 * Build, validate, apply, snapshot, restore and reset all iterate `PROJECT_DATA_ENTRIES`;
 * adding project data means adding one entry here.
 */
export type ProjectDataEntry<T> = {
  id: string
  label: string
  /** Location inside the project file, e.g. ['families', 'PIER']. */
  filePath: readonly string[]
  storageKeys: readonly string[]
  /** `required`: a valid value must be in the file. `optional-reset-and-report`: when absent the local value is backed up, reset and reported. */
  presence: 'required' | 'optional-reset-and-report'
  exportValue(): T | null
  /** Throws (ProjectFileValidationError or Error) when the value is not valid. */
  parse(value: unknown): T
  /** Throws when storage refuses the write. */
  apply(value: T): void
  /** Throws unless the dataset really is back to its empty state. */
  reset(): void
  snapshot(): unknown
  restore(snapshot: unknown): void
}

const graphEntry: ProjectDataEntry<GraphDocuments> = {
  id: 'graph', label: 'Graph documents', filePath: ['graph'], storageKeys: [GRAPH_DOCUMENTS_STORAGE_KEY], presence: 'required',
  exportValue: () => exportGraphDocuments(),
  parse: (value) => validateGraphDocuments(value),
  apply: (value) => importGraphDocuments(value),
  reset: () => resetGraphDocuments(),
  snapshot: () => exportGraphDocuments(),
  restore: (snapshot) => importGraphDocuments(snapshot as GraphDocuments),
}

function familyEntry(category: FamilyRepositoryCategory): ProjectDataEntry<unknown[]> {
  return {
    id: `families.${category}`, label: `${category} families`, filePath: ['families', category], storageKeys: [familyStorageKey(category)], presence: 'required',
    exportValue: () => getFamilyRecords(category),
    parse: (value) => parseFamilyRecords(category, value),
    apply: (value) => { if (!saveFamilyRecords(category, value as never[])) throw new Error(`Unable to import family data: ${category}`) },
    reset: () => { if (!saveFamilyRecords(category, [])) throw new Error(`Unable to reset family catalog: ${category}`) },
    snapshot: () => getFamilyRecords(category),
    restore: (snapshot) => { if (!saveFamilyRecords(category, snapshot as never[])) throw new Error(`Unable to restore family data: ${category}`) },
  }
}

function moduleEntry(id: ProjectModuleId): ProjectDataEntry<unknown> {
  const module = PROJECT_MODULES[id] as { key: string; parse(value: unknown): unknown; read(): unknown; write(value: unknown): boolean; reset(): void }
  return {
    id: `modules.${id}`, label: id, filePath: ['modules', id], storageKeys: [module.key], presence: 'optional-reset-and-report',
    exportValue: () => module.read() ?? null,
    parse: (value) => module.parse(value),
    apply: (value) => { if (!module.write(value)) throw new Error(`Unable to import project data: ${id}`) },
    reset: () => {
      if (id === 'girderLibrary') { if (!savePrecastGirderDefinition([])) throw new Error('Unable to reset girder catalog.'); return }
      module.reset()
      if (localStorage.getItem(module.key) != null) throw new Error(`Unable to reset project data: ${id}`)
    },
    snapshot: () => localStorage.getItem(module.key),
    restore: (snapshot) => {
      try {
        if (localStorage.getItem(module.key) !== snapshot) { if (snapshot == null) localStorage.removeItem(module.key); else localStorage.setItem(module.key, snapshot as string) }
      } catch { throw new Error(`Unable to restore project data: ${module.key}`) }
      finally { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PROJECT_MODULE_CHANGED_EVENT, { detail: { id } })) }
    },
  }
}

export const PROJECT_DATA_ENTRIES: readonly ProjectDataEntry<unknown>[] = [
  graphEntry as ProjectDataEntry<unknown>,
  ...FAMILY_CATEGORIES.map(familyEntry) as ProjectDataEntry<unknown>[],
  ...PROJECT_MODULE_IDS.map(moduleEntry),
]

/** Reads the value of an entry from a project file object. */
export function entryValueInFile(entry: ProjectDataEntry<unknown>, file: unknown): unknown {
  return entry.filePath.reduce<unknown>((value, key) => (value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined), file)
}

const windLoadsSchema = z.object({ schemaVersion: z.literal(1), status: z.string().optional(), inputs: z.object({ vb: z.string(), terrain: z.string(), ze: z.string(), deckWidthM: z.number(), drefM: z.number() }), result: z.unknown() }).passthrough()

/**
 * Sections of the project file whose live state is owned by React (not localStorage), applied through
 * `useProjectFile` setters. They are validated here, next to the storage-backed entries.
 */
export type ProjectFileSessionSection = { id: 'projectState' | 'bridgeDefinitions' | 'windLoads'; filePath: readonly string[]; parse(file: Record<string, unknown>): unknown }
export const PROJECT_FILE_SESSION_SECTIONS: readonly ProjectFileSessionSection[] = [
  { id: 'projectState', filePath: ['projectState'], parse: (file) => parseWithSchema(projectStateFileSchema, file.projectState, 'projectState') },
  { id: 'bridgeDefinitions', filePath: ['bridgeDefinitions'], parse: (file) => parseWithSchema(bridgeDefinitionStoreFileSchema, file.bridgeDefinitions, 'bridgeDefinitions') },
  { id: 'windLoads', filePath: ['modules', 'windLoads'], parse: (file) => {
    const wind = (file.modules as Record<string, unknown> | undefined)?.windLoads
    if (wind != null && !windLoadsSchema.safeParse(wind).success) throw new Error('Invalid wind load data in project file.')
    return wind
  } },
]
