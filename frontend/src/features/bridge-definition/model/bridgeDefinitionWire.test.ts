import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_BRIDGES } from '../../project/model/types'
import { ensureBridgeIds } from '../../project/model/projectWorkspace'
import type { SectionWriteEnvelope } from '../../../shared/project-store/projectApi'
import { parseProjectData, WireMappingError } from '../../../shared/project-store/projectDataValidation'
import { createProjectSession } from '../../../shared/project-store/projectSession'
import { createServerSection } from '../../../shared/project-store/serverSection'
import { createWriteQueue, SAVE_DEBOUNCE_MS } from '../../../shared/project-store/writeQueue'
import { BRIDGE_DEFINITIONS_SECTION, bridgeDefinitionsFromWire, bridgeDefinitionsToWire, bridgeDefinitionsWireSchema } from './bridgeDefinitionWire'
import { createBridgeDefinition, ensureBridgeDefinitions } from './store'
import type { BridgeDefinitionStore } from './types'

function richStore(): BridgeDefinitionStore {
  const bridges = ensureBridgeIds(INITIAL_BRIDGES.slice(1, 3))
  const store = ensureBridgeDefinitions({ keyBy: 'bridgeId', selectedBridgeId: null, definitions: {} }, bridges)
  const [first, second] = bridges
  const d = store.definitions[first.id as string]
  d.spanLengthsM = [30, 35, 40]
  d.axes = [
    { id: 'A1', name: 'A1', type: 'ABUTMENT', chainageM: 0, elevationM: 101.5, skewDegrees: null },
    { id: 'P1', name: 'P1', type: 'PIER', chainageM: 30, elevationM: null, skewDegrees: 5 },
    { id: 'P2', name: 'P2', type: 'PIER', chainageM: 65, elevationM: null, skewDegrees: null },
    { id: 'A2', name: 'A2', type: 'ABUTMENT', chainageM: 105, elevationM: 99, skewDegrees: -3.5 },
  ]
  d.selectedAxisId = 'A1'
  d.superstructureType = 'PRECAST_GIRDER'; d.girderFamilyId = 'PG-200'; d.girderVariantId = 'PG-H160'; d.girderCount = 5; d.deckWidthOverrideM = 13.8
  d.axisAssignments = {
    P1: { pierFamilyId: 'pier-1', pierHeightM: 12.5, pierCapFamilyId: 'cap-1', foundationFamilyId: 'fnd-1', foundationElevationM: 88, soilReference: 'BH-1', bearingFamilyId: 'brg-1', bearingQuantity: 4, bearingOrientation: 'x', longitudinalBehavior: 'free', transverseBehavior: 'fixed' },
    P2: { pierFamilyId: null, pierHeightM: null, pierCapFamilyId: null, foundationFamilyId: null, foundationElevationM: null, soilReference: '', bearingFamilyId: null, bearingQuantity: null, bearingOrientation: '', longitudinalBehavior: '', transverseBehavior: '' },
  }
  d.abutmentFamilyIds = { A1: 'abt-1', A2: null }
  d.constructionMethod = 'Launching'; d.constructionStagesNote = 'note'
  d.constraints = [
    { id: 'c1', kind: 'ROAD_RAILWAY', name: 'Highway', startChainageM: 10, endChainageM: 20, note: '' },
    { id: 'c2', kind: 'OTHER', name: 'x', startChainageM: null, endChainageM: null, note: 'n' },
  ]
  d.selectedConstraintId = 'c1'; d.viewMode = '3D'; d.terrainVisible = false
  store.selectedBridgeId = second.id as string
  return store
}

