import { useMutation } from '@tanstack/react-query'
import { generateAlternatives } from '../api/alternativesService'

/**
 * Wraps the kernel-state + alternatives backend calls in TanStack
 * Query's `useMutation` (architecture migration Milestone 3,
 * 2026-09-12) - a "run a job" POST pair, not a cacheable GET, so
 * `useMutation` fits, not `useQuery`. Same requests/responses as
 * before; only the loading/error/data bookkeeping moves from manual
 * `useState` to the mutation's own `isPending`/`error`/`data`.
 */
export function useGenerateAlternatives() {
  return useMutation({ mutationFn: generateAlternatives })
}
