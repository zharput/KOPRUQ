import { useCallback, useSyncExternalStore, type SetStateAction } from 'react'
import { getFamilyRecords, saveFamilyRecords, subscribeFamilyRecords, type FamilyRecord, type FamilyRepositoryCategory } from '../model/familyRepository'

const snapshots = new Map<FamilyRepositoryCategory, FamilyRecord[]>()
const listeners = new Map<FamilyRepositoryCategory, Set<() => void>>()
const detach = new Map<FamilyRepositoryCategory, () => void>()
const fallbacks = new Map<FamilyRepositoryCategory, () => FamilyRecord[]>()
const EMPTY_FAMILIES = () => [] as FamilyRecord[]

function snapshot<T extends FamilyRecord>(category: FamilyRepositoryCategory, fallback: () => T[]): T[] {
  if (!snapshots.has(category)) {
    fallbacks.set(category, fallback)
    const initial = getFamilyRecords(category, fallback)
    snapshots.set(category, initial)
    if (typeof localStorage !== 'undefined' && localStorage.getItem(storageKey(category)) == null) saveFamilyRecords(category, initial)
  }
  return snapshots.get(category) as T[]
}
function emit(category: FamilyRepositoryCategory) {
  snapshots.set(category, getFamilyRecords(category, fallbacks.get(category)))
  listeners.get(category)?.forEach((listener) => listener())
}
function subscribe(category: FamilyRepositoryCategory, listener: () => void) {
  // Re-read at the consumer boundary so browser storage restored/cleared by another
  // same-document workflow is visible even before a repository write occurs.
  const current = snapshots.get(category) ?? []
  const refreshed = getFamilyRecords(category, fallbacks.get(category))
  if (JSON.stringify(current) !== JSON.stringify(refreshed)) snapshots.set(category, refreshed)
  if (typeof localStorage !== 'undefined' && localStorage.getItem(storageKey(category)) == null) saveFamilyRecords(category, refreshed)
  const group = listeners.get(category) ?? new Set<() => void>()
  group.add(listener); listeners.set(category, group)
  if (!detach.has(category)) detach.set(category, subscribeFamilyRecords(category, () => emit(category)))
  return () => {
    group.delete(listener)
    if (!group.size) { detach.get(category)?.(); detach.delete(category); listeners.delete(category) }
  }
}

/** Shared catalog snapshot; component state is limited to selection and UI drafts. */
export function useFamilyCatalog<T extends FamilyRecord>(category: FamilyRepositoryCategory, fallback: () => T[] = EMPTY_FAMILIES as () => T[]): [T[], (next: SetStateAction<T[]>) => void] {
  const getSnapshot = useCallback(() => snapshot(category, fallback), [category, fallback])
  const families = useSyncExternalStore((listener) => subscribe(category, listener), getSnapshot, getSnapshot)
  const setFamilies = useCallback((next: SetStateAction<T[]>) => {
    const current = snapshot(category, fallback)
    const updated = typeof next === 'function' ? next(current) : next
    if (!saveFamilyRecords(category, updated)) return
    snapshots.set(category, updated)
    listeners.get(category)?.forEach((listener) => listener())
  }, [category, fallback])
  return [families, setFamilies]
}

function storageKey(category: FamilyRepositoryCategory): string {
  return ({ PIER: 'kopruq.project-design-system.pier-families', PIER_CAP: 'kopruq.project-design-system.pier-cap-families', FOUNDATION: 'kopruq.project-design-system.foundation-families', BEARING: 'kopruq.project-design-system.bearing-families', MATERIAL: 'kopruq.project-design-system.material-assignments' })[category]
}
