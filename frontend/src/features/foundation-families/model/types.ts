export type FoundationType = 'SHALLOW' | 'PILED'
export type FoundationStatus = 'VALID' | 'INVALID' | 'INCOMPLETE'
export interface FoundationRule { min: number | null; max: number | null; delta: number | null }
export interface ShallowFoundationGeneration { lengthX: FoundationRule; lengthY: FoundationRule; height: FoundationRule }
export interface PiledFoundationGeneration { pileDiameter: FoundationRule; pileCountX: FoundationRule; pileSpacingX: FoundationRule; pileCountY: FoundationRule; pileSpacingY: FoundationRule; height: FoundationRule }
export interface FoundationFamily { id: string; name: string; foundationType: FoundationType; enabled: boolean; shallowGeneration: ShallowFoundationGeneration | null; piledGeneration: PiledFoundationGeneration | null; source: 'PROJECT_DESIGN_SYSTEM' }
export interface FoundationVariant { id: string; foundationFamilyId: string; foundationType: FoundationType; lengthX: number; lengthY: number; height: number; pileDiameter?: number; pileCountX?: number; pileSpacingX?: number; pileCountY?: number; pileSpacingY?: number; source: 'PROJECT_DESIGN_SYSTEM'; status: 'VALID' }
