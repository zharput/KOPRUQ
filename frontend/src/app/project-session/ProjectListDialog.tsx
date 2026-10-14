import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import { formatApiError } from '../../shared/api/http'
import { displayProjectName, formatUpdatedAt, shortProjectId } from './projectDisplay'
import { useProjectList } from './useProjectList'

type Props = { open: boolean; currentProjectId: string | null; busy?: boolean; onOpen(projectId: string): void; onClose(): void }

export default function ProjectListDialog({ open, currentProjectId, busy = false, onOpen, onClose }: Props) {
  const titleId = useId()
  const list = useProjectList(open)
  const dialogRef = useRef<HTMLElement>(null)
  // Focus moves into the dialog when it opens, also while it is busy (the Close button may be disabled then); Escape works once it is not busy.
  useEffect(() => { if (open) dialogRef.current?.focus() }, [open])
  if (!open) return null
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !busy) { event.stopPropagation(); onClose() }
  }
  let body
  if (list.isError) {
    body = <div role="alert"><p>Proje listesi alınamadı: {formatApiError(list.error)}</p><button type="button" className="spn-button-secondary" onClick={() => { void list.refetch() }}>Tekrar dene</button></div>
  } else if (list.isPending) {
    body = <p role="status">Projeler yükleniyor…</p>
  } else if (list.data.length === 0) {
    body = <p>Kayıtlı proje yok.</p>
  } else {
    body = (
      <ul className="spn-session-list">
        {list.data.map((project) => {
          const current = project.projectId === currentProjectId
          return (
            <li key={project.projectId}>
              <button type="button" className="spn-session-list-row" disabled={busy} aria-current={current ? 'true' : undefined} onClick={() => onOpen(project.projectId)}>
                <strong>{displayProjectName(project.name)}{current ? ' (açık)' : ''}</strong>
                <span className="spn-session-list-meta">Son güncelleme: {formatUpdatedAt(project.updatedAt)}</span>
                <span className="spn-session-list-meta">{shortProjectId(project.projectId)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    )
  }
  return (
    <div className="spn-modal-backdrop" role="presentation">
      <section ref={dialogRef} tabIndex={-1} className="spn-modal spn-session-dialog-wide" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown}>
        <h2 id={titleId}>Proje aç</h2>
        {body}
        <div className="spn-modal-actions"><button type="button" className="spn-button-secondary" disabled={busy} onClick={onClose}>Kapat</button></div>
      </section>
    </div>
  )
}
