import type { ServerSection } from '../project-store/serverSection'

/**
 * A project module is a thin, domain-independent view of one server section (BACKEND-DB-PERSISTENCE M5c): the value lives in the
 * section's in-memory mirror and is saved to the server through the write queue. Nothing is stored in the browser.
 * `read` is synchronous; `write` reports whether the value was accepted (false: no open project or the value cannot be sent).
 */
export type ProjectModule<T> = {
  id: string
  read(): T | undefined
  write(value: T): boolean
  /** Clears the section (`write(undefined)`); sections that cannot be cleared end up `rejected`. */
  reset(): void
  subscribe(listener: () => void): () => void
}

export function createProjectModule<T>(section: ServerSection<T>): ProjectModule<T> {
  return {
    id: section.id,
    read: () => section.read(),
    write: (value) => section.write(value),
    reset: () => { section.write(undefined) },
    subscribe: (listener) => section.subscribe(listener),
  }
}
