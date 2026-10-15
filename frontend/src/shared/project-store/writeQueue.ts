import type { z } from 'zod'
import { ApiError } from '../api/http'
import { putSection as defaultPutSection, SectionEnvelopeError, type ProjectApi } from './projectApi'
import { parseProjectData, type WireMappingError } from './projectDataValidation'
import type { ProjectSession, SaveStatus } from './projectSession'

/**
 * Serial, coalescing write queue of one open project (K4).
 * - One request in flight at a time; `expectedRevision` is the session revision at send time and is chained from every 200.
 * - Entries are coalesced per key (= section path): an unsent entry takes the newest wire and keeps its queue position.
 * - Sending starts `debounceMs` after the last `enqueue` (trailing debounce).
 * - 409 -> `conflict`; 400/422 or a local rejection -> `rejected`; network failure, 404, 5xx and an invalid 200 envelope -> `error`.
 *   In all three the queue stops; there is no automatic retry or merge. New writes are still collected, but not sent.
 * - Held failures: a stalled queue keeps EVERY failure it saw (one per key, a newer failure of the same key replaces the older one in
 *   place), in arrival order. The one shown in the session is the `conflict` if there is one (a 409 is sticky: `drop` never clears it and
 *   `retry` keeps rejecting), otherwise the oldest held failure. `drop(key)` removes only the non-conflict failures of that key: the queue
 *   resumes only when no failure is left, so a masked failure (e.g. a network error behind a local rejection) is never retried silently.
 *   `retry`, `discard` and `reset` clear all held failures.
 * - There is at most one entry per key (a failed in-flight entry never comes back next to a newer write of the same key).
 * - `discard()` reverts the mirror of the entry in flight as well (its `onDiscarded` is called); the request itself cannot be cancelled.
 *   If it then fails, the mirror already equals the confirmed value and the entry is not requeued; if it succeeds, `onConfirmed` adopts the
 *   server value. A later 409 still stops the queue as a conflict. A network failure after a discard leaves the outcome on the server
 *   unknown (it may have been committed); the next load shows it.
 * - The queue is bound to the session `epoch` (every `begin`/`end`, also of the same project id): on a change it resets itself (no
 *   callbacks) and responses still in flight are ignored. Writes made by an earlier session listener during `begin` first reset the
 *   old epoch, so subscription order does not drop them. `dispose()` unsubscribes.
 * - `onHeldWrite(listener)`: called for every `enqueue` that is only collected because the queue is stalled, and for every
 *   `reportLocalRejection` on an already stalled queue (also when the snapshot does not change, e.g. a newer value of an already pending
 *   key), so the UI can remind the user that the edit is not being sent.
 * - A throwing `onConfirmed`/`onDiscarded` (e.g. a failing UI listener) is caught and logged with `console.error`; the queue goes on.
 */
export const SAVE_DEBOUNCE_MS = 300

export type QueuedWrite = {
  /** Coalescing key = section path (e.g. `families/piers`, `graphs/<id>`). */
  key: string
  path: string
  /** JSON value to send; `null` clears the section. */
  wire: unknown
  /** Validates the `value` of the 200 response. */
  valueSchema: z.ZodTypeAny
  onConfirmed(serverWire: unknown, sentWire: unknown): void
  onDiscarded(): void
}

export type WriteQueueOptions = { session: ProjectSession; putSection?: ProjectApi['putSection']; debounceMs?: number }

