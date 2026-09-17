export type BearingType = 'ELASTOMERIC'
export type BearingStatus = 'VALID' | 'INVALID' | 'INCOMPLETE'
export interface BearingRule { min: number | null; max: number | null; delta: number | null }
export interface BearingFamily { id: string; name: string; bearingType: BearingType; enabled: boolean; length: BearingRule; width: BearingRule; height: BearingRule; source: 'PROJECT_DESIGN_SYSTEM' }
export interface BearingVariant { id: string; bearingFamilyId: string; length: number; width: number; height: number }
