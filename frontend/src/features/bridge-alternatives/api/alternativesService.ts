import type { KernelStateFormValues } from '../model/kernelStateSchema'

/**
 * The two real backend calls this feature makes (kernel-state, then
 * alternatives), relocated out of `GenerateWorkflow.tsx` (architecture
 * migration Milestone 3, 2026-09-12) so the component only owns UI/form
 * state, not `fetch`. Same URLs, method, body, and sequencing as before
 * (kernel-state first, as proof the data reached bridge-core, then
 * alternatives) - no behavior change.
 */
export interface AlternativeRow {
  id: string
  spanCount: number
  spanLengthM: number
  totalLengthM: number
  girderCount: number
  girderDepthM: number
  feasible: boolean
}

export interface GenerateAlternativesResult {
  kernelState: unknown
  alternatives: AlternativeRow[]
}

const API_BASE = 'http://localhost:8080'

async function postJson<T>(path: string, body: KernelStateFormValues): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Backend returned HTTP ${res.status} for ${path}`)
  }
  return res.json() as Promise<T>
}

export async function generateAlternatives(form: KernelStateFormValues): Promise<GenerateAlternativesResult> {
  const kernelState = await postJson<unknown>('/api/kernel-state', form)
  const alternatives = await postJson<AlternativeRow[]>('/api/alternatives', form)
  return { kernelState, alternatives }
}

export { API_BASE }
