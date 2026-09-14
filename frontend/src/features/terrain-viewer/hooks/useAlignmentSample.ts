import { useQuery } from '@tanstack/react-query'
import { sampleAlignment } from '../api/terrainViewerService'

interface AlignmentSampleParams {
  startXM: number
  startYM: number
  endXM: number
  endYM: number
  stepM: number
}

export function useAlignmentSample(params: AlignmentSampleParams | null) {
  return useQuery({
    queryKey: ['alignment-sample', params],
    queryFn: () => sampleAlignment(params as AlignmentSampleParams),
    enabled: params != null,
  })
}
