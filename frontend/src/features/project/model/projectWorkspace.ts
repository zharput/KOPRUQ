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

export const INITIAL_PROJECT: ProjectWorkspaceData = {
  name: '', id: '', client: '', designer: '', country: '', region: '', projectType: '', status: '', startDate: '', targetDate: '', description: '', locationStart: '', locationEnd: '', coordinateSystem: '',
  designStandardFamily: 'Eurocode', concreteCode: '', steelCode: '', compositeCode: '', seismicCode: '', geotechnicalCode: '', trafficLoadStandard: '',
  units: { length: 'm', force: 'kN', moment: 'kN·m', stress: 'MPa', mass: 't', temperature: '°C' },
  coordinate: { name: '', epsg: '', horizontalDatum: '', verticalDatum: '', originX: '', originY: '', originZ: '', northAngle: '' },
  criteria: { designLife: '', reliabilityClass: '', exposure: '', concreteClass: '', cover: '', philosophy: '' }, environment: { terrainDatasetId: null, landXmlImportId: null }, lastModified: '',
}

const STORAGE_KEY = 'spanova.project-workspace.v1'
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

export function readProjectState(fallbackBridges: BridgeRow[]): PersistedProjectState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { project: INITIAL_PROJECT, bridges: ensureBridgeIds(fallbackBridges) }
    const saved = JSON.parse(raw) as Partial<PersistedProjectState>
    return {
      project: { ...INITIAL_PROJECT, ...saved.project, units: { ...INITIAL_PROJECT.units, ...saved.project?.units }, coordinate: { ...INITIAL_PROJECT.coordinate, ...saved.project?.coordinate }, criteria: { ...INITIAL_PROJECT.criteria, ...saved.project?.criteria }, environment: { ...INITIAL_PROJECT.environment, ...saved.project?.environment } },
      bridges: ensureBridgeIds(Array.isArray(saved.bridges) ? saved.bridges : fallbackBridges),
    }
  } catch { return { project: INITIAL_PROJECT, bridges: ensureBridgeIds(fallbackBridges) } }
}

export function persistProjectState(state: PersistedProjectState): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true } catch { return false }
}
