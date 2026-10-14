import { useCallback, useSyncExternalStore } from 'react'
import type { ProjectModule } from './projectModuleStore'

/** The stored value of a project module, `undefined` while the section has none (no fallback applied). */
export function useProjectModuleValue<T>(module: ProjectModule<T>): T | undefined {
  return useSyncExternalStore(module.subscribe, module.read)
}

/**
 * Reads and writes a project module (a server section, saved to the backend by the write queue).
 * `fallback` must be a stable reference (module-level constant) so snapshots stay referentially stable.
 */
export function useProjectModule<T>(module: ProjectModule<T>, fallback: NoInfer<NonNullable<T>>) {
  type V = NonNullable<T>
  const stored = useProjectModuleValue(module) as V | undefined
  const value = stored ?? fallback
  const set = useCallback((update: V | ((previous: V) => V)) => {
    const current = (module.read() as V | undefined) ?? fallback
    const next = typeof update === 'function' ? (update as (previous: V) => V)(current) : update
    module.write(next as T)
  }, [module, fallback])
  return [value, set] as const
}
