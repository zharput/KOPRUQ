import { onProjectSwitch } from '../../../shared/project-store/activeProject'

export type ConnectionStyle = 'smooth' | 'orthogonal'
export interface GraphViewPreferences { connectionStyle: ConnectionStyle }
export const DEFAULT_GRAPH_VIEW_PREFERENCES: GraphViewPreferences = { connectionStyle: 'smooth' }

// View preferences live in memory only (never sent to the server) and return to the default when the project changes.
let preferences: GraphViewPreferences = DEFAULT_GRAPH_VIEW_PREFERENCES
onProjectSwitch(() => { preferences = DEFAULT_GRAPH_VIEW_PREFERENCES })

export function readGraphViewPreferences(): GraphViewPreferences { return preferences }

export function writeGraphViewPreferences(next: GraphViewPreferences): boolean {
  preferences = { connectionStyle: next.connectionStyle === 'orthogonal' ? 'orthogonal' : 'smooth' }
  return true
}
