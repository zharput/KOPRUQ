import { useQuery } from '@tanstack/react-query'
import { resolveTraffic } from '../api/trafficLoadsService'
import type { CarriagewayInput, Lm1Parameters } from '../api/trafficLoadsService'

/** Re-resolves (notional lanes + LM1 effective values + validation) whenever carriageway or LM1 state changes - the one place engineering computation happens, never in a React component (spec section 22's discipline extended to software architecture). */
export function useResolveTraffic(carriageway: CarriagewayInput, lm1: Lm1Parameters | null) {
  return useQuery({
    queryKey: ['traffic-resolve', carriageway, lm1],
    queryFn: () => resolveTraffic({ carriageway, lm1: lm1 as Lm1Parameters }),
    enabled: lm1 != null,
  })
}
