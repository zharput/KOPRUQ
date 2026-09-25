import { Link, useLocation } from 'react-router-dom'
import { PRIMARY_WORKSPACES, legacyWorkspaceFromPath, workspaceFromPath } from '../workspaces/registry'

export default function TopWorkspaceNav() {
  const { pathname } = useLocation()
  const activeWorkspace = workspaceFromPath(pathname) ?? legacyWorkspaceFromPath(pathname)
  return <header className="spn-workspace-nav" aria-label="Primary workspaces">
    <Link to="/project" className="spn-workspace-brand" aria-label="KOPRUQ Project Overview"><img src="/Kopruq_logo.png" alt="KOPRUQ" /></Link>
    <nav className="spn-workspace-nav-items" aria-label="Workspaces">
      {PRIMARY_WORKSPACES.map(({ id, label, Icon }) => <Link key={id} to={`/${id}`} className={`spn-workspace-nav-item${activeWorkspace?.id === id ? ' active' : ''}`} aria-current={activeWorkspace?.id === id ? 'page' : undefined} title={label} aria-label={label}>
        <Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>
      </Link>)}
    </nav>
  </header>
}
