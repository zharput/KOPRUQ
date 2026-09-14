import { useQuery } from '@tanstack/react-query'
import { fetchImportedAlignmentSample } from '../api/terrainViewerService'

export function useImportedAlignmentSample(importId: string | null, stepM = 0) {
  return useQuery({
    queryKey: ['imported-alignment-sample', importId, stepM],
    queryFn: () => fetchImportedAlignmentSample(importId as string, stepM),
    enabled: importId != null,
  })
}
