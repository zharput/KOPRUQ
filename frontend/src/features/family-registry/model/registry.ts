export type FamilyCategory = 'SUPERSTRUCTURE' | 'GIRDER' | 'PIER' | 'PIER_CAP' | 'ABUTMENT' | 'FOUNDATION' | 'BEARING' | 'MATERIAL'
export type FamilyRegistryRecord = { id: string; name: string; category: FamilyCategory; type: string; enabled: boolean | null; summary: string }
export type FamilyReference = { bridgeId: string; location: string }
export type FamilySelection = { category: FamilyCategory; id: string | null }

import { PRECAST_DIMENSIONS } from '../../girder-library/model/variants'
import { getFamilyRecords, getPrecastGirderDefinition } from './familyRepository'

const CHANGE_EVENTS: Partial<Record<FamilyCategory, string>> = {
  GIRDER: 'kopruq:girder-catalog-changed',
  MATERIAL: 'kopruq:material-catalog-changed',
  PIER: 'kopruq:pier-catalog-changed', PIER_CAP: 'kopruq:pier-cap-catalog-changed',
  FOUNDATION: 'kopruq:foundation-catalog-changed', BEARING: 'kopruq:bearing-catalog-changed',
}

function readArray(key: string): Record<string, unknown>[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]'); return Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object') : [] } catch { return [] }
}
const val = (row: Record<string, unknown>, key: string) => row[key] == null ? '' : String(row[key])

/** Reads existing feature-owned catalogs; this adapter does not own or persist family data. */
export function getFamilies(category: FamilyCategory): FamilyRegistryRecord[] {
  if (category === 'MATERIAL') {
    const classes = new Set(readArray('kopruq.project-design-system.material-assignments').map((row) => val(row, 'concreteClass')).filter(Boolean))
    return [...classes].sort().map((concreteClass) => ({ id: `EN1992-1-1:${concreteClass}`, name: concreteClass, category, type: 'CONCRETE', enabled: true, summary: 'EN 1992-1-1 concrete strength class reference; engineering material properties are not configured in this panel.' }))
  }
  if (category === 'GIRDER') {
    const record = getPrecastGirderDefinition<{ dimensions?: unknown[]; enabled?: boolean } | null>(null)
    const dimensions = Array.isArray(record?.dimensions) ? record.dimensions : PRECAST_DIMENSIONS
    return [{ id: 'PG-200', name: 'Precast Girder', category, type: 'PRECAST_GIRDER', enabled: record?.enabled ?? false, summary: `${dimensions.length} girder section parameters; generated variant IDs remain PG-H…` }]
  }
  if (category !== 'PIER' && category !== 'PIER_CAP' && category !== 'FOUNDATION' && category !== 'BEARING') return []
  return getFamilyRecords<{ id: string; name?: string; [key: string]: unknown }>(category).flatMap((row) => {
    const id = val(row, 'id')
    if (!id) return []
    const name = val(row, 'name') || id
    const type = val(row, 'pierType') || val(row, 'capType') || val(row, 'foundationType') || val(row, 'bearingType') || 'Not specified'
    const summary = category === 'PIER' ? `${type}; ${Array.isArray(row.dimensions) ? row.dimensions.length : 0} section parameters`
      : category === 'PIER_CAP' ? `${type}; ${val(row, 'compatiblePierConfiguration')}; cap length/height rules`
      : category === 'FOUNDATION' ? `${type}; ${type === 'PILED' ? 'pile layout with derived Lx/Ly' : 'Lx / Ly / H ranges'}`
      : `${type}; length / width / height ranges`
    return [{ id, name, category, type, enabled: typeof row.enabled === 'boolean' ? row.enabled : null, summary }]
  })
}

export function getFamilyReferences(category: FamilyCategory, id: string): FamilyReference[] {
  if (typeof localStorage === 'undefined') return []
  let stored: { definitions?: Record<string, Record<string, unknown>> } = {}
  try { stored = JSON.parse(localStorage.getItem('kopruq.bridge-definitions.v1') ?? '{}') as typeof stored } catch { return [] }
  const found: FamilyReference[] = []
  for (const [bridgeId, definition] of Object.entries(stored.definitions ?? {})) {
    const assignments = definition.axisAssignments && typeof definition.axisAssignments === 'object' ? definition.axisAssignments as Record<string, Record<string, unknown>> : {}
    for (const [axisId, assignment] of Object.entries(assignments)) {
      const key = category === 'PIER' ? 'pierFamilyId' : category === 'PIER_CAP' ? 'pierCapFamilyId' : category === 'FOUNDATION' ? 'foundationFamilyId' : category === 'BEARING' ? 'bearingFamilyId' : null
      if (key && assignment?.[key] === id) found.push({ bridgeId, location: axisId })
    }
    if (category === 'GIRDER' && (definition.girderFamilyId === id || definition.girderVariantId === id)) found.push({ bridgeId, location: 'Superstructure / Girder' })
    if (category === 'ABUTMENT') {
      const abutments = definition.abutmentFamilyIds as Record<string, unknown> | undefined
      for (const axis of ['A1', 'A2']) if (abutments?.[axis] === id) found.push({ bridgeId, location: axis })
    }
  }
  return found
}

export function publishFamilySelection(category: FamilyCategory, id: string | null): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<FamilySelection>('kopruq:family-selection-changed', { detail: { category, id } }))
}

export function familyChangedEvent(category: FamilyCategory): string | undefined { return CHANGE_EVENTS[category] }
