export type PierCapType = 'RECTANGULAR' | 'T_CAP'
export type PierCapConfiguration = 'SINGLE_COLUMN' | 'TWO_COLUMNS'
export type PierCapStatus = 'VALID' | 'INVALID' | 'INCOMPLETE'
export interface Rule { min: number | null; max: number | null; delta: number | null }
export interface PierCapFamily { id: string; name: string; capType: PierCapType; compatiblePierConfiguration: PierCapConfiguration; capTransverseLength: Rule; capStructuralHeight: Rule; stemWidth: Rule | null; enabled: boolean; source: 'PROJECT_DESIGN_SYSTEM' }
export interface PierCapVariant { id: string; pierCapFamilyId: string; capType: PierCapType; structuralSystem: 'CANTILEVER' | 'FRAME'; compatiblePierConfiguration: PierCapConfiguration; capTransverseLength: number; capStructuralHeight: number; stemWidth?: number }
