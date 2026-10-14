import { useCallback, useSyncExternalStore, type SetStateAction } from 'react'
import { FAMILY_SERVER_SECTIONS } from '../model/familyServerSections'
import { saveFamilyRecords, type FamilyRecord, type FamilyRepositoryCategory } from '../model/familyRepository'

// Catalogs the project never wrote show their fallback records (computed once per category, stable reference) and are NOT written
// back: a family is saved only when the user edits the catalog.
const fallbackCache = new Map<FamilyRepositoryCategory, FamilyRecord[]>()
const EMPTY_FAMILIES = () => [] as FamilyRecord[]

function snapshot<T extends FamilyRecord>(category: FamilyRepositoryCategory, fallback: () => T[]): T[] {
  const stored = FAMILY_SERVER_SECTIONS[category].read()
  if (stored !== undefined) return stored as unknown as T[]
  let cached = fallbackCache.get(category)
  if (!cached) { cached = fallback(); fallbackCache.set(category, cached) }
  return cached as T[]
}

/** Shared catalog snapshot; component state is limited to selection and UI drafts. */
export function useFamilyCatalog<T extends FamilyRecord>(category: FamilyRepositoryCategory, fallback: () => T[] = EMPTY_FAMILIES as () => T[]): [T[], (next: SetStateAction<T[]>) => void] {
  const getSnapshot = useCallback(() => snapshot(category, fallback), [category, fallback])
  const families = useSyncExternalStore((listener) => FAMILY_SERVER_SECTIONS[category].subscribe(listener), getSnapshot, getSnapshot)
  const setFamilies = useCallback((next: SetStateAction<T[]>) => {
    const current = snapshot(category, fallback)
    const updated = typeof next === 'function' ? next(current) : next
    saveFamilyRecords(category, updated)
  }, [category, fallback])
  return [families, setFamilies]
}
