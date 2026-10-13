import type { z } from 'zod'
import { PROJECT_DATA_CHANGED_EVENT } from './projectDataEvents'

/**
 * Generic, domain-independent localStorage-backed project module. Every module has a
 * zod schema (`parse` throws when the value is invalid) and tolerant `read` (corrupt or
 * invalid storage -> undefined). `write` and `reset` emit `kopruq:project-data-changed`
 * (dirty tracking) and `kopruq:project-module-changed` (subscribers such as `useProjectModule`).
 */
export const PROJECT_MODULE_CHANGED_EVENT = 'kopruq:project-module-changed'

export type ProjectModule<T> = {
  id: string
  key: string
  parse(value: unknown): T
  read(): T | undefined
  write(value: T): boolean
  reset(): void
}

function emit(id: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PROJECT_MODULE_CHANGED_EVENT, { detail: { id } }))
  window.dispatchEvent(new CustomEvent(PROJECT_DATA_CHANGED_EVENT, { detail: { source: 'module', id } }))
}

export function createProjectModule<S extends z.ZodTypeAny>(id: string, key: string, schema: S, custom?: { write?: (value: z.infer<S>) => boolean; reset?: () => boolean }): ProjectModule<z.infer<S>> {
  type T = z.infer<S>
  const parse = (value: unknown): T => schema.parse(value)
  const read = (): T | undefined => {
    try {
      const raw = localStorage.getItem(key)
      if (raw == null) return undefined
      const result = schema.safeParse(JSON.parse(raw))
      return result.success ? result.data : undefined
    } catch { return undefined }
  }
  const write = (value: T): boolean => {
    try {
      const text = JSON.stringify(value)
      if (localStorage.getItem(key) === text) return true
      if (custom?.write) { if (!custom.write(value)) return false } else localStorage.setItem(key, text)
    } catch { return false }
    emit(id)
    return true
  }
  const reset = () => {
    try {
      if (custom?.reset) { if (!custom.reset()) return } else { if (localStorage.getItem(key) == null) return; localStorage.removeItem(key) }
    } catch { return }
    emit(id)
  }
  return { id, key, parse, read, write, reset }
}
