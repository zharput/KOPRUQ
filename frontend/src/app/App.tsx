import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { BrowserRouter, Navigate, useLocation } from 'react-router-dom'
import { FilePlus2, FolderOpen } from 'lucide-react'
import './styles/App.css'
import AppProviders from './providers/AppProviders'
import TopWorkspaceNav from './layout/TopWorkspaceNav'
import AppRoutes from './router'
import { legacyItemFromPath, legacyWorkspaceFromPath, WORKSPACES, workspaceFromPath } from './workspaces/registry'
import WorkspacePage from './workspaces/WorkspacePage'
import { INITIAL_BRIDGES, type BridgeRow } from '../features/project'
import type { GenerationSummary } from '../features/bridge-alternatives'
import type { LayoutSeed } from '../features/layout-generator'
import { INITIAL_CROSS_SECTION_VALUES, type CrossSectionValues } from '../features/superstructure-families'
import { ensureBridgeIds, INITIAL_PROJECT, readProjectState, persistProjectState, type ProjectWorkspaceData } from '../features/project/model/projectWorkspace'
import { useProjectFile } from '../shared/project-file/useProjectFile'
import UnsavedChangesModal from '../shared/ui/UnsavedChangesModal'
import RecentFileAccessModal from '../shared/ui/RecentFileAccessModal'
import { getRecentProjectFile, repairRecentProject, type RecentProject } from '../shared/project-file/recentProjects'
import { KOPRUQ_FILE_PICKER_OPTIONS, type FileRef } from '../shared/project-file/projectFileService'
import type { WindCalculationSnapshot } from '../shared/project-file/projectFileTypes'

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
import { ensureBridgeDefinitions, persistBridgeDefinitionStore, readBridgeDefinitionStore } from '../features/bridge-definition/model/store'
import type { BridgeDefinitionStore } from '../features/bridge-definition/model/types'
import { resetGraphDocuments } from '../features/graph/state/graphStore'
import { saveFamilyRecords, savePrecastGirderDefinition, type FamilyRepositoryCategory } from '../features/family-registry/model/familyRepository'

function WelcomeScreen({ onNew, onOpen }: { onNew: () => void; onOpen: () => void }) {
  return <main className="spn-welcome-screen" aria-label="KOPRUQ Welcome"><section className="spn-welcome-card"><div className="spn-welcome-heading"><span /><h1>WELCOME</h1><span /></div><img className="spn-welcome-logo" src="/kopruq-logo.png" alt="KOPRUQ Computational & Generative Bridge Design" /><p>Start a bridge design project or open a recent project from the File menu.</p><div className="spn-welcome-actions"><button className="spn-button-primary" onClick={onNew}><FilePlus2 size={18} aria-hidden="true" />New Project</button><button className="spn-button-secondary" onClick={onOpen}><FolderOpen size={18} aria-hidden="true" />Open Project</button></div></section></main>
}

/**
 * Single KOPRUQ shell: app-wide project state/providers stay above the
 * URL-selected workspace, while old one-segment feature routes render
 * their existing screens in the workspace center. The legacy Sidebar
 * and TopBar sources remain available but are no longer mounted here.
 */
