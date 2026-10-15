import type { ProjectSessionSnapshot } from '../../shared/project-store/projectSession'
import { describeSaveProblem } from './saveStatusText'
import type { SavePauseSource, SaveToastState } from './useSaveToast'

type Props = {
  toast: SaveToastState
  /** Current session snapshot; the content of a failure toast is read from it at render time. */
  snapshot: ProjectSessionSnapshot
  /** A session action is running or waiting for a decision: the buttons are disabled. */
  busy?: boolean
  onRetry(): void
  onDiscard(): void
  onReload(): void
  /** Hover/focus inside the failure toast pauses its timer. */
  onPause(source: SavePauseSource): void
  onResume(source: SavePauseSource): void
}

/**
 * Transient save notification. The polite live region is always mounted and only its content changes, so screen readers
 * announce the success toast. The failure toast is a separate role=alert element (it carries buttons, so it takes pointer events)
 * with the problem text and the recovery actions of describeSaveProblem.
 */
export default function SaveToast({ toast, snapshot, busy = false, onRetry, onDiscard, onReload, onPause, onResume }: Props) {
  const problem = toast?.kind === 'failed' ? describeSaveProblem(snapshot) : null
  return (
    <>
      <div className="spn-save-toast-region" role="status" aria-live="polite">
        {toast?.kind === 'saved' && <div key={toast.id} className="spn-save-toast" data-kind="saved">Kaydedildi</div>}
      </div>
      {toast?.kind === 'failed' && problem && (
        <div
          key={toast.id} className="spn-save-toast spn-save-toast-failed" data-kind="failed" role="alert" aria-label="Kayıt bildirimi"
          onMouseEnter={() => onPause('hover')} onMouseLeave={() => onResume('hover')} onFocus={() => onPause('focus')}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onResume('focus') }}
        >
          <strong>{problem.title}</strong>
          {problem.details.map((detail, index) => <span key={`${index}-${detail}`}>{detail}</span>)}
          <div className="spn-save-toast-actions">
            {problem.actions === 'reload'
              ? <button type="button" className="spn-button-secondary" disabled={busy} onClick={onReload}>Yeniden yükle</button>
              : <>
                  <button type="button" className="spn-button-secondary" disabled={busy} onClick={onRetry}>Tekrar dene</button>
                  <button type="button" className="spn-button-secondary" disabled={busy} onClick={onDiscard}>Değişiklikleri at</button>
                </>}
          </div>
        </div>
      )}
    </>
  )
}
