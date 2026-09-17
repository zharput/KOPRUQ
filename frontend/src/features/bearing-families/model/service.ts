import { generateValues } from '../../../shared/ui/ParamSweepCard'
import type { BearingFamily, BearingVariant, BearingRule } from './types'

export function candidates(rule: BearingRule): number[] { return rule.min == null || rule.max == null || rule.delta == null ? [] : generateValues(rule.min, rule.max, rule.delta).filter((value) => value > 0) }
export function validFamily(family: BearingFamily) { return Boolean(family.name.trim() && candidates(family.length).length && candidates(family.width).length && candidates(family.height).length) }
export function statusOf(family: BearingFamily) { return !family.name.trim() ? 'INCOMPLETE' as const : validFamily(family) ? 'VALID' as const : 'INVALID' as const }
export function generateBearingVariants(family: BearingFamily): BearingVariant[] {
  if (!validFamily(family)) return []
  return candidates(family.length).flatMap((length) => candidates(family.width).flatMap((width) => candidates(family.height).map((height) => ({ id: `${family.id}-${length}-${width}-${height}`, bearingFamilyId: family.id, length, width, height }))))
}
export function displayValue(value: number) { return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3))) }