function App() {
  const [summary, setSummary] = useState<GenerationSummary | null>(null)
  const [layoutSeed, setLayoutSeed] = useState<LayoutSeed | null>(null)
  const [projectState, setProjectState] = useState(() => readProjectState(INITIAL_BRIDGES))
  useEffect(() => { persistProjectState(projectState); window.dispatchEvent(new Event('kopruq:project-units-changed')) }, [projectState])
  const [bridgeDefinitions, setBridgeDefinitions] = useState<BridgeDefinitionStore>(() => readBridgeDefinitionStore(projectState.bridges))
  useEffect(() => { persistBridgeDefinitionStore(bridgeDefinitions) }, [bridgeDefinitions])
  const bridges = projectState.bridges
  const setBridges: Dispatch<SetStateAction<BridgeRow[]>> = (update) => {
    const proposedRows = typeof update === 'function' ? update(bridges) : update
    const nextRows = ensureBridgeIds(proposedRows.map((row) => {
      if (row.id) return row
      const matching = bridges.filter((old) => old.no === row.no)
      return matching.length === 1 ? { ...row, id: matching[0].id } : row
    }))
    setProjectState((previous) => ({ ...previous, bridges: nextRows, project: { ...previous.project, lastModified: new Date().toISOString().slice(0, 10) } }))
    setBridgeDefinitions((previous) => ensureBridgeDefinitions(previous, nextRows))
  }
  const designCode = projectState.project.designStandardFamily
  const setDesignCode: Dispatch<SetStateAction<string>> = (update) => setProjectState((previous) => ({ ...previous, project: { ...previous.project, designStandardFamily: typeof update === 'function' ? update(previous.project.designStandardFamily) : update } }))
  const [crossSectionValues, setCrossSectionValues] = useState<CrossSectionValues>(INITIAL_CROSS_SECTION_VALUES)
  const [windLoads, setWindLoads] = useState<WindCalculationSnapshot | null>(null)
  const file = useProjectFile(projectState, setProjectState, bridgeDefinitions, setBridgeDefinitions, windLoads, setWindLoads)
  const [showWelcome, setShowWelcome] = useState(false)
  const [pending, setPending] = useState<(() => void) | null>(null); const [modalBusy, setModalBusy] = useState(false)
  const runAfterUnsavedDecision = (action: () => void) => { if (!file.dirty) { action(); return }; setPending(() => action) }
  const discardAndContinue = () => { const action = pending; setPending(null); file.setDirty(false); action?.() }
  const saveAndContinue = async () => { if (!pending) return; setModalBusy(true); try { await file.save(); const action = pending; setPending(null); action?.() } catch (error) { window.alert(error instanceof Error ? error.message : 'Save failed.'); } finally { setModalBusy(false) } }
  const newProject = () => runAfterUnsavedDecision(() => { setShowWelcome(false)
    const nextProjectState = { project: structuredClone(INITIAL_PROJECT), bridges: [] }
    const nextBridgeDefinitions = readBridgeDefinitionStore([])
    try {
      resetGraphDocuments()
      ;(['PIER', 'PIER_CAP', 'FOUNDATION', 'BEARING', 'MATERIAL'] as FamilyRepositoryCategory[]).forEach((category) => { if (!saveFamilyRecords(category, [])) throw new Error(`Unable to reset family catalog: ${category}`) })
      if (!savePrecastGirderDefinition([])) throw new Error('Unable to reset girder catalog.')
      setProjectState(nextProjectState); setBridgeDefinitions(nextBridgeDefinitions); file.resetForNewProject(nextProjectState, nextBridgeDefinitions)
    } catch (error) { window.alert(error instanceof Error ? error.message : 'Unable to create a new project.') }
  })
  const [recentAccessEntry, setRecentAccessEntry] = useState<RecentProject | null>(null)
  const [recentAccessError, setRecentAccessError] = useState<string>()
  const showRecentError = (error: unknown) => setRecentAccessError(error instanceof Error ? error.message : 'Unable to open recent project.')
  const openProject = (input: File, fileRef?: FileRef) => runAfterUnsavedDecision(() => { setShowWelcome(false); void file.open(input, fileRef).catch(showRecentError) })
  const openRecentProject = (entry: RecentProject) => runAfterUnsavedDecision(() => { setShowWelcome(false)
    if (!entry.handle) { setRecentAccessEntry(entry); return }
    void getRecentProjectFile(entry).then((recentFile) => file.open(recentFile, { name: entry.fileName, handle: entry.handle })).catch(showRecentError)
  })
  const reselectRecentProject = async () => {
    if (!recentAccessEntry) return
    const picker = (window as Window & { showOpenFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker
    if (!picker) { setRecentAccessError('Dosya seçici bu tarayıcıda desteklenmiyor.'); return }
    try { const [handle] = await picker(KOPRUQ_FILE_PICKER_OPTIONS); if (handle.name !== recentAccessEntry.fileName) { setRecentAccessError(`Seçilen dosya ${recentAccessEntry.fileName} ile eşleşmiyor.`); return }; const selected = await handle.getFile(); await repairRecentProject(recentAccessEntry, handle); await file.open(selected, { name: handle.name, handle }); setRecentAccessEntry(null); setRecentAccessError(undefined) } catch (error) { if ((error as DOMException)?.name !== 'AbortError') showRecentError(error) }
  }
  useEffect(() => { const beforeUnload = (event: BeforeUnloadEvent) => { if (file.dirty) { event.preventDefault(); event.returnValue = '' } }; window.addEventListener('beforeunload', beforeUnload); return () => window.removeEventListener('beforeunload', beforeUnload) }, [file.dirty])
  const terrainId = projectState.project.environment.terrainDatasetId
  const landXmlImportId = projectState.project.environment.landXmlImportId
  const setTerrainId: Dispatch<SetStateAction<string | null>> = (update) => setProjectState((previous) => ({ ...previous, project: { ...previous.project, environment: { ...previous.project.environment, terrainDatasetId: typeof update === 'function' ? update(previous.project.environment.terrainDatasetId) : update } } }))
  const setLandXmlImportId: Dispatch<SetStateAction<string | null>> = (update) => setProjectState((previous) => ({ ...previous, project: { ...previous.project, environment: { ...previous.project.environment, landXmlImportId: typeof update === 'function' ? update(previous.project.environment.landXmlImportId) : update } } }))

  return (
    <AppProviders>
      <BrowserRouter>
        <><RoutedApplication
          summary={summary} onGenerated={setSummary} layoutSeed={layoutSeed} setLayoutSeed={setLayoutSeed}
          bridges={bridges} setBridges={setBridges} designCode={designCode} setDesignCode={setDesignCode}
          project={projectState.project} setProject={(project: ProjectWorkspaceData) => setProjectState((previous) => ({ ...previous, project }))}
          bridgeDefinitions={bridgeDefinitions} setBridgeDefinitions={setBridgeDefinitions}
          crossSectionValues={crossSectionValues} setCrossSectionValues={setCrossSectionValues}
          windLoads={windLoads} setWindLoads={setWindLoads}
          terrainId={terrainId} setTerrainId={setTerrainId} landXmlImportId={landXmlImportId} setLandXmlImportId={setLandXmlImportId} file={file} onNewProject={newProject} onOpenProject={openProject} onRecentOpen={openRecentProject} onExit={() => runAfterUnsavedDecision(() => { file.closeSession(); setShowWelcome(true) })} showWelcome={showWelcome}
        /><UnsavedChangesModal open={pending !== null} busy={modalBusy} onSave={() => void saveAndContinue()} onDiscard={discardAndContinue} onCancel={() => setPending(null)} /><RecentFileAccessModal open={recentAccessEntry !== null || recentAccessError !== undefined} fileName={recentAccessEntry?.fileName} error={recentAccessError} onReselect={() => void reselectRecentProject()} onCancel={() => { setRecentAccessEntry(null); setRecentAccessError(undefined) }} /></>
      </BrowserRouter>
    </AppProviders>
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
  file: ReturnType<typeof useProjectFile>
  onNewProject: () => void
  onOpenProject: (file: File, fileRef?: FileRef) => void
  onRecentOpen: (entry: import('../shared/project-file/recentProjects').RecentProject) => void
  onExit: () => void
  showWelcome: boolean
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
  return <div className="spn-app-root">
    <TopWorkspaceNav dirty={props.file.dirty} projectName={props.file.projectName} fileName={props.file.fileName} recent={props.file.recent} onNew={props.onNewProject} onOpen={props.onOpenProject} onRecentOpen={props.onRecentOpen} onSave={() => void props.file.save()} onSaveAs={() => void props.file.save(true)} onExit={props.onExit} />
    {props.showWelcome ? <WelcomeScreen onNew={props.onNewProject} onOpen={() => { (document.querySelector('input[type="file"]') as HTMLInputElement | null)?.click() }} />
    : isHomeRoute || isUnknownWorkspaceRoute || location.pathname === '/project-dashboard'
      ? <Navigate to="/project" replace />
      : migratedRoute
      ? <Navigate to={migratedRoute} replace />
      : location.pathname === '/project-information'
      ? <Navigate to="/project/bridge-information" replace />
      : location.pathname === '/cost-database'
      ? <Navigate to="/project/cost-database" replace />
      : <WorkspacePage
          key={`${activeWorkspace.id}${isLegacyRoute || (workspace?.id === 'project' && location.pathname !== '/project') ? location.pathname : ''}`}
          workspace={activeWorkspace}
          initialSelectedItem={isLegacyRoute ? legacyItemFromPath(location.pathname) : undefined}
          mainContentOverride={isLegacyRoute ? <AppRoutes {...props} /> : undefined}
          project={props.project} setProject={props.setProject} bridges={props.bridges} setBridges={props.setBridges} designCode={props.designCode} setDesignCode={props.setDesignCode}
          bridgeDefinitions={props.bridgeDefinitions} setBridgeDefinitions={props.setBridgeDefinitions}
          terrainId={props.terrainId} landXmlImportId={props.landXmlImportId} setTerrainId={props.setTerrainId} setLandXmlImportId={props.setLandXmlImportId}
          crossSectionValues={props.crossSectionValues} windLoads={props.windLoads} setWindLoads={props.setWindLoads}
          setCrossSectionValues={props.setCrossSectionValues}
        />}
  </div>
}

export default App
