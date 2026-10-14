/**
 * Single access boundary for the project family catalogs. Since BACKEND-DB-PERSISTENCE M5c every catalog is a server section
 * (`FAMILY_SERVER_SECTIONS`, `GIRDER_LIBRARY_SERVER_SECTION`): reads come from the section's in-memory mirror, writes go through the
 * write queue. Nothing is stored in the browser. The `kopruq:*-catalog-changed` events are emitted from the section notifications.
 */
import { FAMILY_SERVER_SECTIONS, GIRDER_LIBRARY_SERVER_SECTION } from './familyServerSections'

export type FamilyRepositoryCategory = 'PIER' | 'PIER_CAP' | 'FOUNDATION' | 'BEARING' | 'MATERIAL'
export type FamilyRecord = { id: string; name?: string }
export type FamilyParameterDescriptor = { key: string; label: string; dataType: 'number' | 'integer' | 'string' | 'boolean'; unit?: string; editable: boolean; derived: boolean }

const CATALOG_EVENTS: Record<FamilyRepositoryCategory, string> = {
  PIER: 'kopruq:pier-catalog-changed',
  PIER_CAP: 'kopruq:pier-cap-catalog-changed',
  FOUNDATION: 'kopruq:foundation-catalog-changed',
  BEARING: 'kopruq:bearing-catalog-changed',
  MATERIAL: 'kopruq:material-catalog-changed',
}
const GIRDER_CATALOG_EVENT = 'kopruq:girder-catalog-changed'

export const FAMILY_CATEGORIES = Object.keys(CATALOG_EVENTS) as FamilyRepositoryCategory[]

// Every section change (own write, confirmation, hydrate, discard) is announced through the legacy catalog events for the non-hook consumers.
for (const category of FAMILY_CATEGORIES) {
  FAMILY_SERVER_SECTIONS[category].subscribe(() => { if (typeof window !== 'undefined') window.dispatchEvent(new Event(CATALOG_EVENTS[category])) })
}
GIRDER_LIBRARY_SERVER_SECTION.subscribe(() => { if (typeof window !== 'undefined') window.dispatchEvent(new Event(GIRDER_CATALOG_EVENT)) })

/** The girder library payload; `fallback` when the section has no value (or holds the cleared `[]` form). */
export function getPrecastGirderDefinition<T>(fallback: T): T {
  const value = GIRDER_LIBRARY_SERVER_SECTION.read()
  return value === undefined || Array.isArray(value) ? fallback : value as T
}
/** `[]` (the cleared library) is sent as null. false: no open project or the value cannot be sent. */
export function savePrecastGirderDefinition(value: unknown): boolean {
  return GIRDER_LIBRARY_SERVER_SECTION.write(value as Parameters<typeof GIRDER_LIBRARY_SERVER_SECTION.write>[0])
}

export function getFamilyRecords<T extends FamilyRecord>(category: FamilyRepositoryCategory, fallback: () => T[] = () => []): T[] {
  const value = FAMILY_SERVER_SECTIONS[category].read()
  return value === undefined ? fallback() : value as unknown as T[]
}

export function getFamilyRecord<T extends FamilyRecord>(category: FamilyRepositoryCategory, id: string, fallback?: () => T[]): T | undefined {
  return getFamilyRecords<T>(category, fallback).find((family) => family.id === id)
}

export function saveFamilyRecords<T extends FamilyRecord>(category: FamilyRepositoryCategory, records: T[]): boolean {
  return (FAMILY_SERVER_SECTIONS[category].write as (next: unknown) => boolean)(records)
}

export function updateFamilyRecord<T extends FamilyRecord>(category: FamilyRepositoryCategory, id: string, update: (family: T) => T, fallback?: () => T[]): boolean {
  const records = getFamilyRecords<T>(category, fallback)
  if (!records.some((family) => family.id === id)) return false
  return saveFamilyRecords(category, records.map((family) => family.id === id ? update(family) : family))
}

export function deleteFamilyRecord<T extends FamilyRecord>(category: FamilyRepositoryCategory, id: string, fallback?: () => T[]): boolean {
  return saveFamilyRecords(category, getFamilyRecords<T>(category, fallback).filter((family) => family.id !== id))
}

