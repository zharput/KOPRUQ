import type { BridgeRow } from './types'
import { ensureBridgeIds, INITIAL_PROJECT } from './projectWorkspaceModel'
import type { PersistedProjectState, ProjectWorkspaceData } from './projectWorkspaceModel'
import { WORKSPACE_SERVER_SECTION } from './projectWorkspaceServerSection'

export type { PersistedProjectState, ProjectWorkspaceData } from './projectWorkspaceModel'
export { ensureBridgeIds, INITIAL_PROJECT, normalizeProjectState, normalizeProjectUnits, normalizeUnitId } from './projectWorkspaceModel'

// Stable reference for every read of an unwritten section with the default (empty) fallback (useSyncExternalStore needs it).
const EMPTY_PROJECT_STATE: PersistedProjectState = { project: INITIAL_PROJECT, bridges: [] }

/**
 * The project workspace of the open project (BACKEND-DB-PERSISTENCE M5c: the `workspace` server section). Without a value (no open
 * project, or the section was never written) the initial project and `fallbackBridges` are returned.
 */
export function readProjectState(fallbackBridges: BridgeRow[] = []): PersistedProjectState {
  const stored = WORKSPACE_SERVER_SECTION.read()
  if (stored !== undefined) return stored
  return fallbackBridges.length === 0 ? EMPTY_PROJECT_STATE : { project: INITIAL_PROJECT, bridges: ensureBridgeIds(fallbackBridges) }
}

/** Project units of the open project (the initial units when nothing is written). */
export function readProjectUnits(): ProjectWorkspaceData['units'] | undefined {
  return readProjectState().project.units
}

/** Writes the workspace (bridge ids are completed first). false: no open project, or the value cannot be sent. */
export function writeProjectState(state: PersistedProjectState): boolean {
  return WORKSPACE_SERVER_SECTION.write({ ...state, bridges: ensureBridgeIds(state.bridges) })
}

export function subscribeProjectState(listener: () => void): () => void {
  return WORKSPACE_SERVER_SECTION.subscribe(listener)
}
