import type { FoundationFamily, FoundationRule, FoundationVariant, PiledFoundationGeneration } from './types'

export function values(rule: FoundationRule): number[] {
  const { min, max, delta } = rule
  if (min == null || max == null || delta == null || !Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(delta) || min <= 0 || max < min) return []
  if (min === max) return [round(min)]
  if (delta <= 0) return []
  const count = Math.floor((max - min) / delta + 1e-10)
  return Array.from({ length: count + 1 }, (_, index) => round(min + index * delta))
}

export function derivePiledFoundationDimensions(pileDiameter: number, pileCountX: number, pileSpacingX: number, pileCountY: number, pileSpacingY: number) {
  return { lengthX: round(pileDiameter + (pileCountX - 1) * pileSpacingX + pileDiameter), lengthY: round(pileDiameter + (pileCountY - 1) * pileSpacingY + pileDiameter) }
}

function validPiled(generation: PiledFoundationGeneration) {
  const countsValid = [generation.pileCountX, generation.pileCountY].every((rule) => rule.min != null && rule.max != null && rule.delta != null && [rule.min, rule.max, rule.delta].every(Number.isInteger) && rule.min >= 1 && (rule.min === rule.max || rule.delta >= 1))
  if (!countsValid) return false
  const allRules = Object.values(generation)
  if (!allRules.every((rule) => values(rule).length > 0)) return false
  return generation.pileDiameter.min != null && generation.pileSpacingX.min != null && generation.pileSpacingY.min != null && [generation.pileDiameter.min, generation.pileSpacingX.min, generation.pileSpacingY.min].every((value) => value > 0)
}

export function statusOf(family: FoundationFamily) {
  if (!family.name.trim()) return 'INCOMPLETE' as const
  const valid = family.foundationType === 'SHALLOW'
    ? Boolean(family.shallowGeneration && Object.values(family.shallowGeneration).every((rule) => values(rule).length > 0))
    : Boolean(family.piledGeneration && validPiled(family.piledGeneration))
  return valid ? 'VALID' as const : 'INVALID' as const
}

export function generateFoundationVariants(family: FoundationFamily): FoundationVariant[] {
  if (statusOf(family) !== 'VALID') return []
  if (family.foundationType === 'SHALLOW') {
    const generation = family.shallowGeneration!
    return values(generation.lengthX).flatMap((lengthX) => values(generation.lengthY).flatMap((lengthY) => values(generation.height).map((height) => ({ id: `${family.id}-LX${labelNumber(lengthX)}-LY${labelNumber(lengthY)}-H${labelNumber(height)}`, foundationFamilyId: family.id, foundationType: 'SHALLOW' as const, lengthX, lengthY, height, source: family.source, status: 'VALID' as const }))))
  }
  const generation = family.piledGeneration!
  const variants: FoundationVariant[] = []
  for (const pileDiameter of values(generation.pileDiameter)) for (const pileCountX of values(generation.pileCountX)) for (const pileSpacingX of values(generation.pileSpacingX)) for (const pileCountY of values(generation.pileCountY)) for (const pileSpacingY of values(generation.pileSpacingY)) for (const height of values(generation.height)) {
    const dimensions = derivePiledFoundationDimensions(pileDiameter, pileCountX, pileSpacingX, pileCountY, pileSpacingY)
    variants.push({ id: `${family.id}-D${labelNumber(pileDiameter)}-NX${pileCountX}-AX${labelNumber(pileSpacingX)}-NY${pileCountY}-AY${labelNumber(pileSpacingY)}-H${labelNumber(height)}`, foundationFamilyId: family.id, foundationType: 'PILED', ...dimensions, height, pileDiameter, pileCountX, pileSpacingX, pileCountY, pileSpacingY, source: family.source, status: 'VALID' })
  }
  return variants
}

export function labelNumber(value: number) { return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6))) }
function round(value: number) { return Number(value.toFixed(10)) }
