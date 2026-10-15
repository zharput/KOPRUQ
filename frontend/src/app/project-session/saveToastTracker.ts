import type { ProjectSessionSnapshot, SaveStatus } from '../../shared/project-store/projectSession'

/** How long a save toast stays on screen. */
export const SAVE_TOAST_MS = 1500

export type SaveToastKind = 'saved' | 'failed'

const PROBLEMS: readonly SaveStatus[] = ['error', 'rejected', 'conflict']
const isProblem = (status: SaveStatus) => PROBLEMS.includes(status)

/**
 * Turns the stream of session snapshots into toast events. Pure and stateful: feed it every snapshot in order.
 * 'saved' = a write queue drained (saving -> idle) and the server revision moved; 'failed' = the queue stalled on a problem.
 * A discard (problem -> idle), a re-begin/end (epoch change) and a drained queue that did not change the revision give no toast.
 */
export function createSaveToastTracker() {
  let epoch: number | null = null
  let previous: SaveStatus = 'idle'
  let baselineRevision: number | null = null
  return {
    observe(snapshot: ProjectSessionSnapshot): SaveToastKind | null {
      if (snapshot.epoch !== epoch) {
        epoch = snapshot.epoch
        previous = snapshot.status
        baselineRevision = snapshot.revision
        return null
      }
      const before = previous
      previous = snapshot.status
      if (snapshot.status === 'saving' && before !== 'saving') baselineRevision = snapshot.revision
      if (before === 'saving' && snapshot.status === 'idle' && snapshot.revision !== baselineRevision) return 'saved'
      if (!isProblem(before) && isProblem(snapshot.status)) return 'failed'
      return null
    },
  }
}
