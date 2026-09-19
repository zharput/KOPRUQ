import type { GraphValue } from '../domain/types'
import { getUnit, quantityFromCanonical } from '../domain/quantities'
import type { ProjectUnitPreferences } from '../domain/engineeringInputs'

export function displayLength(value: number, projectUnits?: ProjectUnitPreferences) {
  const preferred = getUnit(projectUnits?.length ?? 'm')
  const unit = preferred?.kind === 'length' ? preferred.id : 'm'
  return `${quantityFromCanonical(value, 'length', unit).toFixed(2)} ${getUnit(unit)!.label}`
}
export function displayRange(values: number[], projectUnits?: ProjectUnitPreferences) {
  if (!values.length) return '—'
  const low = Math.min(...values), high = Math.max(...values)
  return low === high ? displayLength(low, projectUnits) : `${displayLength(low, projectUnits)}–${displayLength(high, projectUnits)}`
}
export function geometryValues(candidates: GraphValue[], key: string) {
  return candidates.map(item => {
    if (typeof item !== 'object' || item === null || Array.isArray(item) || !('geometry' in item)) return undefined
    const value = (item.geometry as Record<string, unknown>)[key]
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined
  }).filter((value): value is number => value !== undefined)
}
