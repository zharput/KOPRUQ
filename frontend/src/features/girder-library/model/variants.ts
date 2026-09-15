import { generateValues, type Dimension } from '../../../shared/ui/ParamSweepCard'

export interface GirderVariant {
  id: string
  familyId: string
  heightCm: number
  label: string
}

export const PRECAST_DIMENSIONS: Dimension[] = [
  { key: 'H', label: 'H (cm)', min: 160, max: 190, delta: 10 },
  { key: 'tf', label: 'tf (cm)', min: 120, max: 150, delta: 10 },
  { key: 'bf', label: 'bf (cm)', min: 60, max: 80, delta: 10 },
  { key: 'w', label: 'w (cm)', min: 20, max: 25, delta: 5 },
  { key: 'th1', label: 'th1 (cm)', min: 10, max: 12, delta: 2 },
  { key: 'th2', label: 'th2 (cm)', min: 10, max: 10, delta: 0 },
  { key: 'bh1', label: 'bh1 (cm)', min: 35, max: 40, delta: 5 },
  { key: 'bh2', label: 'bh2 (cm)', min: 15, max: 15, delta: 0 },
]

export function generatePrecastGirderVariants(dimensions: Dimension[]): GirderVariant[] {
  const height = dimensions.find((dimension) => dimension.key === 'H')
  if (!height) return []
  return generateValues(height.min, height.max, height.delta).map((heightCm) => ({
    id: `PG-H${heightCm}`,
    familyId: 'PG-200',
    heightCm,
    label: `PG-H${heightCm}`,
  }))
}
