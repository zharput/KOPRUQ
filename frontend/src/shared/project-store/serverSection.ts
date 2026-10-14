import type { z } from 'zod'
import { WireMappingError } from './projectDataValidation'
import type { ProjectSession } from './projectSession'
import type { WriteQueue } from './writeQueue'

/**
 * Synchronous mirror of one server section. `read()` returns the current frontend value at once; `write()` maps it to
 * the wire value, updates the mirror immediately and hands the wire value to the write queue. Every section keeps two
 * values: `confirmed` (the last value the server acknowledged) and `current` (what the user sees). Nothing here is
 * persisted anywhere; the mirror lives in memory.
 */
export type SectionCodec<T, W> = {
  /** Validates the value the backend returns for the section (null included). Strict. */
  schema: z.ZodType<W | null, z.ZodTypeDef, unknown>
  /** Does the PUT accept `value: null` (clears the section)? */
  clearable: boolean
  /** Pure. Returns null only for a clearable codec (e.g. the empty girder library). Throws WireMappingError for an unrepresentable value. */
  toWire(value: T): W | null
  fromWire(wire: W | null): T | undefined
}
export type SectionDefinition<T, W> = { id: string; path: string; codec: SectionCodec<T, W> }

export interface ServerSection<T> {
  readonly id: string
  readonly path: string
  read(): T | undefined
  /** false: no active project | the value cannot be represented (status `rejected`) | `undefined` for a section that cannot be cleared (status `rejected`). */
  write(next: T | undefined): boolean
  /** Sets confirmed and current to a value loaded from the server. No request, notifies. */
  hydrate(value: T | undefined): void
  /** Drops the unsent entry and reverts the mirror unless a session listener writes a newer value during the drop. An in-flight request is reconciled when answered. */
  discard(): void
  subscribe(listener: () => void): () => void
}

export type SectionDeps = { queue: WriteQueue; session: ProjectSession }
type Mirror<T, W> = { wire: W | null; value: T | undefined }

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

function createListeners() {
  const listeners = new Set<() => void>()
  return {
    notify() {
      for (const listener of [...listeners]) {
        try { listener() } catch (error) { console.error('Server section: a listener threw', error) }
      }
    },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
  }
}

export function createServerSection<T, W>(definition: SectionDefinition<T, W>, deps: SectionDeps): ServerSection<T> {
  const { codec, path } = definition
  const { notify, subscribe } = createListeners()
  let confirmed: Mirror<T, W> = { wire: null, value: undefined }
  let current: Mirror<T, W> = confirmed

  const confirm = (server: W | null, sent: unknown) => {
    // No newer local edit: the mirror still holds the sent value, or it was reverted (discarded) while the request was in flight.
    if (same(current.wire, sent) || current === confirmed) {
      if (same(current.wire, sent) && same(server, sent)) { confirmed = current; return }
      current = confirmed = { wire: server, value: codec.fromWire(server) }
      notify()
    } else confirmed = { wire: server, value: codec.fromWire(server) }
  }
  const revert = () => {
    if (current === confirmed) return
    current = confirmed; notify()
  }
  const discard = () => {
    const before = current
    deps.queue.drop(path)
    if (current === before) revert()
  }

  return {
    id: definition.id,
    path,
    read: () => current.value,
    write(next) {
      if (deps.session.getSnapshot().projectId === null) return false
      let wire: W | null
      try {
        if (next === undefined) {
          if (!codec.clearable) throw new WireMappingError('', 'this section cannot be cleared')
          wire = null
        } else wire = codec.toWire(next)
      } catch (error) {
        if (error instanceof WireMappingError) { deps.queue.reportLocalRejection(path, error); return false }
        throw error
      }
      if (same(wire, current.wire)) return true
      const before = current
      const updated = { wire, value: next }
      current = updated
      try {
        deps.queue.enqueue({ key: path, path, wire, valueSchema: codec.schema, onConfirmed: (server, sent) => confirm(server as W | null, sent), onDiscarded: () => { if (current === updated) revert() } })
      } catch (error) {
        if (current === updated) current = before
        throw error
      }
      notify()
      return true
    },
    hydrate(value) {
      confirmed = current = { wire: value === undefined ? null : codec.toWire(value), value }
      notify()
    },
    discard,
    subscribe,
  }
}

/** A set of server documents of one kind, one PUT per item (graphs). Items cannot be removed. */
export type CollectionCodec<T, W> = {
  schema: z.ZodType<W, z.ZodTypeDef, unknown>
  idOf(item: T): string
  toWire(item: T): W
  fromWire(wire: W): T
}
export type CollectionDefinition<T, W> = { id: string; pathOf(itemId: string): string; codec: CollectionCodec<T, W> }

