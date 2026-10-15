import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { BrowserRouter, Navigate, useLocation } from 'react-router-dom'
import { confirmDiscardDrafts } from '../shared/project-store/unsavedDrafts'
import { FilePlus2, FolderOpen } from 'lucide-react'
import './styles/App.css'
import AppProviders from './providers/AppProviders'
import TopWorkspaceNav from './layout/TopWorkspaceNav'
import AppRoutes from './router'
import { legacyItemFromPath, legacyWorkspaceFromPath, WORKSPACES, workspaceFromPath } from './workspaces/registry'
import WorkspacePage from './workspaces/WorkspacePage'
import NewProjectDialog from './project-session/NewProjectDialog'
import ProjectListDialog from './project-session/ProjectListDialog'
import ProjectLoadScreen from './project-session/ProjectLoadScreen'
import SaveToast from './project-session/SaveToast'
import { useSaveToast } from './project-session/useSaveToast'
import { useBeforeUnloadWarning } from './project-session/useBeforeUnloadWarning'
import { useProjectSessionController } from './project-session/useProjectSessionController'
import { useUrlProjectId } from './project-session/useUrlProjectId'
import type { BridgeRow } from '../features/project'
import type { GenerationSummary } from '../features/bridge-alternatives'
import type { LayoutSeed } from '../features/layout-generator'
import { INITIAL_CROSS_SECTION_VALUES, type CrossSectionValues } from '../features/superstructure-families'
import { CROSS_SECTION_VALUES_MODULE } from '../features/superstructure-families/model/crossSectionProjectModule'
import { WIND_SNAPSHOT_MODULE } from '../features/loads/model/loadsProjectModules'
import { useProjectModule, useProjectModuleValue } from '../shared/project-file/useProjectModule'
import { ensureBridgeIds, readProjectState, writeProjectState, type PersistedProjectState, type ProjectWorkspaceData } from '../features/project/model/projectWorkspace'
import { useProjectState } from '../features/project/hooks/useProjectState'
import { ensureBridgeDefinitions, readBridgeDefinitionStore, useBridgeDefinitionStore, writeBridgeDefinitionStore } from '../features/bridge-definition/model/store'
import type { BridgeDefinitionStore } from '../features/bridge-definition/model/types'
import type { WindCalculationSnapshot } from '../features/loads/model/windTypes'
import { activeWriteQueue } from '../shared/project-store/activeProject'
import { formatApiError } from '../shared/api/http'
import UnsavedChangesModal from '../shared/ui/UnsavedChangesModal'

const LEGACY_MIGRATED_ROUTES: Record<string, string> = {
  '/alignment': '/bridge-definition/alignment/horizontal',
  '/terrain-dtm': '/bridge-definition/alignment/terrain-reference',
  '/3d-visualization': '/bridge-definition',
  '/constraints': '/bridge-definition/constraints/geometric',
  '/bridge-inventory': '/project/bridge-information',
  '/bridge-site': '/bridge-definition/alignment/terrain-reference',
  '/bridge-superstructure': '/bridge-definition/superstructure/type-assignment',
  '/bridge-piers': '/bridge-definition/supports/pier-layout',
  '/bridge-abutments': '/bridge-definition/supports/abutments',
  '/bridge-bearings': '/bridge-definition/bearings/assignment',
  '/bridge-foundations': '/bridge-definition/foundations/assignment',
}

function WelcomeScreen({ onNew, onOpen }: { onNew: () => void; onOpen: () => void }) {
  return <main className="spn-welcome-screen" aria-label="KOPRUQ Welcome"><section className="spn-welcome-card"><div className="spn-welcome-heading"><span /><h1>WELCOME</h1><span /></div><img className="spn-welcome-logo" src="/kopruq-logo.png" alt="KOPRUQ Computational & Generative Bridge Design" /><p>Start a bridge design project or open a recent project from the File menu.</p><div className="spn-welcome-actions"><button className="spn-button-primary" onClick={onNew}><FilePlus2 size={18} aria-hidden="true" />New Project</button><button className="spn-button-secondary" onClick={onOpen}><FolderOpen size={18} aria-hidden="true" />Open Project</button></div></section></main>
}

