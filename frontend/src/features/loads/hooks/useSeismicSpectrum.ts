import { useQuery } from '@tanstack/react-query'
import { fetchSeismicSpectrum } from '../api/seismicService'

/** Spectrum for exactly these inputs: the query key holds the inputs, so a late answer for older inputs can never replace the current one. */
export function useSeismicSpectrum(inputs: { a: string; g: string; t: string; i: string }) {
  const agR = Number(inputs.a), importanceFactor = Number(inputs.i)
  const ready = inputs.a.trim() !== '' && inputs.i.trim() !== '' && Number.isFinite(agR) && Number.isFinite(importanceFactor)
  return useQuery({
    queryKey: ['seismic-spectrum', agR, importanceFactor, inputs.g, inputs.t],
    queryFn: ({ signal }) => fetchSeismicSpectrum({ agR, importanceFactor, groundType: inputs.g, spectrumType: inputs.t }, signal),
    enabled: ready,
    retry: false,
  })
}
