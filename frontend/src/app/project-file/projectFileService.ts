import type { BridgeDefinitionStore } from '../../features/bridge-definition/model/types'
import { ensureBridgeDefinitions } from '../../features/bridge-definition/model/store'
import { normalizeProjectState, type PersistedProjectState } from '../../features/project/model/projectWorkspace'
import { exportGraphDocuments } from '../../features/graph/state/graphStore'
import { PROJECT_MODULE_LABELS } from './projectModules'
import { entryValueInFile, PROJECT_DATA_ENTRIES, PROJECT_FILE_SESSION_SECTIONS } from './projectDataContract'
import { PROJECT_FILE_FORMAT, PROJECT_FILE_SCHEMA_VERSION, type ProjectFile } from './projectFileTypes'
import type { WindCalculationSnapshot } from '../../features/loads/model/windTypes'

/** `recentId` ties the open file to its Recent Projects record (file names are not identities). */
export type FileRef = { name: string; handle?: FileSystemFileHandle; recentId?: string }
export const KOPRUQ_FILE_PICKER_OPTIONS = { multiple: false, excludeAcceptAllOption: true, types: [{ description: 'KOPRUQ Project', accept: { 'application/json': ['.kopruq'] } }] } as const
export function buildProjectFile(projectState: PersistedProjectState, bridgeDefinitions: BridgeDefinitionStore, windLoads?: WindCalculationSnapshot | null): ProjectFile {
  const sections: Record<string, Record<string, unknown>> = { families: {}, modules: {} }
  for (const entry of PROJECT_DATA_ENTRIES) if (entry.filePath[0] !== 'graph') sections[entry.filePath[0]][entry.filePath[1]] = entry.exportValue()
  return { format: PROJECT_FILE_FORMAT, schemaVersion: PROJECT_FILE_SCHEMA_VERSION, applicationVersion: '1.0.0', projectState: structuredClone(projectState), bridgeDefinitions: structuredClone(bridgeDefinitions), graph: exportGraphDocuments(), families: sections.families as ProjectFile['families'], modules: { ...sections.modules, ...(windLoads ? { windLoads: structuredClone(windLoads) } : {}) } }
}
export function validateProjectFile(value: unknown): ProjectFile {
  const file = value as Partial<ProjectFile>
  if (!file || file.format !== PROJECT_FILE_FORMAT || file.schemaVersion !== 1 || !file.projectState?.project || !Array.isArray(file.projectState?.bridges) || !file.bridgeDefinitions || !file.graph || !file.families) throw new Error('Invalid or unsupported KOPRUQ project file.')
  const modules = file.modules ?? {}
  if (typeof modules !== 'object' || Array.isArray(modules)) throw new Error('Invalid project modules.')
  for (const section of PROJECT_FILE_SESSION_SECTIONS) section.parse({ ...file, modules })
  for (const entry of PROJECT_DATA_ENTRIES) {
    if (entry.filePath[0] === 'graph') entry.parse(file.graph)
    else if (entry.filePath[0] === 'families') { if (!Array.isArray(entryValueInFile(entry, file))) throw new Error(`Missing family data: ${entry.filePath[1]}`); entry.parse(entryValueInFile(entry, file)) }
    else {
      const moduleValue = (modules as Record<string, unknown>)[entry.filePath[1]]
      if (moduleValue == null) continue
      try { entry.parse(moduleValue) } catch { throw new Error(`Invalid project data in file: ${entry.filePath[1]}`) }
    }
  }
  return { ...file, modules } as ProjectFile
}
export function migrateLegacyBoxPierParameters(file: ProjectFile): ProjectFile {
  const migrated = structuredClone(file)
  for (const graph of migrated.graph.graphs) for (const node of graph.nodes) {
    if (node.type !== 'substructure.pier.box') continue
    const p = node.parameters as Record<string, unknown>
    if (p.wxValue === undefined && typeof p.twValue === 'number') { p.wxValue = p.twValue; p.wxUnit = p.twUnit }
    if (p.wyValue === undefined && typeof p.twValue === 'number') { p.wyValue = p.twValue; p.wyUnit = p.twUnit }
    delete p.twValue; delete p.twUnit
  }
  for (const graph of migrated.graph.graphs) for (const node of graph.nodes) {
    if (node.type !== 'substructure.pier.h_section') continue
    const p = node.parameters as Record<string, unknown>
    if (p.wValue === undefined && typeof p.twValue === 'number') { p.wValue = p.twValue; p.wUnit = p.twUnit }
    if (p.ftValue === undefined && typeof p.tfValue === 'number') { p.ftValue = p.tfValue; p.ftUnit = p.tfUnit }
    delete p.twValue; delete p.twUnit; delete p.tfValue; delete p.tfUnit
  }
  return migrated
}
export type ApplyProjectFileResult = { missingModules: string[]; backedUpModules: string[] }
/** Best-effort copy of a module's current local value to `kopruq.backup.<ISO timestamp>.<moduleKey>` before it is reset. Returns true when a backup was written. */
function backupModuleValue(key: string, timestamp: string): boolean {
  try {
    const current = localStorage.getItem(key)
    if (current == null || ['', '[]', '{}'].includes(current.trim())) return false
    localStorage.setItem(`kopruq.backup.${timestamp}.${key}`, current)
    return true
  } catch { return false }
}
export function missingModulesMessage(result: ApplyProjectFileResult): string | undefined {
  if (!result.missingModules.length) return undefined
  const label = (id: string) => PROJECT_MODULE_LABELS[id as keyof typeof PROJECT_MODULE_LABELS] ?? id
  const backup = result.backedUpModules.length ? ` Previous local values were backed up in browser storage (keys starting with "kopruq.backup.") for: ${result.backedUpModules.map(label).join(', ')}.` : ''
  return `This file did not contain the following project data, so it was reset to defaults: ${result.missingModules.map(label).join(', ')}.${backup}`
}
export class ProjectStorageRollbackError extends Error {
  constructor(message: string, options?: { cause?: unknown }) { super(message, options); this.name = 'ProjectStorageRollbackError' }
}
/** Opaque per-entry snapshot of every project data entry (entry id -> entry snapshot). */
export type ProjectStorageSnapshot = Record<string, unknown>
export function snapshotProjectStorage(): ProjectStorageSnapshot {
  return Object.fromEntries(PROJECT_DATA_ENTRIES.map((entry) => [entry.id, entry.snapshot()]))
}
export function restoreProjectStorage(snapshot: ProjectStorageSnapshot): void {
  const failures: string[] = []
  for (const entry of PROJECT_DATA_ENTRIES) {
    try { entry.restore(snapshot[entry.id]) } catch (error) { failures.push(error instanceof Error ? error.message : String(error)) }
  }
  if (failures.length) throw new Error(failures.join('; '))
}
const rollbackMessage = (error: unknown) => `Project storage rollback failed: ${error instanceof Error ? error.message : String(error)}`
/** Clears graph, family catalogs and project modules for New Project. On any failure the previous storage is restored; if that also fails a ProjectStorageRollbackError is thrown. */
export function resetProjectStorage(): void {
  const snapshot = snapshotProjectStorage()
  try {
    for (const entry of PROJECT_DATA_ENTRIES) entry.reset()
  } catch (error) {
    try { restoreProjectStorage(snapshot) } catch (rollbackError) { throw new ProjectStorageRollbackError(`${error instanceof Error ? error.message : String(error)} ${rollbackMessage(rollbackError)}`, { cause: error }) }
    throw error
  }
}
export function applyProjectFile(input: ProjectFile): ApplyProjectFileResult {
  const file = validateProjectFile(input)
  const previous = snapshotProjectStorage()
  const missingModules: string[] = [], backedUpModules: string[] = [], backupTimestamp = new Date().toISOString()
  try {
    for (const entry of PROJECT_DATA_ENTRIES) {
      const value = entryValueInFile(entry, file)
      if (entry.presence === 'optional-reset-and-report' && value == null) {
        if (value === undefined) missingModules.push(entry.filePath[1])
        if (backupModuleValue(entry.storageKeys[0], backupTimestamp)) backedUpModules.push(entry.filePath[1])
        entry.reset(); continue
      }
      entry.apply(value)
    }
  } catch (error) {
    try {
      restoreProjectStorage(previous)
    } catch (rollbackError) { throw new Error(`Project import failed and rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`, { cause: error }) }
    throw error
  }
  return { missingModules, backedUpModules }
}
/** Fills defaults and ids of a validated file with the same normalizations the app applies when it reads its own storage. */
export function normalizeProjectFile(file: ProjectFile): ProjectFile {
  const projectState = { ...file.projectState, ...normalizeProjectState(file.projectState, []) }
  return { ...file, projectState, bridgeDefinitions: ensureBridgeDefinitions(file.bridgeDefinitions, projectState.bridges) }
}
export async function readProjectFile(file: File): Promise<ProjectFile> {
  return normalizeProjectFile(migrateLegacyBoxPierParameters(validateProjectFile(JSON.parse(await file.text()))))
}
export function projectFileText(file: ProjectFile) { return JSON.stringify(file, null, 2) }
export async function writeProjectFile(file: ProjectFile, ref?: FileRef): Promise<FileRef> {
  const text = projectFileText(file)
  if (ref?.handle) { const writable = await ref.handle.createWritable(); await writable.write(text); await writable.close(); return ref }
  const picker = (window as Window & { showSaveFilePicker?: (o: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker
  if (typeof picker === 'function') { const handle = await picker({ suggestedName: `${file.projectState.project.name || 'Untitled'}.kopruq`, types: [{ description: 'KOPRUQ Project', accept: { 'application/json': ['.kopruq'] } }] }); const writable = await handle.createWritable(); await writable.write(text); await writable.close(); return { name: handle.name, handle } }
  const blob = new Blob([text], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${file.projectState.project.name || 'Untitled'}.kopruq`; anchor.click(); URL.revokeObjectURL(url); return { name: anchor.download }
}
