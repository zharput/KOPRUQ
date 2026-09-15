import type { Dimension } from '../../../shared/ui/ParamSweepCard'

export type PierType = 'RECTANGULAR' | 'CIRCULAR' | 'OVAL' | 'BOX' | 'H_SECTION'
export type PierStatus = 'VALID' | 'INVALID' | 'INCOMPLETE'
export type PierConfiguration = 'SINGLE_COLUMN' | 'TWO_COLUMNS'

export interface HeightApplicability {
  minimumHeight: number | null
  preferredHeightMin: number | null
  preferredHeightMax: number | null
  maximumHeight: number | null
}

export interface PierFamily {
  id: string
  name: string
  pierType: PierType
  enabled: boolean
  dimensions: Dimension[]
  allowedConfigurations: PierConfiguration[]
  twoColumnSpacing: Dimension | null
  heightApplicability: HeightApplicability
  source: 'PROJECT_DESIGN_SYSTEM'
}

export interface PierVariant {
  id: string
  pierFamilyId: string
  pierType: PierType
  sectionParameters: Record<string, number>
}
