import type { BridgeRow } from './types'

export interface ProjectWorkspaceData {
  name: string
  id: string
  client: string
  designer: string
  country: string
  region: string
  projectType: string
  status: string
  startDate: string
  targetDate: string
  description: string
  locationStart: string
  locationEnd: string
  coordinateSystem: string
  designStandardFamily: string
  concreteCode: string
  steelCode: string
  compositeCode: string
  seismicCode: string
  geotechnicalCode: string
  trafficLoadStandard: string
  units: { length: string; force: string; moment: string; stress: string; mass: string; temperature: string }
  coordinate: { name: string; epsg: string; horizontalDatum: string; verticalDatum: string; originX: string; originY: string; originZ: string; northAngle: string }
  criteria: { designLife: string; reliabilityClass: string; exposure: string; concreteClass: string; cover: string; philosophy: string }
  environment: { terrainDatasetId: string | null; landXmlImportId: string | null }
  lastModified: string
}

/** Unit selections are stored as unit ids (quantities.ts), never as display labels. Old files/storage may hold labels (even mojibake ones). */
export function normalizeUnitId(value: string): string {
  // Most specific labels first: 'kNÂ·mm' and 'kNÂ·m' also contain 'NÂ·m'.
  if (value === 'kN·mm' || value.includes('kNÂ·mm')) return 'kNmm'
  if (value === 'kN·m' || value.includes('kNÂ·m')) return 'kNm'
  if (value === 'MN·m' || value.includes('MNÂ·m')) return 'MNm'
  if (value === 'N·m' || value.includes('NÂ·m')) return 'Nm'
  if (value === '°C' || value.includes('Â°C')) return 'C'
  if (value === '°F' || value.includes('Â°F')) return 'F'
  return value
}
export function normalizeProjectUnits(units: ProjectWorkspaceData['units']): ProjectWorkspaceData['units'] {
  return Object.fromEntries(Object.entries(units).map(([key, value]) => [key, typeof value === 'string' ? normalizeUnitId(value) : value])) as ProjectWorkspaceData['units']
}

export const INITIAL_PROJECT: ProjectWorkspaceData = {
  name: '', id: '', client: '', designer: '', country: '', region: '', projectType: '', status: '', startDate: '', targetDate: '', description: '', locationStart: '', locationEnd: '', coordinateSystem: '',
  designStandardFamily: 'Eurocode', concreteCode: '', steelCode: '', compositeCode: '', seismicCode: '', geotechnicalCode: '', trafficLoadStandard: '',
  units: { length: 'm', force: 'kN', moment: 'kNm', stress: 'MPa', mass: 't', temperature: 'C' },
  coordinate: { name: '', epsg: '', horizontalDatum: '', verticalDatum: '', originX: '', originY: '', originZ: '', northAngle: '' },
  criteria: { designLife: '', reliabilityClass: '', exposure: '', concreteClass: '', cover: '', philosophy: '' }, environment: { terrainDatasetId: null, landXmlImportId: null }, lastModified: '',
}

export interface PersistedProjectState { project: ProjectWorkspaceData; bridges: BridgeRow[] }

function newBridgeId() {
  return globalThis.crypto?.randomUUID?.() ?? `bridge-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** One-time, persistence-backed identity migration. Never keys identity by row order or display No. */
export function ensureBridgeIds(bridges: BridgeRow[]): BridgeRow[] {
  const used = new Set<string>()
  return bridges.map((bridge) => {
    const id = bridge.id && !used.has(bridge.id) ? bridge.id : newBridgeId()
    used.add(id)
    return bridge.id === id ? bridge : { ...bridge, id }
  })
}

/** Pure normalization shared by storage reads and file opens: fills defaults, converts unit labels to ids, gives every bridge an id. */
export function normalizeProjectState(saved: { project?: Partial<ProjectWorkspaceData> & { units?: Partial<ProjectWorkspaceData['units']>; coordinate?: Partial<ProjectWorkspaceData['coordinate']>; criteria?: Partial<ProjectWorkspaceData['criteria']>; environment?: Partial<ProjectWorkspaceData['environment']> }; bridges?: BridgeRow[] }, fallbackBridges: BridgeRow[]): PersistedProjectState {
  return {
    project: { ...INITIAL_PROJECT, ...saved.project, units: normalizeProjectUnits({ ...INITIAL_PROJECT.units, ...saved.project?.units }), coordinate: { ...INITIAL_PROJECT.coordinate, ...saved.project?.coordinate }, criteria: { ...INITIAL_PROJECT.criteria, ...saved.project?.criteria }, environment: { ...INITIAL_PROJECT.environment, ...saved.project?.environment } },
    bridges: ensureBridgeIds(Array.isArray(saved.bridges) ? saved.bridges : fallbackBridges),
  }
}
