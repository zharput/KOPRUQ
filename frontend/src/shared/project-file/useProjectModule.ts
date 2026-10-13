import { useCallback, useSyncExternalStore } from 'react'
import { PROJECT_MODULE_CHANGED_EVENT, type ProjectModule } from './projectModuleStore'

const caches = new Map<string, { raw: string | null; value: unknown }>()

function snapshot<T>(module: ProjectModule<T>): T | undefined {
  let raw: string | null = null
  try { raw = localStorage.getItem(module.key) } catch { return undefined }
  const cached = caches.get(module.id)
  if (cached && cached.raw === raw) return cached.value as T | undefined
  const value = module.read()
  caches.set(module.id, { raw, value })
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
export function useProjectModule<T>(module: ProjectModule<T>, fallback: NoInfer<NonNullable<T>>) {
  type V = NonNullable<T>
  const stored = useSyncExternalStore(subscribe, () => snapshot(module)) as V | undefined
  const value = stored ?? fallback
  const set = useCallback((update: V | ((previous: V) => V)) => {
    const current = (snapshot(module) as V | undefined) ?? fallback
    const next = typeof update === 'function' ? (update as (previous: V) => V)(current) : update
    module.write(next as T)
  }, [module, fallback])
  return [value, set] as const
}
