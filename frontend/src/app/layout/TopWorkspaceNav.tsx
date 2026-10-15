import { Link, useLocation } from 'react-router-dom'
import { confirmDiscardDrafts } from '../../shared/project-store/unsavedDrafts'
import { useEffect, useState } from 'react'
import { ChevronRight, Clock3, FilePlus2, FileText, FolderOpen, LogOut } from 'lucide-react'
import { PRIMARY_WORKSPACES, legacyWorkspaceFromPath, workspaceFromPath } from '../workspaces/registry'
import { displayProjectName, formatUpdatedAt, shortProjectId } from '../project-session/projectDisplay'
import { useProjectList } from '../project-session/useProjectList'

const RECENT_PROJECT_COUNT = 5

type Props = {
  /** The open project; without one the project name is not shown. */
  projectId?: string | null
  projectName?: string
  onNew?: () => void
  onOpenList?: () => void
  onOpenProject?: (projectId: string) => void
  onExit?: () => void
  /** Ctrl+S: saves what is pending now. */
  onSaveNow?: () => void
}

/** Must run inside a `QueryClientProvider` (the File menu lists the server projects while it is open). */
export default function TopWorkspaceNav({ projectId = null, projectName = '', onNew, onOpenList, onOpenProject, onExit, onSaveNow }: Props) {
  const { pathname, search } = useLocation()
  const [open, setOpen] = useState(false)
  const active = workspaceFromPath(pathname) ?? legacyWorkspaceFromPath(pathname)
  const recent = useProjectList(open)
  useEffect(() => {
    const close = () => setOpen(false)
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); onSaveNow?.() }
      if (e.ctrlKey && e.key.toLowerCase() === 'o') { e.preventDefault(); onOpenList?.() }
      if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); onNew?.() }
    }
    addEventListener('keydown', key); addEventListener('click', close)
    return () => { removeEventListener('keydown', key); removeEventListener('click', close) }
  }, [onNew, onOpenList, onSaveNow])
  const action = (fn?: () => void) => { setOpen(false); fn?.() }
  const iconProps = { size: 22, strokeWidth: 1.7, 'aria-hidden': true as const }
  const shownName = projectId === null ? '' : displayProjectName(projectName)
  const recentProjects = recent.data?.slice(0, RECENT_PROJECT_COUNT) ?? []
  return <header className="spn-workspace-nav" aria-label="Primary workspaces">
    {projectId !== null && <div className="spn-active-project" title={shownName}><strong>{shownName}</strong><small>{shownName}</small></div>}
    <nav className="spn-workspace-nav-items" aria-label="Workspaces">
      <div className="spn-file-menu" onClick={e => e.stopPropagation()}>
        <button type="button" className={`spn-workspace-nav-item${open ? ' active' : ''}`} aria-expanded={open} onClick={() => setOpen(!open)}><FileText size={20} strokeWidth={1.45} aria-hidden="true" /><span>File</span></button>
        {open && <div className="spn-file-dropdown">
          <button onClick={() => action(onNew)}><FilePlus2 {...iconProps} /><span>New Project...</span><kbd>Ctrl+N</kbd></button>
          <button aria-label="Open..." onClick={() => action(onOpenList)}><FolderOpen {...iconProps} /><span>Open...</span><kbd>Ctrl+O</kbd></button>
          <hr />
          <div className="spn-recent-submenu">
            <button type="button" className="spn-file-submenu-label"><Clock3 {...iconProps} /><span>Recent Projects</span><ChevronRight size={18} aria-hidden="true" /></button>
            <div className="spn-recent-list">
              {recent.isError ? <small>Proje listesi alınamadı</small>
                : recent.isPending ? <small>Projeler yükleniyor…</small>
                : recentProjects.length ? recentProjects.map(entry => <button key={entry.projectId} aria-label="Recent project" title={entry.projectId} onClick={() => action(() => onOpenProject?.(entry.projectId))}><span>{displayProjectName(entry.name)}</span><small>{formatUpdatedAt(entry.updatedAt)}</small><small className="spn-recent-project">{shortProjectId(entry.projectId)}</small></button>)
                : <small>No recent projects</small>}
            </div>
          </div>
          <hr />
          <button aria-label="× Exit" disabled={projectId === null} onClick={() => action(onExit)}><LogOut {...iconProps} /><span>Exit</span></button>
        </div>}
      </div>
      {PRIMARY_WORKSPACES.map(({ id, label, Icon }) => <Link key={id} to={{ pathname: `/${id}`, search }} className={`spn-workspace-nav-item${active?.id === id ? ' active' : ''}`} aria-current={active?.id === id ? 'page' : undefined} onClick={(event) => { if (active?.id !== id && !confirmDiscardDrafts()) event.preventDefault() }} title={label} aria-label={label}><Icon size={20} strokeWidth={1.6} aria-hidden="true" /><span>{label}</span></Link>)}
    </nav>
  </header>
}
