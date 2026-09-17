import { useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import type { CrossSectionValues } from '../../features/superstructure-families'
import FamilyTablesWorkspace from '../../features/family-tables/components/FamilyTablesWorkspace'
import LoadsPanel from '../../features/loads/components/LoadsPanel'
import ProjectWorkspace from '../../features/project/components/ProjectWorkspace'
import type { ProjectWorkspaceData } from '../../features/project/model/projectWorkspace'
import type { BridgeRow } from '../../features/project/model/types'
import BridgeDefinitionWorkspace from '../../features/bridge-definition/components/BridgeDefinitionWorkspace'
import GraphWorkspace from '../../features/graph/ui/GraphWorkspace'
import type { BridgeDefinitionStore } from '../../features/bridge-definition/model/types'
import WorkspaceLayout from '../layout/WorkspaceLayout'
import type { WorkspaceDefinition } from './registry'

export default function WorkspacePage({ workspace, initialSelectedItem, mainContentOverride, crossSectionValues, setCrossSectionValues, project, setProject, bridges, setBridges, designCode, setDesignCode, bridgeDefinitions, setBridgeDefinitions, terrainId, landXmlImportId, setTerrainId, setLandXmlImportId }: { workspace: WorkspaceDefinition; initialSelectedItem?: string; mainContentOverride?: ReactNode; crossSectionValues: CrossSectionValues; setCrossSectionValues: Dispatch<SetStateAction<CrossSectionValues>>; project: ProjectWorkspaceData; setProject: (project: ProjectWorkspaceData) => void; bridges: BridgeRow[]; setBridges: Dispatch<SetStateAction<BridgeRow[]>>; designCode: string; setDesignCode: Dispatch<SetStateAction<string>>; bridgeDefinitions: BridgeDefinitionStore; setBridgeDefinitions: Dispatch<SetStateAction<BridgeDefinitionStore>>; terrainId: string | null; landXmlImportId: string | null; setTerrainId: Dispatch<SetStateAction<string | null>>; setLandXmlImportId: Dispatch<SetStateAction<string | null>> }) {
  const [selectedItem, setSelectedItem] = useState(initialSelectedItem ?? workspace.items[0] ?? '')
  if (workspace.id === 'graph' && !mainContentOverride) return <GraphWorkspace />
  if (workspace.id === 'project' && !mainContentOverride) return <ProjectWorkspace path={window.location.pathname} project={project} setProject={setProject} bridges={bridges} setBridges={setBridges} designCode={designCode} setDesignCode={setDesignCode} />
  if (workspace.id === 'bridge-definition' && !mainContentOverride) return <BridgeDefinitionWorkspace bridges={bridges} project={project} store={bridgeDefinitions} setStore={setBridgeDefinitions} terrainId={terrainId} landXmlImportId={landXmlImportId} setTerrainId={setTerrainId} setLandXmlImportId={setLandXmlImportId} />
  if (workspace.id === 'family-tables' && !mainContentOverride) return <FamilyTablesWorkspace crossSectionValues={crossSectionValues} setCrossSectionValues={setCrossSectionValues} />
  const workspaceMain = workspace.id === 'loads'
    ? <div className="spn-workspace-feature"><LoadsPanel crossSectionValues={crossSectionValues} /></div>
    : <div className="spn-workspace-placeholder"><h1>{workspace.centerHeading}</h1><p>{workspace.id === 'graph' ? 'Node-based bridge workflow editor will be available in Phase 3A.' : selectedItem ? `${selectedItem} â€” workspace placeholder` : 'Workspace placeholder'}</p></div>
  const mainContent = mainContentOverride ?? workspaceMain
  const leftPanel = workspace.items.length > 0 ? <nav className="spn-workspace-tree" aria-label={`${workspace.leftHeading} sections`}>{workspace.items.map((item) => <button key={item} type="button" className={selectedItem === item ? 'active' : ''} onClick={() => setSelectedItem(item)}>{item}</button>)}</nav> : <p className="spn-workspace-muted">No nodes available yet.</p>
  const rightPanel = <div className="spn-workspace-inspector">{workspace.rightDetails.map((detail) => <div className="spn-workspace-inspector-row" key={detail}><span>{detail}</span><strong>â€”</strong></div>)}</div>
  return <WorkspaceLayout leftTitle={workspace.leftHeading} leftPanel={leftPanel} mainContent={mainContent} rightTitle={workspace.rightHeading} rightPanel={rightPanel} />
}
