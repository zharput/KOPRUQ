import type { GraphExecutionState, GraphValue } from '../domain/types'

export type ExecutionDisplay = {
  states: Record<string, GraphExecutionState>
  errors: Record<string, string>
  resolvedInputs: Record<string, Record<string, GraphValue>>
  outputs: Record<string, Record<string, GraphValue>>
}

/** Results of the last run are shown only while the graph is unchanged since that run; a dirty graph shows nothing stale. */
export function buildExecutionDisplay(isDirty: boolean, lastRun: ExecutionDisplay): ExecutionDisplay {
  return isDirty ? { states: {}, errors: {}, resolvedInputs: {}, outputs: {} } : lastRun
}