/**
 * Single KOPRUQ shell: the open server project (`?project=<id>`, see `useProjectSessionController`) and the app-wide providers stay above
 * the URL-selected workspace, while old one-segment feature routes render their existing screens in the workspace center.
 * The project data itself lives in the server sections of the features; this shell only connects them to the screens.
 */
function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <ProjectShell />
      </BrowserRouter>
    </AppProviders>
  )
}

function ProjectShell() {
  const [summary, setSummary] = useState<GenerationSummary | null>(null)
  const [layoutSeed, setLayoutSeed] = useState<LayoutSeed | null>(null)
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [listDialogOpen, setListDialogOpen] = useState(false)
  const { urlProjectId, setUrlProjectId } = useUrlProjectId()
  const session = useProjectSessionController({ urlProjectId, setUrlProjectId })
  useBeforeUnloadWarning()
  const saveToast = useSaveToast()

  const projectState = useProjectState()
  useEffect(() => { window.dispatchEvent(new Event('kopruq:project-units-changed')) }, [projectState])
  const setProjectState = (update: (previous: PersistedProjectState) => PersistedProjectState) => { writeProjectState(update(readProjectState())) }
  const bridgeDefinitions = useBridgeDefinitionStore()
  const setBridgeDefinitions: Dispatch<SetStateAction<BridgeDefinitionStore>> = (update) => {
    writeBridgeDefinitionStore(typeof update === 'function' ? update(readBridgeDefinitionStore()) : update)
  }
  const bridges = projectState.bridges
  const setBridges: Dispatch<SetStateAction<BridgeRow[]>> = (update) => {
    const current = readProjectState()
    const proposedRows = typeof update === 'function' ? update(current.bridges) : update
    const nextRows = ensureBridgeIds(proposedRows.map((row) => {
      if (row.id) return row
      const matching = current.bridges.filter((old) => old.no === row.no)
      return matching.length === 1 ? { ...row, id: matching[0].id } : row
    }))
    // Two separate sections: the workspace first, then the bridge definitions reconciled with the new rows (two PUTs, sent one after the other).
    if (!writeProjectState({ ...current, bridges: nextRows, project: { ...current.project, lastModified: new Date().toISOString().slice(0, 10) } })) return
    writeBridgeDefinitionStore(ensureBridgeDefinitions(readBridgeDefinitionStore(), nextRows))
  }
  const designCode = projectState.project.designStandardFamily
  const setDesignCode: Dispatch<SetStateAction<string>> = (update) => setProjectState((previous) => ({ ...previous, project: { ...previous.project, designStandardFamily: typeof update === 'function' ? update(previous.project.designStandardFamily) : update } }))
  const [crossSectionValues, setCrossSectionValues] = useProjectModule(CROSS_SECTION_VALUES_MODULE, INITIAL_CROSS_SECTION_VALUES)
  const windLoads = useProjectModuleValue(WIND_SNAPSHOT_MODULE) ?? null
  const setWindLoads = (snapshot: WindCalculationSnapshot | null) => { if (snapshot) WIND_SNAPSHOT_MODULE.write(snapshot); else WIND_SNAPSHOT_MODULE.reset() }
  const terrainId = projectState.project.environment.terrainDatasetId
  const landXmlImportId = projectState.project.environment.landXmlImportId
  const setTerrainId: Dispatch<SetStateAction<string | null>> = (update) => setProjectState((previous) => ({ ...previous, project: { ...previous.project, environment: { ...previous.project.environment, terrainDatasetId: typeof update === 'function' ? update(previous.project.environment.terrainDatasetId) : update } } }))
  const setLandXmlImportId: Dispatch<SetStateAction<string | null>> = (update) => setProjectState((previous) => ({ ...previous, project: { ...previous.project, environment: { ...previous.project.environment, landXmlImportId: typeof update === 'function' ? update(previous.project.environment.landXmlImportId) : update } } }))

  const { phase, saveStatus, pendingSwitch, busy } = session
  const sessionBusy = busy || pendingSwitch !== null
  // The dialogs stay usable while a project is loading (choosing another project supersedes the running request); they lock only under the unsaved-changes decision.
  const dialogsLocked = pendingSwitch !== null
  // Ask before anything that remounts the workspace and drops an editor-only draft; a pending decision or the already-open project makes the action a no-op, so nothing is asked then.
  const mayLeave = (targetProjectId?: string) => pendingSwitch !== null || targetProjectId === saveStatus.projectId || confirmDiscardDrafts()
  const openProjectFromList = (projectId: string) => { if (!mayLeave(projectId)) return; setListDialogOpen(false); void session.openProject(projectId) }
  const createProject = (name: string) => { if (!mayLeave()) return; setNewDialogOpen(false); void session.newProject(name) }
  // Shortcuts must not open a dialog on top of the unsaved-changes decision, which locks the dialogs.
  const requestNew = () => { if (!dialogsLocked) setNewDialogOpen(true) }
  const requestOpenList = () => { if (!dialogsLocked) setListDialogOpen(true) }

  let body
  if (phase.kind === 'welcome') {
    body = <WelcomeScreen onNew={() => setNewDialogOpen(true)} onOpen={() => setListDialogOpen(true)} />
  } else if (phase.kind === 'ready') {
    body = <RoutedApplication
      summary={summary} onGenerated={setSummary} layoutSeed={layoutSeed} setLayoutSeed={setLayoutSeed}
      bridges={bridges} setBridges={setBridges} designCode={designCode} setDesignCode={setDesignCode}
      project={projectState.project} setProject={(project: ProjectWorkspaceData) => setProjectState((previous) => ({ ...previous, project }))}
      bridgeDefinitions={bridgeDefinitions} setBridgeDefinitions={setBridgeDefinitions}
      crossSectionValues={crossSectionValues} setCrossSectionValues={setCrossSectionValues}
      windLoads={windLoads} setWindLoads={setWindLoads}
      terrainId={terrainId} setTerrainId={setTerrainId} landXmlImportId={landXmlImportId} setLandXmlImportId={setLandXmlImportId}
      epoch={saveStatus.epoch}
    />
  } else {
    body = <ProjectLoadScreen phase={phase} onRetry={() => { void session.openProject(phase.projectId) }} onOpenList={() => setListDialogOpen(true)} onNew={() => setNewDialogOpen(true)} />
  }

  return (
    <div className="spn-app-root">
      <TopWorkspaceNav
        projectId={saveStatus.projectId} projectName={projectState.project.name} saveStatus={saveStatus} busy={sessionBusy}
        onNew={requestNew} onOpenList={requestOpenList} onOpenProject={(projectId) => { if (mayLeave(projectId)) void session.openProject(projectId) }}
        onExit={() => { if (mayLeave()) void session.exitProject() }} onSaveNow={() => { void activeWriteQueue.flush().catch(() => undefined) }}
        onRetry={() => { void session.retrySaves() }} onDiscard={() => session.discardSaves()} onReload={() => { if (mayLeave()) void session.reloadProject() }}
      />
      {saveStatus.projectId !== null && <SaveToast toast={saveToast} />}
      {session.actionError !== null && <div className="spn-session-banner" role="alert"><span>{session.actionError}</span><button type="button" className="spn-button-secondary" onClick={session.clearActionError}>Kapat</button></div>}
      {body}
      <NewProjectDialog open={newDialogOpen} busy={dialogsLocked} onCreate={createProject} onCancel={() => setNewDialogOpen(false)} />
      <ProjectListDialog open={listDialogOpen} currentProjectId={saveStatus.projectId} busy={dialogsLocked} onOpen={openProjectFromList} onClose={() => setListDialogOpen(false)} />
      <UnsavedChangesModal
        open={pendingSwitch !== null} busy={busy} message={pendingSwitch === null ? '' : formatApiError(pendingSwitch.error)} canRetry={pendingSwitch?.canRetry ?? false}
        onRetry={() => { void session.resolvePendingSwitch('retry') }} onDiscard={() => { void session.resolvePendingSwitch('discard') }} onCancel={() => { void session.resolvePendingSwitch('cancel') }}
      />
    </div>
  )
}

