import { useCallback, useSyncExternalStore } from 'react'
import { PROJECT_MODULES, PROJECT_MODULE_CHANGED_EVENT, type ProjectModule, type ProjectModuleId, type ProjectModuleValue } from './projectModules'

const caches = new Map<string, { raw: string | null; value: unknown }>()

function snapshot(id: ProjectModuleId): unknown {
  const module = PROJECT_MODULES[id] as ProjectModule<unknown>
  let raw: string | null = null
  try { raw = localStorage.getItem(module.key) } catch { return undefined }
  const cached = caches.get(id)
  if (cached && cached.raw === raw) return cached.value
  const value = module.read()
  caches.set(id, { raw, value })
  return value
}

function subscribe(listener: () => void) {
  window.addEventListener(PROJECT_MODULE_CHANGED_EVENT, listener)
  window.addEventListener('storage', listener)
  return () => { window.removeEventListener(PROJECT_MODULE_CHANGED_EVENT, listener); window.removeEventListener('storage', listener) }
}

/**
 * Reads and writes a project module (localStorage-backed, saved in the .kopruq file).
 * `fallback` must be a stable reference (module-level constant) so snapshots stay referentially stable.
 */
export function useProjectModule<K extends ProjectModuleId>(id: K, fallback: ProjectModuleValue<K>) {
  type T = ProjectModuleValue<K>
  const stored = useSyncExternalStore(subscribe, () => snapshot(id)) as T | undefined
  const value = stored ?? fallback
  const set = useCallback((update: T | ((previous: T) => T)) => {
    const current = (snapshot(id) as T | undefined) ?? fallback
    const next = typeof update === 'function' ? (update as (previous: T) => T)(current) : update
    ;(PROJECT_MODULES[id] as ProjectModule<unknown>).write(next)
  }, [id, fallback])
  return [value, set] as const
}
