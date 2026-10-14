import { beforeEach, describe, expect, it } from 'vitest'
import { INITIAL_BRIDGES } from '../../project/model/types'
import { assignedAxis, axesFromSpans, createBridgeDefinition, ensureBridgeDefinitions, readBridgeDefinitionStore, readStoredBridgeDefinitions, writeBridgeDefinitionStore } from './store'
import { resetProjectData, seedProjectData } from '../../../test/projectStoreTestUtils'

const bridge = { ...INITIAL_BRIDGES[0], id: 'bridge-1', no: 'VIA-01' }
const other = { ...INITIAL_BRIDGES[1], id: 'bridge-2', no: 'VIA-02' }
const assigned = () => ({
  ...createBridgeDefinition(bridge), bridgeId: bridge.id,
  spanLengthsM: [30, 40], axes: axesFromSpans([30, 40]), selectedAxisId: 'P1',
  girderFamilyId: 'GIRDER-1', girderVariantId: 'VARIANT-1',
  axisAssignments: { P1: assignedAxis({ pierFamilyId: 'PIER-1', foundationFamilyId: 'FOUNDATION-1', bearingFamilyId: 'BEARING-1' }) },
  abutmentFamilyIds: { A1: 'ABUTMENT-1', A2: 'ABUTMENT-2' },
  constructionStagesNote: 'Keep this assignment',
})

beforeEach(() => resetProjectData())

describe('bridge definition identity', () => {
  it('keys new definitions and selection by the stable bridge id', () => {
    const store = ensureBridgeDefinitions({ selectedBridgeId: null, definitions: {} }, [bridge, other])
    expect(Object.keys(store.definitions)).toEqual([bridge.id, other.id])
    expect(store.selectedBridgeId).toBe(bridge.id)
    expect(store.definitions[bridge.id].bridgeId).toBe(bridge.id)
  })

  it('preserves all assigned data and selection when the display number changes', () => {
    const definition = assigned()
    const store = ensureBridgeDefinitions({ selectedBridgeId: bridge.no, definitions: { [bridge.no]: definition } }, [other, bridge])
    const renamed = ensureBridgeDefinitions(store, [other, { ...bridge, no: 'VIA-99' }])
    expect(renamed.selectedBridgeId).toBe(bridge.id)
    expect(renamed.definitions[bridge.id]).toEqual(definition)
    expect(renamed.definitions[other.id]).toEqual(store.definitions[other.id])
  })

  it('does not exchange definitions when display numbers are swapped', () => {
    const store = ensureBridgeDefinitions({ selectedBridgeId: bridge.no, definitions: { [bridge.no]: assigned() } }, [bridge, other])
    const swapped = ensureBridgeDefinitions(store, [{ ...bridge, no: other.no }, { ...other, no: bridge.no }])
    expect(swapped.definitions[bridge.id].girderFamilyId).toBe('GIRDER-1')
    expect(swapped.definitions[other.id].girderFamilyId).toBeNull()
  })

  it('migrates legacy number-keyed definitions and preserves selection and assignments', () => {
    const legacy = { ...assigned(), bridgeId: bridge.no }
    const migrated = ensureBridgeDefinitions({ selectedBridgeId: bridge.no, definitions: { [bridge.no]: legacy } }, [other, bridge])
    expect(migrated.selectedBridgeId).toBe(bridge.id)
    expect(migrated.definitions[bridge.id]).toEqual(assigned())
    expect(migrated.definitions).not.toHaveProperty(bridge.no)
    expect(ensureBridgeDefinitions(migrated, [other, { ...bridge, no: 'VIA-99' }])).toEqual(migrated)
  })

  it('reads the section data reconciled with the workspace bridges and returns the same object until something changes', () => {
    seedProjectData('workspace', { bridges: [other, bridge] })
    seedProjectData('bridgeDefinitions', { keyBy: 'bridgeId', selectedBridgeId: bridge.id, definitions: { [bridge.id]: assigned() } })
    const first = readBridgeDefinitionStore()
    expect(first.definitions[bridge.id]).toEqual(assigned())
    expect(readBridgeDefinitionStore()).toBe(first)
    expect(writeBridgeDefinitionStore({ ...first, definitions: { ...first.definitions, [bridge.id]: { ...assigned(), girderFamilyId: 'GIRDER-2' } } })).toBe(true)
    expect(readBridgeDefinitionStore().definitions[bridge.id].girderFamilyId).toBe('GIRDER-2')
  })

  it('does not give a replacement bridge the deleted bridge assignments', () => {
    const store = ensureBridgeDefinitions({ selectedBridgeId: bridge.no, definitions: { [bridge.no]: assigned() } }, [bridge])
    const replacement = { ...bridge, id: 'replacement' }
    const next = ensureBridgeDefinitions(store, [replacement])
    expect(next.selectedBridgeId).toBe(replacement.id)
    expect(next.definitions[replacement.id].girderFamilyId).toBeNull()
    expect(next.definitions).not.toHaveProperty(bridge.id)
  })
})

describe('raw stored bridge definitions', () => {
  it('returns the section value un-reconciled', () => {
    seedProjectData('workspace', { bridges: [bridge] })
    seedProjectData('bridgeDefinitions', { keyBy: 'bridgeId', selectedBridgeId: bridge.id, definitions: { [bridge.id]: assigned() } })
    expect(readStoredBridgeDefinitions()).toMatchObject({ keyBy: 'bridgeId', definitions: { [bridge.id]: { girderFamilyId: 'GIRDER-1' } } })
  })

  it('returns an empty object while the section has no value', () => {
    expect(readStoredBridgeDefinitions()).toEqual({})
  })
})
