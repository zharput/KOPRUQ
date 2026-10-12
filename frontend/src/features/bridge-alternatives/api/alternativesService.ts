import type { KernelStateFormValues } from '../model/kernelStateSchema'
import { postJson } from '../../../shared/api/http'

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

export async function generateAlternatives(form: KernelStateFormValues): Promise<GenerateAlternativesResult> {
  const kernelState = await postJson<unknown>('/api/kernel-state', form)
  const alternatives = await postJson<AlternativeRow[]>('/api/alternatives', form)
  return { kernelState, alternatives }
}
