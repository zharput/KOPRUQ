/**
 * Observable state of the currently open server project: id, last known revision and the save status.
 * `getSnapshot` returns the same reference until something changes (usable with `useSyncExternalStore`).
 */
export type SaveStatus = 'idle' | 'saving' | 'error' | 'rejected' | 'conflict'
export type ProjectSessionSnapshot = Readonly<{
  /** Monotonic counter, incremented by every `begin` and `end` (also for the same project id). A write queue compares it to detect a re-begin. */
  epoch: number
  projectId: string | null
  revision: number | null
  status: SaveStatus
  pendingCount: number
  failedKey: string | null
  /** ApiError | ProjectDataValidationError | WireMappingError | Error | null */
  lastError: unknown
}>

export interface ProjectSession {
  getSnapshot(): ProjectSessionSnapshot
  subscribe(listener: () => void): () => void
  /** Opens a project. Increments `epoch`: a write queue observing this session resets itself on every `begin`/`end`, also when the same project id is begun again (see writeQueue). */
  begin(projectId: string, revision: number): void
  end(): void
  setRevision(revision: number): void
  /** Used by the write queue. */
  update(patch: Partial<Pick<ProjectSessionSnapshot, 'status' | 'pendingCount' | 'failedKey' | 'lastError'>>): void
}

const CLEAN: ProjectSessionSnapshot = { epoch: 0, projectId: null, revision: null, status: 'idle', pendingCount: 0, failedKey: null, lastError: null }

export function createProjectSession(): ProjectSession {
  let snapshot: ProjectSessionSnapshot = CLEAN
  let epoch = 0
  const listeners = new Set<() => void>()
  const set = (next: ProjectSessionSnapshot) => {
    if ((Object.keys(next) as (keyof ProjectSessionSnapshot)[]).every((key) => Object.is(next[key], snapshot[key]))) return
    snapshot = next
    for (const listener of [...listeners]) {
      try { listener() } catch (error) { console.error('Project session: a listener threw', error) }
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener) } },
    begin(projectId, revision) { epoch += 1; set({ ...CLEAN, epoch, projectId, revision }) },
    end() { epoch += 1; set({ ...CLEAN, epoch }) },
    setRevision(revision) { set({ ...snapshot, revision }) },
    update(patch) { set({ ...snapshot, ...patch }) },
  }
}
