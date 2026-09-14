import { useQuery } from '@tanstack/react-query'
import { fetchLoadGroups } from '../api/trafficLoadsService'

export function useLoadGroups() {
  return useQuery({ queryKey: ['traffic-load-groups'], queryFn: fetchLoadGroups })
}
