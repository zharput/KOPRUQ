import { useCallback, useEffect, useRef, useState } from 'react'
import { activeProjectSession, activeWriteQueue } from '../../shared/project-store/activeProject'
import type { ProjectSession } from '../../shared/project-store/projectSession'
import type { WriteQueue } from '../../shared/project-store/writeQueue'
import { createSaveToastTracker, isSaveProblem, SAVE_ERROR_TOAST_MS, SAVE_TOAST_MS, type SaveToastKind } from './saveToastTracker'

export type SaveToastState = { kind: SaveToastKind; id: number } | null
export type SavePauseSource = 'hover' | 'focus'
export type SaveToastControls = { toast: SaveToastState; reshow(): void; pause(source?: SavePauseSource): void; resume(source?: SavePauseSource): void }

/**
 * Current save toast of the session. Subscribes to the session directly (not to render state) so that no intermediate
 * status is merged away; a new toast replaces the previous one and restarts the timer; an epoch change clears it.
 * A failure toast lasts SAVE_ERROR_TOAST_MS, can be paused (hover and focus are tracked separately; the timer runs only when neither holds it) and is closed when the problem is gone (discard, retry).
 * While the queue stays stalled, every held write and `reshow()` bring it back (same id, fresh timer), because nothing else
 * tells the user that further edits are not being sent.
 */
export function useSaveToast(session: ProjectSession = activeProjectSession, queue: Pick<WriteQueue, 'onHeldWrite'> = activeWriteQueue): SaveToastControls {
  const [toast, setToast] = useState<SaveToastState>(null)
  const controls = useRef<{ reshow(): void; pause(source: SavePauseSource): void; resume(source: SavePauseSource): void } | null>(null)
  useEffect(() => {
    const tracker = createSaveToastTracker()
    let timer: ReturnType<typeof setTimeout> | null = null
    let nextId = 0
    let current: SaveToastState = null
    const holds = new Set<SavePauseSource>()
    let epoch = session.getSnapshot().epoch
    const clearTimer = () => { if (timer !== null) { clearTimeout(timer); timer = null } }
    const startTimer = () => {
      clearTimer()
      if (current === null || holds.size > 0) return
      timer = setTimeout(() => { timer = null; close() }, current.kind === 'failed' ? SAVE_ERROR_TOAST_MS : SAVE_TOAST_MS)
    }
    function close() {
      clearTimer(); holds.clear(); current = null; setToast(null)
    }
    const show = (kind: SaveToastKind) => {
      nextId += 1
      current = { kind, id: nextId }
      setToast(current)
      startTimer()
    }
    const reshow = () => {
      if (!isSaveProblem(session.getSnapshot().status)) return
      if (current?.kind === 'failed') startTimer(); else show('failed')
    }
    controls.current = {
      reshow,
      pause: (source) => { if (current === null) return; holds.add(source); clearTimer() },
      resume: (source) => { holds.delete(source); startTimer() },
    }
    tracker.observe(session.getSnapshot())
    const unsubscribe = session.subscribe(() => {
      const snapshot = session.getSnapshot()
      const kind = tracker.observe(snapshot)
      if (snapshot.epoch !== epoch) { epoch = snapshot.epoch; close() }
      else if (current?.kind === 'failed' && !isSaveProblem(snapshot.status)) close()
      if (kind !== null) show(kind)
    })
    const unsubscribeHeld = queue.onHeldWrite(reshow)
    return () => { unsubscribe(); unsubscribeHeld(); clearTimer(); controls.current = null }
  }, [session, queue])
  const reshow = useCallback(() => controls.current?.reshow(), [])
  const pause = useCallback((source: SavePauseSource = 'hover') => controls.current?.pause(source), [])
  const resume = useCallback((source: SavePauseSource = 'hover') => controls.current?.resume(source), [])
  return { toast, reshow, pause, resume }
}