export function subscribeFamilyRecords(category: FamilyRepositoryCategory, listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  const eventName = CATALOG_EVENTS[category]
  window.addEventListener(eventName, listener)
  return () => { window.removeEventListener(eventName, listener) }
}

/** Graph stores category + familyId only; values are resolved on every read. */
export const graphFamilyAdapter = {
  getFamilyReference(category: FamilyRepositoryCategory, familyId: string) { return { category, familyId } },
  resolve<T extends FamilyRecord>(reference: { category: FamilyRepositoryCategory; familyId: string }): T | undefined {
    return getFamilyRecord<T>(reference.category, reference.familyId)
  },
  getParameters<T extends FamilyRecord>(reference: { category: FamilyRepositoryCategory; familyId: string }): T | undefined {
    return this.resolve<T>(reference)
  },
  getParameterSchema(reference: { category: FamilyRepositoryCategory; familyId: string }): FamilyParameterDescriptor[] {
    const family = getFamilyRecord<FamilyRecord & Record<string, unknown>>(reference.category, reference.familyId)
    if (!family) return []
    if (reference.category === 'PIER') {
      const dimensions = Array.isArray(family.dimensions) ? family.dimensions as { key: string; label: string }[] : []
      return dimensions.map((item) => ({ key: item.key, label: item.label, dataType: 'number', unit: item.label.includes('(m)') ? 'm' : undefined, editable: true, derived: false }))
    }
    if (reference.category === 'PIER_CAP') return [
      { key: 'capTransverseLength', label: 'Cap Transverse Length', dataType: 'number', unit: 'm', editable: true, derived: false },
      { key: 'capStructuralHeight', label: 'Cap Structural Height', dataType: 'number', unit: 'm', editable: true, derived: false },
      ...(family.capType === 'T_CAP' ? [{ key: 'stemWidth', label: 'Stem Width', dataType: 'number' as const, unit: 'm', editable: true, derived: false }] : []),
    ]
    if (reference.category === 'BEARING') return [
      { key: 'length', label: 'Bearing Length', dataType: 'number', unit: 'mm', editable: true, derived: false },
      { key: 'width', label: 'Bearing Width', dataType: 'number', unit: 'mm', editable: true, derived: false },
      { key: 'height', label: 'Bearing Height', dataType: 'number', unit: 'mm', editable: true, derived: false },
    ]
    if (reference.category === 'FOUNDATION' && family.foundationType === 'PILED') return [
      { key: 'pileDiameter', label: 'Pile Diameter D', dataType: 'number', unit: 'm', editable: true, derived: false },
      { key: 'pileCountX', label: 'Pile Count nx', dataType: 'integer', editable: true, derived: false },
      { key: 'pileSpacingX', label: 'Pile Spacing ax', dataType: 'number', unit: 'm', editable: true, derived: false },
      { key: 'pileCountY', label: 'Pile Count ny', dataType: 'integer', editable: true, derived: false },
      { key: 'pileSpacingY', label: 'Pile Spacing ay', dataType: 'number', unit: 'm', editable: true, derived: false },
      { key: 'height', label: 'Foundation Height H', dataType: 'number', unit: 'm', editable: true, derived: false },
      { key: 'lengthX', label: 'Foundation Length Lx', dataType: 'number', unit: 'm', editable: false, derived: true },
      { key: 'lengthY', label: 'Foundation Width Ly', dataType: 'number', unit: 'm', editable: false, derived: true },
    ]
    if (reference.category === 'FOUNDATION' && family.foundationType === 'SHALLOW') return [
      { key: 'lengthX', label: 'Foundation Length Lx', dataType: 'number', unit: 'm', editable: true, derived: false },
      { key: 'lengthY', label: 'Foundation Width Ly', dataType: 'number', unit: 'm', editable: true, derived: false },
      { key: 'height', label: 'Foundation Height H', dataType: 'number', unit: 'm', editable: true, derived: false },
    ]
    return []
  },
  subscribe(category: FamilyRepositoryCategory, listener: () => void) { return subscribeFamilyRecords(category, listener) },
}
