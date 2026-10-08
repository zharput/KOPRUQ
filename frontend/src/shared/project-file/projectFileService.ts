import type { BridgeDefinitionStore } from '../../features/bridge-definition/model/types'
import type { PersistedProjectState } from '../../features/project/model/projectWorkspace'
import { exportGraphDocuments, importGraphDocuments, validateGraphDocuments } from '../../features/graph/state/graphStore'
import { getFamilyRecords, saveFamilyRecords, type FamilyRepositoryCategory } from '../../features/family-registry/model/familyRepository'
import { PROJECT_FILE_FORMAT, PROJECT_FILE_SCHEMA_VERSION, type ProjectFile, type WindCalculationSnapshot } from './projectFileTypes'

const CATEGORIES: FamilyRepositoryCategory[] = ['PIER', 'PIER_CAP', 'FOUNDATION', 'BEARING', 'MATERIAL']
export type FileRef = { name: string; handle?: FileSystemFileHandle }
export const KOPRUQ_FILE_PICKER_OPTIONS = { multiple: false, excludeAcceptAllOption: true, types: [{ description: 'KOPRUQ Project', accept: { 'application/json': ['.kopruq'] } }] } as const
export function buildProjectFile(projectState: PersistedProjectState, bridgeDefinitions: BridgeDefinitionStore, windLoads?: WindCalculationSnapshot | null): ProjectFile {
  const families = Object.fromEntries(CATEGORIES.map((category) => [category, getFamilyRecords(category)]))
  return { format: PROJECT_FILE_FORMAT, schemaVersion: PROJECT_FILE_SCHEMA_VERSION, applicationVersion: '1.0.0', projectState: structuredClone(projectState), bridgeDefinitions: structuredClone(bridgeDefinitions), graph: exportGraphDocuments(), families, modules: windLoads ? { windLoads: structuredClone(windLoads) } : {} }
}
export function validateProjectFile(value: unknown): ProjectFile {
  const file = value as Partial<ProjectFile>
  if (!file || file.format !== PROJECT_FILE_FORMAT || file.schemaVersion !== 1 || !file.projectState?.project || !Array.isArray(file.projectState?.bridges) || !file.bridgeDefinitions || !file.graph || !file.families) throw new Error('Invalid or unsupported KOPRUQ project file.')
  validateGraphDocuments(file.graph)
  for (const category of CATEGORIES) if (!Array.isArray(file.families[category])) throw new Error(`Missing family data: ${category}`)
  return file as ProjectFile
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
export function applyProjectFile(file: ProjectFile) {
  validateProjectFile(file)
  const previousGraph = exportGraphDocuments(); const previousFamilies = Object.fromEntries(CATEGORIES.map((category) => [category, getFamilyRecords(category)]))
  try {
    importGraphDocuments(file.graph)
    for (const category of CATEGORIES) { const records = file.families[category]; if (!saveFamilyRecords(category, records as never[])) throw new Error(`Unable to import family data: ${category}`) }
  } catch (error) {
    try {
      importGraphDocuments(previousGraph)
      for (const category of CATEGORIES) if (!saveFamilyRecords(category, previousFamilies[category] as never[])) throw new Error(`Unable to restore family data: ${category}`)
    } catch (rollbackError) { throw new Error(`Project import failed and rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`, { cause: error }) }
    throw error
  }
}
export async function readProjectFile(file: File): Promise<ProjectFile> { return migrateLegacyBoxPierParameters(validateProjectFile(JSON.parse(await file.text()))) }
export function projectFileText(file: ProjectFile) { return JSON.stringify(file, null, 2) }
export async function writeProjectFile(file: ProjectFile, ref?: FileRef): Promise<FileRef> {
  const text = projectFileText(file)
  if (ref?.handle) { const writable = await ref.handle.createWritable(); await writable.write(text); await writable.close(); return ref }
  const picker = (window as Window & { showSaveFilePicker?: (o: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker
  if (typeof picker === 'function') { const handle = await picker({ suggestedName: `${file.projectState.project.name || 'Untitled'}.kopruq`, types: [{ description: 'KOPRUQ Project', accept: { 'application/json': ['.kopruq'] } }] }); const writable = await handle.createWritable(); await writable.write(text); await writable.close(); return { name: handle.name, handle } }
  const blob = new Blob([text], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${file.projectState.project.name || 'Untitled'}.kopruq`; anchor.click(); URL.revokeObjectURL(url); return { name: anchor.download }
}
