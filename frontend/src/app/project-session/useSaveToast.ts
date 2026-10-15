import { useEffect, useState } from 'react'
import { activeProjectSession } from '../../shared/project-store/activeProject'
import type { ProjectSession } from '../../shared/project-store/projectSession'
import { createSaveToastTracker, SAVE_TOAST_MS, type SaveToastKind } from './saveToastTracker'

export type SaveToastState = { kind: SaveToastKind; id: number } | null

/**
 * Current save toast of the session. Subscribes to the session directly (not to render state) so that no intermediate
 * status is merged away; a new toast replaces the previous one and restarts the timer; an epoch change clears it.
 */
export function useSaveToast(session: ProjectSession = activeProjectSession): SaveToastState {
  const [toast, setToast] = useState<SaveToastState>(null)
  useEffect(() => {
    const tracker = createSaveToastTracker()
    let timer: ReturnType<typeof setTimeout> | null = null
    let nextId = 0
    let epoch = session.getSnapshot().epoch
    const clearTimer = () => { if (timer !== null) { clearTimeout(timer); timer = null } }
    tracker.observe(session.getSnapshot())
    const unsubscribe = session.subscribe(() => {
      const snapshot = session.getSnapshot()
      const kind = tracker.observe(snapshot)
      if (snapshot.epoch !== epoch) {
        epoch = snapshot.epoch
        clearTimer()
        setToast(null)
      }
      if (kind === null) return
      clearTimer()
      nextId += 1
      setToast({ kind, id: nextId })
      timer = setTimeout(() => { timer = null; setToast(null) }, SAVE_TOAST_MS)
    })
    return () => { unsubscribe(); clearTimer() }
  }, [session])
  return toast
}