export interface ServerSectionCollection<T> {
  list(): readonly T[]
  get(id: string): T | undefined
  /** Enqueues a PUT only for added or changed items. A removed item or an unrepresentable one is rejected (status `rejected`, returns false, mirror unchanged). */
  write(next: readonly T[]): boolean
  hydrate(items: readonly T[]): void
  /** Reverts changed items, removes unconfirmed items and clears this collection's local rejections; preserves newer writes made during the drop. */
  discard(): void
  subscribe(listener: () => void): () => void
}

export function createServerSectionCollection<T, W>(definition: CollectionDefinition<T, W>, deps: SectionDeps): ServerSectionCollection<T> {
  const { codec } = definition
  const { notify, subscribe } = createListeners()
  type Entry = { wire: W; item: T }
  let confirmed = new Map<string, Entry>()
  let current = new Map<string, Entry>()
  let listed: readonly T[] = []
  const rejectedKeys = new Set<string>()
  const refresh = () => { listed = [...current.values()].map((entry) => entry.item) }

  const confirm = (id: string, server: W, sent: unknown) => {
    const now = current.get(id)
    // No newer local edit: the item still holds the sent value, or it was reverted/removed (discarded) while the request was in flight.
    if (!now || same(now.wire, sent) || now === confirmed.get(id)) {
      if (now && same(now.wire, sent) && same(server, sent)) { confirmed.set(id, now); return }
      const entry = { wire: server, item: codec.fromWire(server) }
      current.set(id, entry); confirmed.set(id, entry); refresh(); notify()
    } else confirmed.set(id, { wire: server, item: codec.fromWire(server) })
  }
  const discardItem = (id: string) => {
    const was = confirmed.get(id)
    if (was) { if (current.get(id) === was) return; current.set(id, was) } else if (!current.delete(id)) return
    refresh(); notify()
  }

  return {
    list: () => listed,
    get: (id) => current.get(id)?.item,
    write(next) {
      if (deps.session.getSnapshot().projectId === null) return false
      const ids = new Set<string>()
      const wires: { id: string; item: T; wire: W }[] = []
      let failedKey = ''
      try {
        for (const [index, item] of next.entries()) {
          failedKey = `${definition.id}[${index}]` // sentinel while `idOf` itself can still throw
          const id = codec.idOf(item); failedKey = definition.pathOf(id)
          if (ids.has(id)) throw new WireMappingError(id, 'duplicate id')
          ids.add(id)
          wires.push({ id, item, wire: codec.toWire(item) })
        }
        for (const id of current.keys()) if (!ids.has(id)) { failedKey = definition.pathOf(id); throw new WireMappingError(id, 'cannot be deleted') }
      } catch (error) {
        if (error instanceof WireMappingError) { rejectedKeys.add(failedKey); deps.queue.reportLocalRejection(failedKey, error); return false }
        throw error
      }
      const changed = wires.filter(({ id, wire }) => !current.has(id) || !same(current.get(id)?.wire, wire))
      if (changed.length === 0) return true
      const before = new Map(current)
      const beforeListed = listed
      for (const { id, item, wire } of changed) current.set(id, { wire, item })
      refresh()
      try {
        for (const { id, wire } of changed) {
          const updated = current.get(id)
          if (!updated || !same(updated.wire, wire)) continue
          const itemPath = definition.pathOf(id)
          deps.queue.enqueue({ key: itemPath, path: itemPath, wire, valueSchema: codec.schema, onConfirmed: (server, sent) => confirm(id, server as W, sent), onDiscarded: () => { if (current.get(id) === updated) discardItem(id) } })
        }
      } catch (error) {
        current = before; listed = beforeListed
        throw error
      }
      notify()
      return true
    },
    hydrate(items) {
      const map = new Map<string, Entry>()
      for (const item of items) map.set(codec.idOf(item), { wire: codec.toWire(item), item })
      confirmed = map; current = new Map(map); refresh()
      const rejected = [...rejectedKeys]; rejectedKeys.clear()
      for (const key of rejected) deps.queue.drop(key)
      notify()
    },
    discard() {
      const entries = new Map(current)
      const ids = [...new Set([...current.keys(), ...confirmed.keys()])]
      const rejected = [...rejectedKeys]; rejectedKeys.clear()
      for (const key of rejected) deps.queue.drop(key)
      for (const id of ids) {
        const before = entries.get(id)
        if (current.get(id) !== before) continue
        deps.queue.drop(definition.pathOf(id))
        if (current.get(id) === before) discardItem(id)
      }
    },
    subscribe,
  }
}
