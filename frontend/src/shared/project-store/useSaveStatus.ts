import { useSyncExternalStore } from 'react'
import { activeProjectSession } from './activeProject'
import type { ProjectSessionSnapshot } from './projectSession'

/** Live snapshot of the active project session (id, revision, save status). The snapshot reference is stable until something changes. */
export function useSaveStatus(): ProjectSessionSnapshot {
  return useSyncExternalStore(activeProjectSession.subscribe, activeProjectSession.getSnapshot, activeProjectSession.getSnapshot)
}
