import { projectApi, type ProjectApi } from './projectApi'
import { createProjectSession, type ProjectSession } from './projectSession'
import {
  createServerSection, createServerSectionCollection,
  type CollectionDefinition, type SectionDeps, type SectionDefinition, type ServerSection, type ServerSectionCollection,
} from './serverSection'
import { createWriteQueue, type WriteQueue } from './writeQueue'

/**
 * The one open-project session of the application (BACKEND-DB-PERSISTENCE M5b): a single session, a single write queue and a registry
 * of every server section / collection instance created through `createActiveSection` / `createActiveCollection`.
 *
 * Creation order is part of the contract: 1) the session, 2) the write queue (it subscribes to the session first and therefore resets
 * itself before any project-switch listener runs), 3) the project-switch subscription at the end of this module.
 * Nothing here is ever disposed and there is no test-reset hook: tests reset through the public API (see src/test/projectSessionTestUtils.ts).
 */
export const activeProjectSession: ProjectSession = createProjectSession()

let currentApi: ProjectApi = projectApi
export function activeProjectApi(): ProjectApi { return currentApi }
/** Replaces the API used by the write queue and the session layer (also in the middle of a session). Returns the previous API. */
export function setActiveProjectApi(next: ProjectApi): ProjectApi {
  const previous = currentApi
  currentApi = next
  return previous
}

// The queue captures its `putSection` once at creation; the indirection makes `setActiveProjectApi` effective for later PUTs.
export const activeWriteQueue: WriteQueue = createWriteQueue({ session: activeProjectSession, putSection: (...args) => currentApi.putSection(...args) })

export const ACTIVE_PROJECT: SectionDeps = { queue: activeWriteQueue, session: activeProjectSession }

export type ActiveSectionEntry = Readonly<
  | { kind: 'section'; id: string; path: string; hydrateEmpty(): void }
  | { kind: 'collection'; id: string; hydrateEmpty(): void }>

const registry = new Map<string, ActiveSectionEntry>()

/** Creates (and registers) the server section instance of a definition. Registering an id again replaces the entry. */
export function createActiveSection<T, W>(definition: SectionDefinition<T, W>): ServerSection<T> {
  const section = createServerSection(definition, ACTIVE_PROJECT)
  registry.set(definition.id, { kind: 'section', id: definition.id, path: definition.path, hydrateEmpty: () => section.hydrate(undefined) })
  return section
}
export function createActiveCollection<T, W>(definition: CollectionDefinition<T, W>): ServerSectionCollection<T> {
  const collection = createServerSectionCollection(definition, ACTIVE_PROJECT)
  registry.set(definition.id, { kind: 'collection', id: definition.id, hydrateEmpty: () => collection.hydrate([]) })
  return collection
}
/** Registered sections and collections in registration order. */
export function activeSections(): readonly ActiveSectionEntry[] { return [...registry.values()] }

const switchListeners = new Set<() => void>()
/**
 * Calls `listener` exactly once for every `begin` and every `end` of the active session (also when the same project id is begun again),
 * never for `setRevision`/`update`. The listener runs synchronously inside `begin`/`end`, AFTER the write queue has reset itself and
 * BEFORE the sections are hydrated: it may only reset in-memory state. It must not read or write sections, and must not call `begin`,
 * `end` or `reset`. A throwing listener is logged and does not stop the others. Returns the unsubscribe function.
 */
export function onProjectSwitch(listener: () => void): () => void {
  switchListeners.add(listener)
  return () => { switchListeners.delete(listener) }
}

let lastEpoch = activeProjectSession.getSnapshot().epoch
activeProjectSession.subscribe(() => {
  const epoch = activeProjectSession.getSnapshot().epoch
  if (epoch === lastEpoch) return
  lastEpoch = epoch
  for (const listener of [...switchListeners]) {
    try { listener() } catch (error) { console.error('Active project: a project-switch listener threw', error) }
  }
})
