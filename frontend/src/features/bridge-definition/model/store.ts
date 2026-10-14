import { useSyncExternalStore } from 'react'
import type { BridgeRow } from '../../project/model/types'
import { onProjectSwitch } from '../../../shared/project-store/activeProject'
import { readProjectState, subscribeProjectState } from '../../project/model/projectWorkspace'
import { BRIDGE_DEFINITIONS_SERVER_SECTION } from './bridgeDefinitionServerSection'
import type { AxisFamilyAssignments, BridgeAxis, BridgeDefinitionStore, BridgeInstanceDefinition } from './types'

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
/** The un-reconciled value of the `bridge-definitions` section ({} while the section has no value); UI-only fields are not part of it. */
export function readStoredBridgeDefinitions(): StoredBridgeDefinitions {
  return (BRIDGE_DEFINITIONS_SERVER_SECTION.read() ?? {}) as unknown as StoredBridgeDefinitions
}

/**
 * UI-only state of the bridge definitions (BACKEND-DB-PERSISTENCE M5c, D6): the selected bridge and, per bridge, the selected axis /
 * constraint, view mode and terrain visibility. It is never sent to the server; it lives in memory and is reset when the project changes.
 */
type BridgeUiFields = Pick<BridgeInstanceDefinition, 'selectedAxisId' | 'selectedConstraintId' | 'viewMode' | 'terrainVisible'>
type UiLayer = { selectedBridgeId: string | null | undefined; byBridge: Readonly<Record<string, BridgeUiFields>> }
const EMPTY_UI_LAYER: UiLayer = { selectedBridgeId: undefined, byBridge: {} }
let uiLayer: UiLayer = EMPTY_UI_LAYER
const uiListeners = new Set<() => void>()
const notifyUi = () => { for (const listener of [...uiListeners]) listener() }
// A project switch resets the layer without notification: sections are hydrated right after and notify.
onProjectSwitch(() => { uiLayer = EMPTY_UI_LAYER })

let memo: { section: BridgeDefinitionStore | undefined; bridges: BridgeRow[]; layer: UiLayer; value: BridgeDefinitionStore } | undefined
/**
 * The bridge definitions: section data reconciled with `bridges` (default: the open workspace) plus the UI layer. The result is
 * memoized on the section value, the bridge list and the layer, so it is a stable `useSyncExternalStore` snapshot.
 */
export function readBridgeDefinitionStore(bridges: BridgeRow[] = readProjectState().bridges): BridgeDefinitionStore {
  const section = BRIDGE_DEFINITIONS_SERVER_SECTION.read()
  if (memo && memo.section === section && memo.bridges === bridges && memo.layer === uiLayer) return memo.value
  const layer = uiLayer
  const merged = Object.fromEntries(Object.entries(section?.definitions ?? {}).map(([key, definition]) => [key, { ...definition, ...layer.byBridge[definition.bridgeId] }]))
  const value = ensureBridgeDefinitions({ keyBy: 'bridgeId', selectedBridgeId: layer.selectedBridgeId ?? null, definitions: merged }, bridges)
  memo = { section, bridges, layer, value }
  return value
}

/** Data goes to the section (one PUT only when it differs from the server value); UI-only fields go to the UI layer. false: not accepted. */
export function writeBridgeDefinitionStore(next: BridgeDefinitionStore): boolean {
  const previous = uiLayer
  uiLayer = {
    selectedBridgeId: next.selectedBridgeId,
    byBridge: Object.fromEntries(Object.values(next.definitions).map(({ bridgeId, selectedAxisId, selectedConstraintId, viewMode, terrainVisible }) => [bridgeId, { selectedAxisId, selectedConstraintId, viewMode, terrainVisible }])),
  }
  if (!BRIDGE_DEFINITIONS_SERVER_SECTION.write(next)) { uiLayer = previous; return false }
  notifyUi()
  return true
}

export function subscribeBridgeDefinitionStore(listener: () => void): () => void {
  uiListeners.add(listener)
  const unsubscribes = [BRIDGE_DEFINITIONS_SERVER_SECTION.subscribe(listener), subscribeProjectState(listener)]
  return () => { uiListeners.delete(listener); unsubscribes.forEach((unsubscribe) => unsubscribe()) }
}

/** The bridge definitions of the open project; re-renders when the data, the workspace bridges or the UI layer change. */
export function useBridgeDefinitionStore(): BridgeDefinitionStore {
  return useSyncExternalStore(subscribeBridgeDefinitionStore, () => readBridgeDefinitionStore())
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

export function assignedAxis(assignment?: Partial<AxisFamilyAssignments>): AxisFamilyAssignments {
  return { ...blankAssignments(), ...assignment }
}
