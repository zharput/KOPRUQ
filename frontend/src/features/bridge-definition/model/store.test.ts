import { beforeEach, describe, expect, it } from 'vitest'
import { INITIAL_BRIDGES } from '../../project/model/types'
import { assignedAxis, axesFromSpans, BRIDGE_DEFINITIONS_STORAGE_KEY, createBridgeDefinition, ensureBridgeDefinitions, persistBridgeDefinitionStore, readBridgeDefinitionStore } from './store'

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

beforeEach(() => localStorage.clear())

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

  it('migrates legacy number-keyed storage and preserves selection and assignments', () => {
    const legacy = { ...assigned(), bridgeId: bridge.no }
    localStorage.setItem(BRIDGE_DEFINITIONS_STORAGE_KEY, JSON.stringify({ selectedBridgeId: bridge.no, definitions: { [bridge.no]: legacy } }))
    const migrated = readBridgeDefinitionStore([other, bridge])
    expect(migrated.selectedBridgeId).toBe(bridge.id)
    expect(migrated.definitions[bridge.id]).toEqual(assigned())
    expect(migrated.definitions).not.toHaveProperty(bridge.no)
    persistBridgeDefinitionStore(migrated)
    expect(readBridgeDefinitionStore([other, { ...bridge, no: 'VIA-99' }])).toEqual(migrated)
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
