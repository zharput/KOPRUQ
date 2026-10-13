import type { GraphValue } from '../domain/types'
import type { ProjectUnitPreferences } from '../domain/engineeringInputs'
import { formatDisplayValue } from '../domain/quantities'
import { PRECAST_GEOMETRY_KEYS, precastGeometryValue, type PrecastGeometryKey } from '../domain/precastGeometry'

export function displayLength(value: number, projectUnits?: ProjectUnitPreferences) { return formatDisplayValue(value, 'Length', projectUnits) }
export function displayRange(values: number[], projectUnits?: ProjectUnitPreferences) {
  if (!values.length) return '—'
  const low = Math.min(...values), high = Math.max(...values)
  return low === high ? displayLength(low, projectUnits) : `${displayLength(low, projectUnits)} – ${displayLength(high, projectUnits)}`
}
export function geometryValues(candidates: GraphValue[], key: string) {
  return candidates.map(item => {
    if (typeof item !== 'object' || item === null || Array.isArray(item) || !('geometry' in item)) return undefined
    const geometry = item.geometry as Record<string, unknown>
    const value = 'girderType' in item && item.girderType === 'PRECAST' && (PRECAST_GEOMETRY_KEYS as readonly string[]).includes(key)
      ? precastGeometryValue(geometry, key as PrecastGeometryKey)
      : geometry[key]
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined
  }).filter((value): value is number => value !== undefined)
}