describe('bridge definitions wire mapping', () => {
  it('round-trips; UI-only fields come back as defaults and selectedBridgeId is null', () => {
    const store = richStore(); const wire = bridgeDefinitionsToWire(store)
    expect(parseProjectData(bridgeDefinitionsWireSchema, JSON.parse(JSON.stringify(wire)), 'value')).toEqual(wire)
    const back = bridgeDefinitionsFromWire(wire)
    const first = Object.keys(store.definitions)[0]
    expect(back.keyBy).toBe('bridgeId'); expect(back.selectedBridgeId).toBeNull()
    expect(back.definitions[first]).toEqual({ ...store.definitions[first], selectedAxisId: 'A1', selectedConstraintId: null, viewMode: 'PROFILE', terrainVisible: true })
    const second = Object.keys(store.definitions)[1]
    expect(back.definitions[second]).toEqual(store.definitions[second])
    expect(bridgeDefinitionsToWire(back)).toEqual(wire)
  })
  it('UI defaults used by fromWire equal those of createBridgeDefinition', () => {
    const bridge = ensureBridgeIds(INITIAL_BRIDGES.slice(0, 1))[0]
    const fresh = createBridgeDefinition(bridge)
    const wire = bridgeDefinitionsToWire({ keyBy: 'bridgeId', selectedBridgeId: null, definitions: { [bridge.id as string]: fresh } })
    const back = bridgeDefinitionsFromWire(wire).definitions[bridge.id as string]
    expect(back).toEqual(fresh)
  })
  it('emits keys in the backend record order, drops UI-only fields and sends nulls explicitly', () => {
    const wire = bridgeDefinitionsToWire(richStore())
    expect(Object.keys(wire)).toEqual(['definitions'])
    const d = wire.definitions[0]
    expect(Object.keys(d)).toEqual(['definitionKey', 'bridgeId', 'spanLengthsM', 'axes', 'superstructureType', 'girderFamilyId', 'girderVariantId', 'girderCount', 'deckWidthOverrideM', 'axisAssignments', 'abutmentFamilyIds', 'constructionMethod', 'constructionStagesNote', 'constraints'])
    expect(Object.keys(d.axes[0])).toEqual(['id', 'name', 'type', 'chainageM', 'elevationM', 'skewDegrees'])
    expect(Object.keys(d.axisAssignments[0])).toEqual(['axisId', 'pierFamilyId', 'pierHeightM', 'pierCapFamilyId', 'foundationFamilyId', 'foundationElevationM', 'soilReference', 'bearingFamilyId', 'bearingQuantity', 'bearingOrientation', 'longitudinalBehavior', 'transverseBehavior'])
    expect(Object.keys(d.constraints[0])).toEqual(['id', 'kind', 'name', 'startChainageM', 'endChainageM', 'note'])
    expect(Object.keys(d.abutmentFamilyIds)).toEqual(['A1', 'A2'])
    expect(d.axes[0].skewDegrees).toBeNull(); expect(d.axisAssignments[0].axisId).toBe('P1')
    const text = JSON.stringify(wire)
    for (const forbidden of ['selectedAxisId', 'selectedConstraintId', 'viewMode', 'terrainVisible', 'selectedBridgeId', 'keyBy']) expect(text).not.toContain(forbidden)
  })
  it('toWire rejects a legacy store (no keyBy) and a blank axis id', () => {
    const store = richStore()
    expect(() => bridgeDefinitionsToWire({ ...store, keyBy: undefined })).toThrow(WireMappingError)
    expect(() => bridgeDefinitionsToWire({ ...store, keyBy: undefined })).toThrow('Cannot send project data: keyBy - must be bridgeId')
    const first = Object.keys(store.definitions)[0]
    const blank = { ...store, definitions: { ...store.definitions, [first]: { ...store.definitions[first], axisAssignments: { '': store.definitions[first].axisAssignments.P1 } } } }
    expect(() => bridgeDefinitionsToWire(blank)).toThrow('definitions[0].axisAssignments. - must not be blank')
  })
  it('strict response schema rejects unknown keys and unknown enum values with the full path', () => {
    const wire = JSON.parse(JSON.stringify(bridgeDefinitionsToWire(richStore())))
    wire.definitions[0].viewMode = 'PROFILE'
    expect(() => parseProjectData(bridgeDefinitionsWireSchema, wire, 'bridgeDefinitions')).toThrow('bridgeDefinitions.definitions[0]')
    delete wire.definitions[0].viewMode; wire.definitions[0].constraints[1].kind = 'LAKE'
    expect(() => parseProjectData(bridgeDefinitionsWireSchema, wire, 'bridgeDefinitions')).toThrow('bridgeDefinitions.definitions[0].constraints[1].kind')
    wire.definitions[0].constraints[1].kind = 'OTHER'; wire.definitions[0].axes[0].type = 'ROOF'
    expect(() => parseProjectData(bridgeDefinitionsWireSchema, wire, 'bridgeDefinitions')).toThrow('definitions[0].axes[0].type')
  })
  it('section definition: path, not clearable, null -> undefined', () => {
    expect(BRIDGE_DEFINITIONS_SECTION).toMatchObject({ path: 'bridge-definitions', codec: { clearable: false } })
    expect(BRIDGE_DEFINITIONS_SECTION.codec.fromWire(null)).toBeUndefined()
  })
})

describe('bridge definitions wire mapping: edge cases', () => {
  it('keeps keys such as __proto__ as own properties (definition key and axis id)', () => {
    const wire = bridgeDefinitionsToWire(richStore())
    const raw = JSON.parse(JSON.stringify(wire)) as { definitions: { definitionKey: string; axisAssignments: { axisId: string }[] }[] }
    raw.definitions[0].definitionKey = '__proto__'; raw.definitions[0].axisAssignments[0].axisId = '__proto__'
    const back = bridgeDefinitionsFromWire(parseProjectData(bridgeDefinitionsWireSchema, raw, 'value'))
    expect(Object.keys(back.definitions)).toContain('__proto__')
    expect(Object.keys(Object.getOwnPropertyDescriptor(back.definitions, '__proto__')?.value.axisAssignments ?? {})).toContain('__proto__')
  })
})

describe('bridge definitions through a real ServerSection (echo keeps the reference)', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })
  it('an echo of the sent value (after a JSON round-trip and strict schema parse) keeps the same current reference, UI-only state included', async () => {
    const session = createProjectSession(); session.begin('p1', 1)
    const putSection = vi.fn(async (_projectId: string, _path: string, expectedRevision: number, value: unknown): Promise<SectionWriteEnvelope> => (
      { projectId: 'p1', revision: expectedRevision + 1, updatedAt: 'now', value: JSON.parse(JSON.stringify(value)) }))
    const queue = createWriteQueue({ session, putSection })
    const section = createServerSection(BRIDGE_DEFINITIONS_SECTION, { queue, session })
    const store = richStore(); section.hydrate(store)
    const first = Object.keys(store.definitions)[0]
    const edited: BridgeDefinitionStore = { ...store, definitions: { ...store.definitions, [first]: { ...store.definitions[first], spanLengthsM: [31, 35, 40], selectedAxisId: 'P1', viewMode: '3D', terrainVisible: false } } }
    const listener = vi.fn(); section.subscribe(listener)
    expect(section.write(edited)).toBe(true); expect(listener).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS); await vi.advanceTimersByTimeAsync(0)
    expect(putSection).toHaveBeenCalledTimes(1)
    expect(section.read()).toBe(edited); expect(listener).toHaveBeenCalledTimes(1)
    expect(section.read()?.definitions[first]).toMatchObject({ selectedAxisId: 'P1', viewMode: '3D', terrainVisible: false })
    expect(session.getSnapshot()).toMatchObject({ status: 'idle', revision: 2 })
  })
})
