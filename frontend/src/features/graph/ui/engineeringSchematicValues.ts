import type { GraphValue } from '../domain/types'
import type { ProjectUnitPreferences } from '../domain/engineeringInputs'
import { toDisplayValue } from '../domain/quantities'

export function displayLength(value: number, projectUnits?: ProjectUnitPreferences) {
  return Number(toDisplayValue(value, 'Length', projectUnits).toPrecision(10)).toString()
}
export function displayRange(values: number[], projectUnits?: ProjectUnitPreferences) {
  if (!values.length) return '—'
  const low = Math.min(...values), high = Math.max(...values)
  return low === high ? displayLength(low, projectUnits) : `${displayLength(low, projectUnits)} – ${displayLength(high, projectUnits)}`
}
export function geometryValues(candidates: GraphValue[], key: string) {
  return candidates.map(item => {
    if (typeof item !== 'object' || item === null || Array.isArray(item) || !('geometry' in item)) return undefined
    const value = (item.geometry as Record<string, unknown>)[key]
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined
  }).filter((value): value is number => value !== undefined)
}
