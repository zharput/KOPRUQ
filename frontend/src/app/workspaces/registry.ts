import type { LucideIcon } from 'lucide-react'
import { Activity, Boxes, ChartNoAxesCombined, FolderKanban, GitBranch, Landmark, Network, TableProperties, Waypoints } from 'lucide-react'

export type WorkspaceId = 'project' | 'bridge-definition' | 'family-tables' | 'graph' | 'loads' | 'analysis' | 'optimization' | 'results' | 'bim-export'

export interface WorkspaceDefinition {
  id: WorkspaceId
  label: string
  Icon: LucideIcon
  leftHeading: string
  items: string[]
  centerHeading: string
  rightHeading: string
  rightDetails: string[]
}

export const WORKSPACES: WorkspaceDefinition[] = [
  { id: 'project', label: 'Project', Icon: FolderKanban, leftHeading: 'Project', items: ['Overview', 'Project Information', 'Design Settings', 'Site & Environment', 'Cost Database'], centerHeading: 'Project Workspace', rightHeading: 'Project Properties', rightDetails: ['Project information', 'Design settings', 'Site data'] },
  { id: 'bridge-definition', label: 'Bridge Definition', Icon: Landmark, leftHeading: 'Bridge Definition', items: ['Alignment', 'Span Arrangement', 'Superstructure', 'Supports', 'Foundations', 'Bearings', 'Construction', 'Constraints', 'Assembly'], centerHeading: 'Bridge Definition Workspace', rightHeading: 'Bridge Properties', rightDetails: ['Selected bridge', 'Bridge-instance assignments'] },
  { id: 'family-tables', label: 'Family Tables', Icon: TableProperties, leftHeading: 'Family Tables', items: ['Superstructure', 'Girder', 'Pier', 'Pier Cap', 'Abutment', 'Foundation', 'Bearing', 'Material'], centerHeading: 'Family Tables Workspace', rightHeading: 'Family Inspector', rightDetails: ['Selected family', 'Stable family ID', 'Bridge usage'] },
  { id: 'graph', label: 'Graph', Icon: Network, leftHeading: 'Node Library', items: [], centerHeading: 'Graph Workspace', rightHeading: 'Node Inspector', rightDetails: [] },
  { id: 'loads', label: 'Loads', Icon: Activity, leftHeading: 'Loads', items: ['Load Categories'], centerHeading: 'Loads Workspace', rightHeading: 'Load Properties', rightDetails: ['Project load definitions', 'Load parameter provenance'] },
  { id: 'analysis', label: 'Analysis', Icon: ChartNoAxesCombined, leftHeading: 'Analysis', items: ['FEM Model', 'Loads', 'Load Combinations', 'Solver', 'Design Checks'], centerHeading: 'Analysis Workspace', rightHeading: 'Analysis Properties', rightDetails: ['Analysis model', 'Solver settings', 'Design checks'] },
  { id: 'optimization', label: 'Optimization', Icon: GitBranch, leftHeading: 'Optimization', items: ['Design Variables', 'Objectives', 'Constraints', 'Algorithms'], centerHeading: 'Optimization Workspace', rightHeading: 'Optimization Properties', rightDetails: ['Design variables', 'Objectives', 'Constraints'] },
  { id: 'results', label: 'Results', Icon: Boxes, leftHeading: 'Results', items: ['Analysis Results', 'Design Checks', 'Alternatives', 'Reports'], centerHeading: 'Results Workspace', rightHeading: 'Result Details', rightDetails: ['Results will appear here'] },
  { id: 'bim-export', label: 'BIM / Export', Icon: Waypoints, leftHeading: 'BIM / Export', items: ['Allplan', 'MIDAS', 'IFC', 'Excel', 'Reports'], centerHeading: 'BIM / Export Workspace', rightHeading: 'Export Settings', rightDetails: ['Target format', 'Export options'] },
]

/** Workspaces exposed as primary navigation; Bridge Definition remains routable internally during migration. */
export const PRIMARY_WORKSPACES = WORKSPACES.filter((workspace) => workspace.id !== 'bridge-definition')

export function workspaceFromPath(pathname: string): WorkspaceDefinition | undefined {
  const match = pathname.match(/^\/(?:workspace\/)?([^/]+)(?:\/.*)?\/?$/)
  return WORKSPACES.find((workspace) => workspace.id === match?.[1])
}

const LEGACY_WORKSPACE: Partial<Record<string, WorkspaceId>> = {
  'project-dashboard': 'project', 'project-information': 'project', 'cost-database': 'project',
  alignment: 'bridge-definition', 'terrain-dtm': 'bridge-definition', 'gis-satellite': 'project', geotechnical: 'project', 'hydrology-hydraulic': 'project', constraints: 'bridge-definition', 'system-assembly': 'family-tables',
  materials: 'family-tables', 'superstructure-families': 'family-tables', 'girder-library': 'family-tables', 'preferred-span-families': 'family-tables', 'pier-families': 'family-tables', 'pier-cap-families': 'family-tables', 'abutment-families': 'family-tables', 'foundation-families': 'family-tables', 'bearing-families': 'family-tables', 'standardization-rules': 'family-tables',
  'load-combinations': 'loads', 'bridge-inventory': 'project', 'bridge-site': 'bridge-definition', 'layout-generator': 'graph', 'layout-alternatives': 'graph', 'selected-layout': 'graph', 'bridge-superstructure': 'bridge-definition', 'bridge-piers': 'bridge-definition', 'bridge-abutments': 'bridge-definition', 'bridge-bearings': 'bridge-definition', 'bridge-foundations': 'bridge-definition', 'bridge-alternatives': 'graph',
  'model-reduction': 'analysis', 'spanova-fast-solver': 'analysis', 'analysis-queue': 'analysis', 'opensees-verification': 'analysis', 'midas-nx-final-verification': 'analysis',
  'layout-optimization': 'optimization', 'structural-optimization': 'optimization', 'bridge-optimization': 'optimization', 'corridor-optimization': 'optimization', standardization: 'optimization', 'pareto-explorer': 'optimization', reports: 'bim-export', '3d-visualization': 'bridge-definition', settings: 'project', help: 'project',
}

export function legacyWorkspaceFromPath(pathname: string): WorkspaceDefinition | undefined {
  const match = pathname.match(/^\/([^/]+)\/?$/)
  const id = match?.[1]
  if (!id || id === 'home' || WORKSPACES.some((workspace) => workspace.id === id)) return undefined
  const workspaceId = LEGACY_WORKSPACE[id] ?? 'project'
  return WORKSPACES.find((workspace) => workspace.id === workspaceId)
}

export function legacyItemFromPath(pathname: string): string | undefined {
  const section = pathname.match(/^\/([^/]+)\/?$/)?.[1]
  const itemBySection: Record<string, string> = {
    'project-dashboard': 'Overview', 'project-information': 'Project Information', 'cost-database': 'Cost Database',
    'system-assembly': 'Assembly', materials: 'Material', 'superstructure-families': 'Superstructure', 'girder-library': 'Girder', 'preferred-span-families': 'Preferred Span', 'pier-families': 'Pier', 'pier-cap-families': 'Pier Cap', 'foundation-families': 'Foundation', 'bearing-families': 'Bearing', 'abutment-families': 'Abutment', 'standardization-rules': 'Standardization Rules',
  }
  return section ? itemBySection[section] : undefined
}
