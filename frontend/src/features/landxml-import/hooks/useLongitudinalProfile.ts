import { useQuery } from '@tanstack/react-query'
import { fetchLongitudinalProfile } from '../api/landXmlImportService'

export function useLongitudinalProfile(importId: string | null) {
  return useQuery({
    queryKey: ['landxml-profile', importId],
    queryFn: () => fetchLongitudinalProfile(importId as string),
    enabled: importId != null,
  })
}
