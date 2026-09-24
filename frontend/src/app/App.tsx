import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { BrowserRouter, Navigate, useLocation } from 'react-router-dom'
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
import { ensureBridgeIds, readProjectState, persistProjectState, type ProjectWorkspaceData } from '../features/project/model/projectWorkspace'

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

/**
 * Single SPANOVA shell: app-wide project state/providers stay above the
 * URL-selected workspace, while old one-segment feature routes render
 * their existing screens in the workspace center. The legacy Sidebar
 * and TopBar sources remain available but are no longer mounted here.
 */
function App() {
  const [summary, setSummary] = useState<GenerationSummary | null>(null)
  const [layoutSeed, setLayoutSeed] = useState<LayoutSeed | null>(null)
  const [projectState, setProjectState] = useState(() => readProjectState(INITIAL_BRIDGES))
  useEffect(() => { persistProjectState(projectState); window.dispatchEvent(new Event('spanova:project-units-changed')) }, [projectState])
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
  const terrainId = projectState.project.environment.terrainDatasetId
  const landXmlImportId = projectState.project.environment.landXmlImportId
  const setTerrainId: Dispatch<SetStateAction<string | null>> = (update) => setProjectState((previous) => ({ ...previous, project: { ...previous.project, environment: { ...previous.project.environment, terrainDatasetId: typeof update === 'function' ? update(previous.project.environment.terrainDatasetId) : update } } }))
  const setLandXmlImportId: Dispatch<SetStateAction<string | null>> = (update) => setProjectState((previous) => ({ ...previous, project: { ...previous.project, environment: { ...previous.project.environment, landXmlImportId: typeof update === 'function' ? update(previous.project.environment.landXmlImportId) : update } } }))

  return (
    <AppProviders>
      <BrowserRouter>
        <RoutedApplication
          summary={summary} onGenerated={setSummary} layoutSeed={layoutSeed} setLayoutSeed={setLayoutSeed}
          bridges={bridges} setBridges={setBridges} designCode={designCode} setDesignCode={setDesignCode}
          project={projectState.project} setProject={(project: ProjectWorkspaceData) => setProjectState((previous) => ({ ...previous, project }))}
          bridgeDefinitions={bridgeDefinitions} setBridgeDefinitions={setBridgeDefinitions}
          crossSectionValues={crossSectionValues} setCrossSectionValues={setCrossSectionValues}
          terrainId={terrainId} setTerrainId={setTerrainId} landXmlImportId={landXmlImportId} setLandXmlImportId={setLandXmlImportId}
        />
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
  setCrossSectionValues: Dispatch<SetStateAction<CrossSectionValues>>
  terrainId: string | null
  setTerrainId: Dispatch<SetStateAction<string | null>>
  landXmlImportId: string | null
  setLandXmlImportId: Dispatch<SetStateAction<string | null>>
  project: ProjectWorkspaceData
  setProject: (project: ProjectWorkspaceData) => void
  bridgeDefinitions: BridgeDefinitionStore
  setBridgeDefinitions: Dispatch<SetStateAction<BridgeDefinitionStore>>
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
    <TopWorkspaceNav />
    {isHomeRoute || isUnknownWorkspaceRoute || location.pathname === '/project-dashboard'
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
          crossSectionValues={props.crossSectionValues}
          setCrossSectionValues={props.setCrossSectionValues}
        />}
  </div>
}

export default App
