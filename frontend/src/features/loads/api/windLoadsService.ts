import { postJson } from '../../../shared/api/http'
import type { WindResult } from '../model/windTypes'

export type WindResolveRequest = { vbMs: number; terrainCategory: string; zeM: number; deckWidthM: number; drefM: number }

export function resolveWind(request: WindResolveRequest, signal?: AbortSignal): Promise<WindResult> {
  return postJson<WindResult>('/api/wind-loads/resolve', request, signal)
}
