import { postJson, requestJson } from '../../../shared/api/http'

export type ParameterProvenance = 'CODE_DEFAULT' | 'NATIONAL_ANNEX' | 'PROJECT_OVERRIDE'

export interface ParameterValue {
  value: number | null
  provenance: ParameterProvenance
  codeDefaultValue: number | null
}

export interface CarriagewayInput {
  deckWidthM: number
  leftWalkwayM: number
  rightWalkwayM: number
}

export interface NotionalLane {
  number: number
  widthM: number
}

export interface NotionalLaneResult {
  lanes: NotionalLane[]
  remainingAreaWidthM: number
}

export interface LaneFactor {
  label: string
  characteristicValue: ParameterValue
  adjustmentFactor: ParameterValue
}

export interface Lm1Parameters {
  tandemSystem: LaneFactor[]
  udl: LaneFactor[]
  remainingAreaUdl: LaneFactor
}

export interface TrafficLoadGroup {
  code: string
  name: string
  description: string
  components: unknown[]
  status: string
}

export interface TrafficValidationResult {
  carriagewayDefined: boolean
  notionalLanesGenerated: boolean
  lm1Resolved: boolean
  warnings: string[]
}

export interface TrafficResolveResponse {
  notionalLanes: NotionalLaneResult
  lm1: Lm1Parameters
  validation: TrafficValidationResult
}

/**
 * TRAFFIC-P01 (docs/roadmap.md): road-bridge traffic loads, EN 1991-2.
 * Same `fetch` + typed-interface convention as every other feature's
 * `api/*Service.ts` in this app.
 */
export function fetchLm1Defaults(laneCount: number): Promise<Lm1Parameters> {
  return requestJson<Lm1Parameters>(`/api/traffic-loads/lm1-defaults?laneCount=${laneCount}`)
}

export function fetchLoadGroups(): Promise<TrafficLoadGroup[]> {
  return requestJson<TrafficLoadGroup[]>('/api/traffic-loads/load-groups')
}

export function resolveTraffic(params: { carriageway: CarriagewayInput; lm1: Lm1Parameters }): Promise<TrafficResolveResponse> {
  return postJson<TrafficResolveResponse>('/api/traffic-loads/resolve', params)
}
