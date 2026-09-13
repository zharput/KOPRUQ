import type { FastSolverFormValues } from '../model/fastSolverSchema'

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

const API_BASE = 'http://localhost:8080'

export async function runFastSolver(form: FastSolverFormValues): Promise<FastSolverResponse> {
  const res = await fetch(`${API_BASE}/api/fast-solver/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  })
  if (!res.ok) {
    throw new Error(`Backend returned HTTP ${res.status} for /api/fast-solver/solve`)
  }
  return res.json() as Promise<FastSolverResponse>
}

export { API_BASE }
