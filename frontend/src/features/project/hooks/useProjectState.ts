import { useSyncExternalStore } from 'react'
import { readProjectState, subscribeProjectState } from '../model/projectWorkspace'
import type { PersistedProjectState } from '../model/projectWorkspaceModel'

/** The project workspace (project data and bridge rows) of the open project; re-renders when it changes. */
export function useProjectState(): PersistedProjectState {
  return useSyncExternalStore(subscribeProjectState, readProjectState)
}
