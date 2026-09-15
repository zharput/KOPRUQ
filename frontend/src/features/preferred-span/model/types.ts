export type SuperstructureType = 'PRECAST_GIRDER' | 'STEEL_GIRDER'
export type PreferredSpanRuleType = 'HARD_CONSTRAINT' | 'PREFERRED_RANGE'
export type PreferredSpanStatus = 'VALID' | 'INVALID' | 'INCOMPLETE'

export interface PreferredSpanRule {
  id: string
  superstructureType: SuperstructureType
  girderVariantId: string
  minSpan: number
  maxSpan: number
  spanDelta: number
  primarySpan: number
  enabled: boolean
  source: 'PROJECT_DESIGN_SYSTEM'
}
