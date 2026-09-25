/**
 * Single access boundary for the existing project family catalogs.
 * Storage keys and payload shapes are intentionally preserved so current
 * projects and bridge familyId references remain backward compatible.
 */
export type FamilyRepositoryCategory = 'PIER' | 'PIER_CAP' | 'FOUNDATION' | 'BEARING' | 'MATERIAL'
export type FamilyRecord = { id: string; name?: string }
export type FamilyParameterDescriptor = { key: string; label: string; dataType: 'number' | 'integer' | 'string' | 'boolean'; unit?: string; editable: boolean; derived: boolean }

const CATALOGS: Record<FamilyRepositoryCategory, { key: string; event: string }> = {
  PIER: { key: 'kopruq.project-design-system.pier-families', event: 'kopruq:pier-catalog-changed' },
  PIER_CAP: { key: 'kopruq.project-design-system.pier-cap-families', event: 'kopruq:pier-cap-catalog-changed' },
  FOUNDATION: { key: 'kopruq.project-design-system.foundation-families', event: 'kopruq:foundation-catalog-changed' },
  BEARING: { key: 'kopruq.project-design-system.bearing-families', event: 'kopruq:bearing-catalog-changed' },
  MATERIAL: { key: 'kopruq.project-design-system.material-assignments', event: 'kopruq:material-catalog-changed' },
}

/** Adapter over Girder Library's existing singleton payload; keeps its legacy shape and key. */
export function getPrecastGirderDefinition<T>(fallback: T): T {
  try { return (JSON.parse(localStorage.getItem('kopruq.girder-library.precast') ?? 'null') as T | null) ?? fallback } catch { return fallback }
}
export function savePrecastGirderDefinition(value: unknown): boolean {
  try {
    localStorage.setItem('kopruq.girder-library.precast', JSON.stringify(value))
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('kopruq:girder-catalog-changed'))
    return true
  } catch { return false }
}

export function getFamilyRecords<T extends FamilyRecord>(category: FamilyRepositoryCategory, fallback: () => T[] = () => []): T[] {
  if (typeof localStorage === 'undefined') return fallback()
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CATALOGS[category].key) ?? 'null')
    if (!Array.isArray(value)) return fallback()
    return value as T[]
  } catch { return fallback() }
}

export function getFamilyRecord<T extends FamilyRecord>(category: FamilyRepositoryCategory, id: string, fallback?: () => T[]): T | undefined {
  return getFamilyRecords<T>(category, fallback).find((family) => family.id === id)
}

export function saveFamilyRecords<T extends FamilyRecord>(category: FamilyRepositoryCategory, records: T[]): boolean {
  try {
    localStorage.setItem(CATALOGS[category].key, JSON.stringify(records))
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(CATALOGS[category].event))
    return true
  } catch { return false }
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
  const eventName = CATALOGS[category].event
  window.addEventListener(eventName, listener)
  const onStorage = (event: StorageEvent) => { if (event.key === CATALOGS[category].key) listener() }
  window.addEventListener('storage', onStorage)
  return () => { window.removeEventListener(eventName, listener); window.removeEventListener('storage', onStorage) }
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
