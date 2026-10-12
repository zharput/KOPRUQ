import { postJson } from '../../../shared/api/http'

export interface UniformTemperatureResult {
  initialTemperatureC: number | null
  effectiveMinimumC: number | null
  effectiveMaximumC: number | null
  contractionC: number | null
  expansionC: number | null
  thermalExpansionSource: string
  standard: string
  parameterSource: string
  status: string
  missingParameters: string[]
  concreteAlphaTPerC: number | null
  steelAlphaTPerC: number | null
  temperatureActionStatus: string
  concreteAlphaStatus: string
  steelAlphaStatus: string
}

export function resolveUniformTemperature(effectiveMinimumTemperatureC: number | null, effectiveMaximumTemperatureC: number | null, initialTemperatureC: number | null, signal?: AbortSignal) {
  return postJson<UniformTemperatureResult>('/api/temperature/uniform/resolve', { effectiveMinimumTemperatureC, effectiveMaximumTemperatureC, initialTemperatureC }, signal)
}
