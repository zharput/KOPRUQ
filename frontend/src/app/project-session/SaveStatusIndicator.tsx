import type { ProjectSessionSnapshot } from '../../shared/project-store/projectSession'
import { describeSaveProblem } from './saveStatusText'

type Props = { status: ProjectSessionSnapshot; busy?: boolean; onRetry(): void; onDiscard(): void; onReload(): void }

export default function SaveStatusIndicator({ status, busy = false, onRetry, onDiscard, onReload }: Props) {
  if (status.projectId === null) return null
  // Idle and saving show nothing: a completed save is announced by the transient SaveToast.
  const problem = describeSaveProblem(status)
  if (!problem) return null
  return (
    <div className="spn-session-status" data-status={status.status} role="alert">
      <strong>{problem.title}</strong>
      {problem.details.map((detail, index) => <span key={`${index}-${detail}`}>{detail}</span>)}
      {problem.actions === 'reload'
        ? <button type="button" className="spn-button-secondary" disabled={busy} onClick={onReload}>Yeniden yükle</button>
        : <>
            <button type="button" className="spn-button-secondary" disabled={busy} onClick={onRetry}>Tekrar dene</button>
            <button type="button" className="spn-button-secondary" disabled={busy} onClick={onDiscard}>Değişiklikleri at</button>
          </>}
    </div>
  )
}
