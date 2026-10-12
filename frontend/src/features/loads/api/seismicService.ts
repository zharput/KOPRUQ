import { postJson } from '../../../shared/api/http'

export type SeismicSpectrumPoint = { period: number; acceleration: number }
export type SeismicSpectrumResult = {
  status: 'VALID' | 'INVALID'
  ag: number
  s: number
  tb: number
  tc: number
  td: number
  peakElasticAcceleration: number
  points: SeismicSpectrumPoint[]
}
export type SeismicSpectrumRequest = { agR: number; importanceFactor: number; groundType: string; spectrumType: string }

export function fetchSeismicSpectrum(request: SeismicSpectrumRequest, signal?: AbortSignal): Promise<SeismicSpectrumResult> {
  return postJson<SeismicSpectrumResult>('/api/seismic/spectrum', request, signal)
}
