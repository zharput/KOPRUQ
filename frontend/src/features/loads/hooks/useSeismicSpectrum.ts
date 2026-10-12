import { useQuery } from '@tanstack/react-query'
import { fetchSeismicSpectrum } from '../api/seismicService'

/** Spectrum for exactly these inputs: the query key holds the inputs, so a late answer for older inputs can never replace the current one. */
export function useSeismicSpectrum(inputs: { a: string; g: string; t: string; i: string }) {
  const agR = Number(inputs.a), importanceFactor = Number(inputs.i)
  const ready = inputs.a.trim() !== '' && inputs.i.trim() !== '' && Number.isFinite(agR) && Number.isFinite(importanceFactor)
  const query = useQuery({
    // Not-ready inputs share one inert key, so an earlier intermediate value (e.g. '0' while typing '0.25') is never mistaken for the current empty input.
    queryKey: ready ? ['seismic-spectrum', agR, importanceFactor, inputs.g, inputs.t] : ['seismic-spectrum', null],
    queryFn: ({ signal }) => fetchSeismicSpectrum({ agR, importanceFactor, groundType: inputs.g, spectrumType: inputs.t }, signal),
    enabled: ready,
    retry: false,
  })
  // While the inputs are not ready there is no valid result: ignore any data/error cached for another key.
  return ready ? query : { ...query, data: undefined, error: null, isError: false }
}
