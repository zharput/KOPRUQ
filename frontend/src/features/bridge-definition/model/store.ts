import type { BridgeRow } from '../../project/model/types'
import type { AxisFamilyAssignments, BridgeAxis, BridgeDefinitionStore, BridgeInstanceDefinition } from './types'

const STORAGE_KEY = 'kopruq.bridge-definitions.v1'
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
  return {
    bridgeId: bridge.no, spanLengthsM: [], axes: [], selectedAxisId: null, superstructureType: bridge.bridgeType,
    girderFamilyId: null, girderVariantId: null, girderCount: null, deckWidthOverrideM: null, axisAssignments: {},
    abutmentFamilyIds: { A1: null, A2: null }, constructionMethod: '', constructionStagesNote: '', constraints: [], selectedConstraintId: null,
    viewMode: 'PROFILE', terrainVisible: true,
  }
}

function mergeDefinition(bridge: BridgeRow, input?: Partial<BridgeInstanceDefinition>): BridgeInstanceDefinition {
  const initial = createBridgeDefinition(bridge)
  const definition = { ...initial, ...input, bridgeId: bridge.no, abutmentFamilyIds: { ...initial.abutmentFamilyIds, ...input?.abutmentFamilyIds } }
  definition.spanLengthsM = Array.isArray(input?.spanLengthsM) ? input.spanLengthsM.filter((value) => Number.isFinite(value) && value > 0) : []
  definition.axes = axesFromSpans(definition.spanLengthsM, Array.isArray(input?.axes) ? input.axes : [])
  definition.axisAssignments = Object.fromEntries(Object.entries(input?.axisAssignments ?? {}).map(([id, value]) => [id, { ...blankAssignments(), ...value }]))
  if (!definition.selectedAxisId || !definition.axes.some((axis) => axis.id === definition.selectedAxisId)) definition.selectedAxisId = definition.axes[0]?.id ?? null
  return definition
}

export function readBridgeDefinitionStore(bridges: BridgeRow[]): BridgeDefinitionStore {
  let saved: Partial<BridgeDefinitionStore> = {}
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<BridgeDefinitionStore> } catch { /* empty store */ }
  const definitions = Object.fromEntries(bridges.map((bridge) => [bridge.no, mergeDefinition(bridge, saved.definitions?.[bridge.no])]))
  const selectedBridgeId = bridges.some((bridge) => bridge.no === saved.selectedBridgeId) ? saved.selectedBridgeId! : bridges[0]?.no ?? null
  return { selectedBridgeId, definitions }
}

export function ensureBridgeDefinitions(store: BridgeDefinitionStore, bridges: BridgeRow[]): BridgeDefinitionStore {
  const definitions = Object.fromEntries(bridges.map((bridge) => [bridge.no, mergeDefinition(bridge, store.definitions[bridge.no])]))
  const selectedBridgeId = bridges.some((bridge) => bridge.no === store.selectedBridgeId) ? store.selectedBridgeId : bridges[0]?.no ?? null
  return { selectedBridgeId, definitions }
}

export function persistBridgeDefinitionStore(store: BridgeDefinitionStore): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)) } catch { /* storage unavailable; app state remains active */ }
}

export function assignedAxis(assignment?: Partial<AxisFamilyAssignments>): AxisFamilyAssignments {
  return { ...blankAssignments(), ...assignment }
}
