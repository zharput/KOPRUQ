import { useQuery } from '@tanstack/react-query'
import { fetchLm1Defaults } from '../api/trafficLoadsService'

export function useLm1Defaults(laneCount: number) {
  return useQuery({ queryKey: ['lm1-defaults', laneCount], queryFn: () => fetchLm1Defaults(laneCount) })
}
