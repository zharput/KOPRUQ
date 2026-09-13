import type { LayoutGenerationFormValues } from '../model/layoutGenerationSchema'

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

const API_BASE = 'http://localhost:8080'

export async function generateLayouts(request: LayoutGenerationFormValues): Promise<LayoutAlternativeRow[]> {
  const res = await fetch(`${API_BASE}/api/layout/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    throw new Error(`Backend returned HTTP ${res.status} for /api/layout/generate`)
  }
  return res.json() as Promise<LayoutAlternativeRow[]>
}

export { API_BASE }