export interface WriteQueue {
  enqueue(write: QueuedWrite): void
  /** A frontend value cannot be sent: status `rejected`, the queue stops, no request is made. */
  reportLocalRejection(key: string, error: WireMappingError): void
  flush(): Promise<void>
  retry(): Promise<void>
  /** Drops every unsent entry and reverts the entry in flight (calling `onDiscarded`, in-flight first, then queue order) before publishing status. Clears held failures; a later 409 reports `conflict` and the dropped request is not requeued. */
  discard(): void
  /** Drops the unsent entry of one key without callback (the caller reverts its own mirror); an in-flight request of that key is not requeued if it fails. */
  drop(key: string): void
  /** Drops everything without callbacks; a response still in flight is ignored. */
  reset(): void
  /** Resets, then stops observing the session. A disposed queue no longer touches the session and `enqueue` throws. */
  dispose(): void
  pendingKeys(): string[]
  /** Calls `listener` for every `enqueue` accepted while the queue is stalled (collected, not sent). Returns the unsubscribe function. */
  onHeldWrite(listener: () => void): () => void
}

export function createWriteQueue(options: WriteQueueOptions): WriteQueue {
  const { session } = options
  const send = options.putSection ?? defaultPutSection
  const debounceMs = options.debounceMs ?? SAVE_DEBOUNCE_MS
  let pending: QueuedWrite[] = []
  let inFlight: QueuedWrite | null = null
  let flight: Promise<void> = Promise.resolve()
  let timer: ReturnType<typeof setTimeout> | null = null
  let generation = 0
  let inFlightDropped = false
  let disposed = false
  let boundEpoch = session.getSnapshot().epoch
  const heldListeners = new Set<() => void>()
  let failures: { key: string | null; error: unknown; status: SaveStatus }[] = []

  const stalled = () => failures.length > 0
  const shown = () => failures.find((held) => held.status === 'conflict') ?? failures[0] ?? null
  const count = () => pending.length + (inFlight ? 1 : 0)
  const clearTimer = () => { if (timer !== null) { clearTimeout(timer); timer = null } }
  function guard(fn: () => void) {
    try { fn() } catch (error) { console.error('Write queue: a listener threw', error) }
  }
  function publish() {
    if (disposed) return
    const failure = shown()
    if (failure) session.update({ status: failure.status, pendingCount: count(), failedKey: failure.key, lastError: failure.error })
    else session.update({ status: count() > 0 ? 'saving' : 'idle', pendingCount: count(), failedKey: null, lastError: null })
  }
  function statusOf(error: unknown): SaveStatus {
    if (error instanceof ApiError && error.status === 409) return 'conflict'
    if (error instanceof ApiError && (error.status === 400 || error.status === 422)) return 'rejected'
    return 'error'
  }
  function stall(key: string | null, error: unknown, status: SaveStatus = statusOf(error)) {
    const index = failures.findIndex((held) => held.key === key)
    if (index < 0) failures.push({ key, error, status })
    else if (failures[index].status !== 'conflict' || status === 'conflict') failures[index] = { key, error, status }
    clearTimer(); publish()
  }
  function unstall() { failures = [] }
  function syncEpoch() {
    const epoch = session.getSnapshot().epoch
    if (epoch !== boundEpoch) { boundEpoch = epoch; queue.reset() }
  }

  function startNext() {
    if (inFlight || stalled() || pending.length === 0) return
    const snapshot = session.getSnapshot()
    if (snapshot.projectId === null || snapshot.revision === null) { stall(pending[0].key, new Error('No active project')); return }
    const entry = pending.shift() as QueuedWrite
    inFlight = entry; inFlightDropped = false
    const myGeneration = generation
    const sentEpoch = snapshot.epoch
    const stale = () => myGeneration !== generation || session.getSnapshot().epoch !== sentEpoch
    publish()
    flight = send(snapshot.projectId, entry.path, snapshot.revision, entry.wire).then(
      (envelope) => {
        if (stale()) return
        guard(() => session.setRevision(envelope.revision))
        inFlight = null
        let validationError: unknown = null
        let serverWire: unknown = envelope.value
        try { serverWire = parseProjectData(entry.valueSchema, envelope.value, 'value') } catch (error) { validationError = error }
        if (validationError) {
          // The server did write (revision moved). The stored value equals the sent one by contract; show the drift as an error.
          guard(() => entry.onConfirmed(entry.wire, entry.wire))
          stall(entry.key, validationError)
          return
        }
        guard(() => entry.onConfirmed(serverWire, entry.wire))
        if (stalled()) { publish(); return }
        publish()
        if (timer === null) startNext()
      },
      (error: unknown) => {
        if (stale()) return
        inFlight = null
        if (error instanceof SectionEnvelopeError) {
          // An unreadable 200 envelope always ends in `error`, also for an entry dropped/discarded in flight (the outcome is unknown, flush rejects).
          if (error.revision !== null) {
            // The server answered 200 (the write is committed) but the envelope is not the known shape: apply its revision so a retry does not hit a 409.
            const revision = error.revision
            guard(() => session.setRevision(revision))
            guard(() => entry.onConfirmed(entry.wire, entry.wire))
            stall(entry.key, error)
            return
          }
          if (inFlightDropped) { stall(entry.key, error); return }
        } else if (inFlightDropped) {
          if (statusOf(error) === 'conflict') { stall(entry.key, error); return }
          // Discarded while in flight and it failed: the mirror was already reverted.
          publish()
          if (!stalled() && pending.length > 0 && timer === null) startNext()
          return
        }
        const newer = pending.findIndex((other) => other.key === entry.key)
        if (newer >= 0) pending.unshift(...pending.splice(newer, 1)); else pending.unshift(entry)
        stall(entry.key, error)
      },
    )
  }

  function flush(): Promise<void> {
    return (async () => {
      clearTimer()
      for (;;) {
        if (stalled()) throw shown()?.error
        if (!inFlight && pending.length === 0) return
        if (!inFlight) startNext()
        await flight
      }
    })()
  }

  const queue: WriteQueue = {
    enqueue(write) {
      if (disposed) throw new Error('Write queue disposed')
      syncEpoch()
      if (session.getSnapshot().projectId === null) throw new Error('No active project')
      const index = pending.findIndex((entry) => entry.key === write.key)
      if (index >= 0) { pending[index] = write; pending = pending.filter((entry, i) => i === index || entry.key !== write.key) } else pending.push(write)
      if (stalled()) { publish(); for (const listener of [...heldListeners]) guard(listener); return }
      publish()
      clearTimer()
      timer = setTimeout(() => { timer = null; startNext() }, debounceMs)
    },
    reportLocalRejection(key, error) {
      syncEpoch()
      const wasStalled = stalled()
      stall(key, error, 'rejected')
      if (wasStalled) for (const listener of [...heldListeners]) guard(listener)
    },
    flush,
    async retry() {
      if (!stalled()) return
      const failure = shown()
      if (failure?.status === 'conflict') throw failure.error
      unstall(); publish()
      await flush()
    },
    drop(key) {
      pending = pending.filter((entry) => entry.key !== key)
      if (inFlight?.key === key) inFlightDropped = true
      failures = failures.filter((held) => held.key !== key || held.status === 'conflict')
      publish()
      if (!stalled() && pending.length > 0 && timer === null) timer = setTimeout(() => { timer = null; startNext() }, debounceMs)
    },
    discard() {
      clearTimer()
      const dropped = pending; pending = []
      const reverted = inFlight && !inFlightDropped ? inFlight : null
      if (inFlight) inFlightDropped = true
      unstall()
      if (reverted) guard(() => reverted.onDiscarded())
      for (const entry of dropped) guard(() => entry.onDiscarded())
      publish()
    },
    reset() {
      generation += 1; clearTimer(); pending = []; inFlight = null; inFlightDropped = false; unstall(); publish()
    },
    dispose() {
      if (disposed) return
      queue.reset(); disposed = true; heldListeners.clear(); unsubscribe()
    },
    pendingKeys() { return [...(inFlight ? [inFlight.key] : []), ...pending.map((entry) => entry.key)] },
    onHeldWrite(listener) {
      heldListeners.add(listener)
      return () => { heldListeners.delete(listener) }
    },
  }
  const unsubscribe = session.subscribe(syncEpoch)
  return queue
}
