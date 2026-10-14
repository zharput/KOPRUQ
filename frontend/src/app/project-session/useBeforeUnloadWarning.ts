import { useEffect } from 'react'
import { activeProjectSession, activeWriteQueue } from '../../shared/project-store/activeProject'
import { hasDirtyDrafts } from '../../shared/project-store/unsavedDrafts'

/** The browser asks before the tab closes or reloads while writes are pending or stalled (error, rejected, conflict) or an editor-only draft holds edits; silent when everything is saved. */
export function useBeforeUnloadWarning(): void {
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const { status } = activeProjectSession.getSnapshot()
      if (activeWriteQueue.pendingKeys().length > 0 || status === 'error' || status === 'rejected' || status === 'conflict' || hasDirtyDrafts()) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])
}
