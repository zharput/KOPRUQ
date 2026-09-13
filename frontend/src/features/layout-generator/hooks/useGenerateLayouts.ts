import { useMutation } from '@tanstack/react-query'
import { generateLayouts } from '../api/layoutService'

/**
 * Wraps the layout-generation backend call in TanStack Query's
 * `useMutation` (architecture migration Milestone 3, 2026-09-12) - this
 * is a "run a job" POST, not a cacheable GET, so `useMutation` fits, not
 * `useQuery`. Same request/response shape as before; only the
 * loading/error/data bookkeeping moves from manual `useState` to the
 * mutation's own `isPending`/`error`/`data`.
 */
export function useGenerateLayouts() {
  return useMutation({ mutationFn: generateLayouts })
}
