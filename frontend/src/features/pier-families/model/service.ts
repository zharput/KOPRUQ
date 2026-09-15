import { generateValues, type Dimension } from '../../../shared/ui/ParamSweepCard'
import type { HeightApplicability, PierFamily, PierStatus, PierVariant } from './types'

export function generatePierVariants(family: PierFamily): PierVariant[] {
  if (!family.dimensions.length || family.dimensions.some((dimension) => dimension.min <= 0 || dimension.max < dimension.min || dimension.delta <= 0)) return []
  const values = family.dimensions.map((dimension) => ({ key: dimension.key, values: generateValues(dimension.min, dimension.max, dimension.delta) }))
  if (values.some((item) => item.values.length === 0)) return []
  return values.reduce<Record<string, number>[]>((combinations, item) => combinations.flatMap((combination) => item.values.map((value) => ({ ...combination, [item.key]: value }))), [{}]).map((sectionParameters) => ({
    id: `${family.id}-${Object.entries(sectionParameters).map(([key, value]) => `${key}${value}`).join('-')}`,
    pierFamilyId: family.id,
    pierType: family.pierType,
    sectionParameters,
  }))
}

export function validateHeightApplicability(height: HeightApplicability): boolean {
  const values = [height.minimumHeight, height.preferredHeightMin, height.preferredHeightMax, height.maximumHeight]
  return values.every((value) => value != null && Number.isFinite(value)) && height.minimumHeight! >= 0 && height.minimumHeight! <= height.preferredHeightMin! && height.preferredHeightMin! <= height.preferredHeightMax! && height.preferredHeightMax! <= height.maximumHeight!
}

export function statusOfPierFamily(family: PierFamily): PierStatus {
  if (!family.name || !family.pierType || family.allowedConfigurations.length === 0) return 'INCOMPLETE'
  if (family.pierType === 'H_SECTION') return 'INCOMPLETE'
  if (family.dimensions.some((dimension) => dimension.min <= 0 || dimension.max < dimension.min || dimension.delta <= 0)) return 'INVALID'
  if (family.allowedConfigurations.includes('TWO_COLUMNS')) {
    const spacing = family.twoColumnSpacing
    if (!spacing || spacing.min <= 0 || spacing.max < spacing.min || spacing.delta <= 0) return 'INVALID'
  }
  if (!validateHeightApplicability(family.heightApplicability)) return 'INVALID'
  return generatePierVariants(family).length > 0 ? 'VALID' : 'INVALID'
}

export function evaluatePierFamily(family: PierFamily, actualHeight: number): 'PREFERRED' | 'APPLICABLE' | 'NOT_APPLICABLE' {
  const h = family.heightApplicability
  if (!Number.isFinite(actualHeight) || !validateHeightApplicability(h) || actualHeight < h.minimumHeight! || actualHeight > h.maximumHeight!) return 'NOT_APPLICABLE'
  return actualHeight >= h.preferredHeightMin! && actualHeight <= h.preferredHeightMax! ? 'PREFERRED' : 'APPLICABLE'
}

export function defaultDimensions(type: PierFamily['pierType']): Dimension[] {
  if (type === 'RECTANGULAR') return [{ key: 'B', label: 'B - Transverse (m)', min: 3, max: 6, delta: 1 }, { key: 'D', label: 'D - Longitudinal (m)', min: 1.5, max: 2.5, delta: 0.5 }]
  if (type === 'CIRCULAR') return [{ key: 'D', label: 'Diameter (m)', min: 2, max: 3, delta: 0.5 }]
  if (type === 'OVAL') return [{ key: 'B', label: 'B - Transverse (m)', min: 3, max: 6, delta: 1 }, { key: 'D', label: 'D - Longitudinal (m)', min: 1.5, max: 2.5, delta: 0.5 }]
  if (type === 'BOX') return [{ key: 'B', label: 'B - Transverse (m)', min: 3, max: 6, delta: 1 }, { key: 'D', label: 'D - Longitudinal (m)', min: 1.5, max: 2.5, delta: 0.5 }, { key: 'tw', label: 'tw (m)', min: 0.3, max: 0.6, delta: 0.1 }]
  return []
}
