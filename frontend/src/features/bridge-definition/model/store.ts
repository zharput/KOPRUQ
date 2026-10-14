import type { BridgeRow } from '../../project/model/types'
import { PROJECT_DATA_CHANGED_EVENT } from '../../../shared/project-file/projectDataEvents'
import type { AxisFamilyAssignments, BridgeAxis, BridgeDefinitionStore, BridgeInstanceDefinition } from './types'

export const BRIDGE_DEFINITIONS_STORAGE_KEY = 'kopruq.bridge-definitions.v1'
const STORAGE_KEY = BRIDGE_DEFINITIONS_STORAGE_KEY
const blankAssignments = (): AxisFamilyAssignments => ({
  pierFamilyId: null, pierHeightM: null, pierCapFamilyId: null, foundationFamilyId: null, foundationElevationM: null, soilReference: '',
  bearingFamilyId: null, bearingQuantity: null, bearingOrientation: '', longitudinalBehavior: '', transverseBehavior: '',
})

export function axesFromSpans(spans: number[], previous: BridgeAxis[] = []): BridgeAxis[] {
  if (!spans.length) return []
  let chainageM = 0
  return Array.from({ length: spans.length + 1 }, (_, index) => {
    if (index > 0) chainageM += spans[index - 1]
    const id = index === 0 ? 'A1' : index === spans.length ? 'A2' : `P${index}`
    const old = previous.find((axis) => axis.id === id)
    return { id, name: id, type: id.startsWith('A') ? 'ABUTMENT' : 'PIER', chainageM, elevationM: old?.elevationM ?? null, skewDegrees: old?.skewDegrees ?? null }
  })
}

export function createBridgeDefinition(bridge: BridgeRow): BridgeInstanceDefinition {
  if (!bridge.id) throw new Error('Bridge definitions require a stable bridge id.')
  return {
    bridgeId: bridge.id, spanLengthsM: [], axes: [], selectedAxisId: null, superstructureType: bridge.bridgeType,
    girderFamilyId: null, girderVariantId: null, girderCount: null, deckWidthOverrideM: null, axisAssignments: {},
    abutmentFamilyIds: { A1: null, A2: null }, constructionMethod: '', constructionStagesNote: '', constraints: [], selectedConstraintId: null,
    viewMode: 'PROFILE', terrainVisible: true,
  }
}

function mergeDefinition(bridge: BridgeRow, input?: Partial<BridgeInstanceDefinition>): BridgeInstanceDefinition {
  const initial = createBridgeDefinition(bridge)
  const definition = { ...initial, ...input, bridgeId: initial.bridgeId, abutmentFamilyIds: { ...initial.abutmentFamilyIds, ...input?.abutmentFamilyIds } }
  definition.spanLengthsM = Array.isArray(input?.spanLengthsM) ? input.spanLengthsM.filter((value) => Number.isFinite(value) && value > 0) : []
  definition.axes = axesFromSpans(definition.spanLengthsM, Array.isArray(input?.axes) ? input.axes : [])
  definition.axisAssignments = Object.fromEntries(Object.entries(input?.axisAssignments ?? {}).map(([id, value]) => [id, { ...blankAssignments(), ...value }]))
  if (!definition.selectedAxisId || !definition.axes.some((axis) => axis.id === definition.selectedAxisId)) definition.selectedAxisId = definition.axes[0]?.id ?? null
  return definition
}

export type StoredBridgeDefinitions = { keyBy?: 'bridgeId'; selectedBridgeId?: string | null; definitions?: Record<string, Record<string, unknown>> }
/** Raw, un-normalized stored value (legacy number-keyed stores stay as they are). undefined: storage unavailable or unreadable JSON; {} when absent. */
export function readStoredBridgeDefinitions(): StoredBridgeDefinitions | undefined {
  if (typeof localStorage === 'undefined') return undefined
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as StoredBridgeDefinitions } catch { return undefined }
}

export function readBridgeDefinitionStore(bridges: BridgeRow[]): BridgeDefinitionStore {
  let saved: Partial<BridgeDefinitionStore> = {}
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<BridgeDefinitionStore> } catch { /* empty store */ }
  return ensureBridgeDefinitions(saved, bridges)
}

/** Migrates legacy number-keyed records once; normalized records never fall back to display numbers. */
export function ensureBridgeDefinitions(store: Partial<BridgeDefinitionStore>, bridges: BridgeRow[]): BridgeDefinitionStore {
  const legacy = store.keyBy !== 'bridgeId'
  const definitions = Object.fromEntries(bridges.map((bridge) => {
    const key = legacy ? bridge.no : bridge.id
    const definition = mergeDefinition(bridge, key === undefined ? undefined : store.definitions?.[key])
    return [definition.bridgeId, definition]
  }))
  const selected = bridges.find((bridge) => (legacy ? bridge.no : bridge.id) === store.selectedBridgeId)
  return { keyBy: 'bridgeId', selectedBridgeId: selected?.id ?? bridges[0]?.id ?? null, definitions }
}

export function persistBridgeDefinitionStore(store: BridgeDefinitionStore): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PROJECT_DATA_CHANGED_EVENT, { detail: { source: 'bridge-definitions' } })) } catch { /* storage unavailable; app state remains active */ }
}

export function assignedAxis(assignment?: Partial<AxisFamilyAssignments>): AxisFamilyAssignments {
  return { ...blankAssignments(), ...assignment }
}
