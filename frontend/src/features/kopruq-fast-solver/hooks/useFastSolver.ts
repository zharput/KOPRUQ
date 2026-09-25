import { useMutation } from '@tanstack/react-query'
import { runFastSolver } from '../api/fastSolverService'

/**
 * Wraps the fast-solver backend call in TanStack Query's `useMutation`
 * (architecture migration Milestone 3, 2026-09-12) - a "run an analysis"
 * POST, not a cacheable GET, so `useMutation` fits, not `useQuery`. Same
 * request/response as before; only the loading/error/data bookkeeping
 * moves from manual `useState` to the mutation's own
 * `isPending`/`error`/`data`.
 */
export function useFastSolver() {
  return useMutation({ mutationFn: runFastSolver })
}
