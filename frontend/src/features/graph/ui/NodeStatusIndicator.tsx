import type { GraphExecutionState } from '../domain/types'

type Props = {
  executionState: GraphExecutionState
  isDirty?: boolean
  runRequired?: boolean
  hasError?: boolean
}

/** Renders existing graph status values without calculating or mutating them. */
export default function NodeStatusIndicator({ executionState, isDirty = false, runRequired = false, hasError = false }: Props) {
  if (!isDirty && !runRequired && !hasError && executionState === 'idle') return null
  const label = isDirty ? 'DIRTY' : runRequired ? 'RUN REQUIRED' : hasError ? 'ERROR' : executionState.toUpperCase()
  const statusClass = hasError ? 'sp-status--error' : isDirty ? 'sp-status--warning' : runRequired ? 'sp-status--info' : executionState === 'success' ? 'sp-status--success' : executionState === 'error' ? 'sp-status--error' : executionState === 'running' ? 'sp-status--info' : ''
  return <div className={`spn-graph-node-state ${statusClass}`}>{label}</div>
}
