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
  return <div className="spn-graph-node-state">{label}</div>
}
