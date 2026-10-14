import { PROJECT_DATA_CHANGED_EVENT } from '../../../shared/project-file/projectDataEvents'
import type { BridgeRow } from './types'
import { ensureBridgeIds, INITIAL_PROJECT, normalizeProjectState } from './projectWorkspaceModel'
import type { PersistedProjectState, ProjectWorkspaceData } from './projectWorkspaceModel'

export type { PersistedProjectState, ProjectWorkspaceData } from './projectWorkspaceModel'
export { ensureBridgeIds, INITIAL_PROJECT, normalizeProjectState, normalizeProjectUnits, normalizeUnitId } from './projectWorkspaceModel'

const STORAGE_KEY = 'kopruq.project-workspace.v1'

export function readProjectState(fallbackBridges: BridgeRow[]): PersistedProjectState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { project: INITIAL_PROJECT, bridges: ensureBridgeIds(fallbackBridges) }
    return normalizeProjectState(JSON.parse(raw) as Partial<PersistedProjectState>, fallbackBridges)
  } catch { return { project: INITIAL_PROJECT, bridges: ensureBridgeIds(fallbackBridges) } }
}

/** Normalized project units from storage; undefined when storage is unavailable. */
export function readProjectUnits(): ProjectWorkspaceData['units'] | undefined {
  return typeof localStorage === 'undefined' ? undefined : readProjectState([]).project.units
}

export function persistProjectState(state: PersistedProjectState): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PROJECT_DATA_CHANGED_EVENT, { detail: { source: 'project' } })); return true } catch { return false }
}
