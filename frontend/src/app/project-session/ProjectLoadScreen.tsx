import { shortProjectId } from './projectDisplay'
import type { SessionPhase } from './useProjectSessionController'

type Props = { phase: Extract<SessionPhase, { kind: 'loading' | 'load-error' }>; onRetry(): void; onOpenList(): void; onNew(): void }

export default function ProjectLoadScreen({ phase, onRetry, onOpenList, onNew }: Props) {
  if (phase.kind === 'loading') {
    return <div className="spn-session-screen" role="status"><p>Proje yükleniyor…</p><small>{shortProjectId(phase.projectId)}</small></div>
  }
  return (
    <div className="spn-session-screen" role="alert">
      <h1>Proje açılamadı</h1>
      <p>{phase.message}</p>
      <div className="spn-modal-actions">
        <button type="button" className="spn-button-primary" onClick={onRetry}>Tekrar dene</button>
        <button type="button" className="spn-button-secondary" onClick={onOpenList}>Proje listesi</button>
        <button type="button" className="spn-button-secondary" onClick={onNew}>Yeni proje</button>
      </div>
    </div>
  )
}
