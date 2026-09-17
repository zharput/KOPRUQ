export type ConnectionStyle = 'smooth' | 'orthogonal'
export interface GraphViewPreferences { connectionStyle: ConnectionStyle }
const STORAGE_KEY = 'spanova.graph.view-preferences.v1'
export const DEFAULT_GRAPH_VIEW_PREFERENCES: GraphViewPreferences = { connectionStyle: 'smooth' }

export function readGraphViewPreferences(): GraphViewPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<GraphViewPreferences> | null
    return { connectionStyle: saved?.connectionStyle === 'orthogonal' ? 'orthogonal' : 'smooth' }
  } catch { return DEFAULT_GRAPH_VIEW_PREFERENCES }
}

export function writeGraphViewPreferences(preferences: GraphViewPreferences): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); return true }
  catch { return false }
}
