export type BridgeViewMode = '3D' | 'PLAN' | 'PROFILE'
export type BridgeAxisType = 'ABUTMENT' | 'PIER'
export type ConstraintKind = 'ROAD_RAILWAY' | 'RIVER' | 'CLEARANCE' | 'UTILITY' | 'ENVIRONMENT' | 'OTHER'

export interface BridgeAxis {
  id: string
  name: string
  type: BridgeAxisType
  chainageM: number
  elevationM: number | null
  skewDegrees: number | null
}

export interface AxisFamilyAssignments {
  pierFamilyId: string | null
  pierHeightM: number | null
  pierCapFamilyId: string | null
  foundationFamilyId: string | null
  foundationElevationM: number | null
  soilReference: string
  bearingFamilyId: string | null
  bearingQuantity: number | null
  bearingOrientation: string
  longitudinalBehavior: string
  transverseBehavior: string
}

export interface BridgeConstraint {
  id: string
  kind: ConstraintKind
  name: string
  startChainageM: number | null
  endChainageM: number | null
  note: string
}

export interface BridgeInstanceDefinition {
  bridgeId: string
  spanLengthsM: number[]
  axes: BridgeAxis[]
  selectedAxisId: string | null
  superstructureType: string
  girderFamilyId: string | null
  girderVariantId: string | null
  girderCount: number | null
  deckWidthOverrideM: number | null
  axisAssignments: Record<string, AxisFamilyAssignments>
  abutmentFamilyIds: { A1: string | null; A2: string | null }
  constructionMethod: string
  constructionStagesNote: string
  constraints: BridgeConstraint[]
  selectedConstraintId: string | null
  viewMode: BridgeViewMode
  terrainVisible: boolean
}

export interface BridgeDefinitionStore {
  selectedBridgeId: string | null
  definitions: Record<string, BridgeInstanceDefinition>
}