type RoutedApplicationProps = {
  summary: GenerationSummary | null
  onGenerated: (summary: GenerationSummary) => void
  layoutSeed: LayoutSeed | null
  setLayoutSeed: Dispatch<SetStateAction<LayoutSeed | null>>
  bridges: BridgeRow[]
  setBridges: Dispatch<SetStateAction<BridgeRow[]>>
  designCode: string
  setDesignCode: Dispatch<SetStateAction<string>>
  crossSectionValues: CrossSectionValues
  windLoads: WindCalculationSnapshot | null
  setWindLoads: (snapshot: WindCalculationSnapshot | null) => void
  setCrossSectionValues: Dispatch<SetStateAction<CrossSectionValues>>
  terrainId: string | null
  setTerrainId: Dispatch<SetStateAction<string | null>>
  landXmlImportId: string | null
  setLandXmlImportId: Dispatch<SetStateAction<string | null>>
  project: ProjectWorkspaceData
  setProject: (project: ProjectWorkspaceData) => void
  bridgeDefinitions: BridgeDefinitionStore
  setBridgeDefinitions: Dispatch<SetStateAction<BridgeDefinitionStore>>
  /** Session epoch: a new project (or a reload) remounts the workspace. */
  epoch: number
}

function RoutedApplication(props: RoutedApplicationProps) {
  const location = useLocation()
  const workspace = workspaceFromPath(location.pathname)
  const legacyWorkspace = !workspace ? legacyWorkspaceFromPath(location.pathname) : undefined
  const isHomeRoute = location.pathname === '/' || location.pathname === '/home'
  const isUnknownWorkspaceRoute = location.pathname.startsWith('/workspace/') && !workspace
  const isLegacyRoute = !workspace && !isHomeRoute && legacyWorkspace !== undefined
  const migratedRoute = LEGACY_MIGRATED_ROUTES[location.pathname]
  const activeWorkspace = workspace ?? legacyWorkspace ?? WORKSPACES[0]
  // Redirects keep the query string, so `?project=` survives them. The live address bar is read on purpose: the router state can still be one
  // transition behind a replace made by the session controller (`useUrlProjectId`), and a stale query would drop the parameter again.
  const redirect = (pathname: string) => <Navigate to={{ pathname, search: window.location.search }} replace />
  return isHomeRoute || isUnknownWorkspaceRoute || location.pathname === '/project-dashboard'
    ? redirect('/project')
    : migratedRoute
    ? redirect(migratedRoute)
    : location.pathname === '/project-information'
    ? redirect('/project/bridge-information')
    : location.pathname === '/cost-database'
    ? redirect('/project/cost-database')
    : <WorkspacePage
        key={`${props.epoch}:${activeWorkspace.id}${isLegacyRoute || (workspace?.id === 'project' && location.pathname !== '/project') ? location.pathname : ''}`}
        workspace={activeWorkspace}
        initialSelectedItem={isLegacyRoute ? legacyItemFromPath(location.pathname) : undefined}
        mainContentOverride={isLegacyRoute ? <AppRoutes {...props} /> : undefined}
        project={props.project} setProject={props.setProject} bridges={props.bridges} setBridges={props.setBridges} designCode={props.designCode} setDesignCode={props.setDesignCode}
        bridgeDefinitions={props.bridgeDefinitions} setBridgeDefinitions={props.setBridgeDefinitions}
        terrainId={props.terrainId} landXmlImportId={props.landXmlImportId} setTerrainId={props.setTerrainId} setLandXmlImportId={props.setLandXmlImportId}
        crossSectionValues={props.crossSectionValues} windLoads={props.windLoads} setWindLoads={props.setWindLoads}
        setCrossSectionValues={props.setCrossSectionValues}
      />
}

export default App
