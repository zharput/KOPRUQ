import type { LayoutGenerationFormValues } from '../model/layoutGenerationSchema'
import { postJson } from '../../../shared/api/http'

/**
 * The one real backend call this feature makes, relocated out of
 * `SiteLayoutPanel.tsx` (architecture migration Milestone 3, 2026-09-12)
 * so the component only owns UI/form state, not `fetch`. Same URL,
 * method, body, and error handling as before - no behavior change.
 */
export interface PierRow {
  chainageM: number
  feasible: boolean
  rejectionReasons: string[]
}

export interface LayoutAlternativeRow {
  id: string
  c1ChainageM: number
  c2ChainageM: number
  bridgeLengthM: number
  spanCount: number
  spanLengthM: number
  feasible: boolean
  piers: PierRow[]
}

export function generateLayouts(request: LayoutGenerationFormValues): Promise<LayoutAlternativeRow[]> {
  return postJson<LayoutAlternativeRow[]>('/api/layout/generate', request)
}
