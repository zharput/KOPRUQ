import { useQuery } from '@tanstack/react-query'
import { resolveUniformTemperature } from '../api/temperatureService'

const toNumber = (text: string) => text.trim() === '' ? null : Number(text)

/** Result for exactly these inputs (the inputs are part of the query key, so older responses cannot replace the current result). */
export function useUniformTemperature(inputs: { min: string; max: string; t0: string }) {
  const min = toNumber(inputs.min), max = toNumber(inputs.max), t0 = toNumber(inputs.t0)
  return useQuery({
    queryKey: ['uniform-temperature', min, max, t0],
    queryFn: ({ signal }) => resolveUniformTemperature(min, max, t0, signal),
    enabled: min !== null || max !== null || t0 !== null,
    retry: false,
  })
}
