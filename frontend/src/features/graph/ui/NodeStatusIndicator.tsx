import type { GraphExecutionState } from '../domain/types'

type Props = {
  executionState: GraphExecutionState
  isDirty?: boolean
  runRequired?: boolean
  hasError?: boolean
}

export const GRAPH_STATUS_COLORS = {
  success: '#6FAD8A',
  error: '#D97878',
  warning: '#D2A85C',
  running: '#7899B8',
} as const

export function graphStatusColor(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === 'success') return GRAPH_STATUS_COLORS.success
  if (normalized === 'error') return GRAPH_STATUS_COLORS.error
  if (normalized === 'running') return GRAPH_STATUS_COLORS.running
  if (normalized === 'warning' || normalized === 'dirty') return GRAPH_STATUS_COLORS.warning
  return undefined
}

/** Renders existing graph status values without calculating or mutating them. */
export default function NodeStatusIndicator({ executionState, isDirty = false, runRequired = false, hasError = false }: Props) {
  if (!isDirty && !runRequired && !hasError && executionState === 'idle') return null
  const label = isDirty ? 'DIRTY' : runRequired ? 'RUN REQUIRED' : hasError ? 'ERROR' : executionState.toUpperCase()
  const statusClass = hasError ? 'sp-status--error' : isDirty ? 'sp-status--warning' : runRequired ? 'sp-status--info' : executionState === 'success' ? 'sp-status--success' : executionState === 'error' ? 'sp-status--error' : executionState === 'running' ? 'sp-status--info' : ''
  return <div className={`spn-graph-node-state ${statusClass}`} style={{ color: graphStatusColor(label), opacity: 1 }}>{label}</div>
}
