const API_BASE = 'http://localhost:8080'

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

export async function resolveUniformTemperature(effectiveMinimumTemperatureC: number | null, effectiveMaximumTemperatureC: number | null, initialTemperatureC: number | null) {
  const response = await fetch(`${API_BASE}/api/temperature/uniform/resolve`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ effectiveMinimumTemperatureC, effectiveMaximumTemperatureC, initialTemperatureC }),
  })
  if (!response.ok) throw new Error(`Temperature resolve failed (${response.status})`)
  return response.json() as Promise<UniformTemperatureResult>
}
