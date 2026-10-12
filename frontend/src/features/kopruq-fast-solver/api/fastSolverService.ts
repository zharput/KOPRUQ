import type { FastSolverFormValues } from '../model/fastSolverSchema'
import { postJson } from '../../../shared/api/http'

/**
 * The one real backend call this feature makes, relocated out of
 * `FastSolverPanel.tsx` (architecture migration Milestone 3,
 * 2026-09-12) so the component only owns UI/form state, not `fetch`.
 * Same URL, method, body, and error handling as before - no behavior
 * change.
 */
export interface SupportReactionRow {
  label: string
  chainageM: number
  fx: number
  fy: number
  fz: number
  mx: number
  my: number
  mz: number
}

export interface DeckDisplacementRow {
  label: string
  chainageM: number
  dx: number
  dy: number
  dz: number
  rx: number
  ry: number
  rz: number
}

export interface FastSolverResponse {
  status: string
  errorMessage: string | null
  reactions: SupportReactionRow[]
  deckDisplacements: DeckDisplacementRow[]
  totalAppliedLoadKn: number
  totalReactionKn: number
}

export function runFastSolver(form: FastSolverFormValues): Promise<FastSolverResponse> {
  return postJson<FastSolverResponse>('/api/fast-solver/solve', form)
}
