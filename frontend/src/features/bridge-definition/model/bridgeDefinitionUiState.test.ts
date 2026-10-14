import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CANONICAL_PROJECT_DOCUMENT_JSON } from '../../../app/project-session/projectDocumentFixtures'
import { SAVE_DEBOUNCE_MS } from '../../../shared/project-store/writeQueue'
import { createFakeProjectApi, type FakeProjectApi } from '../../../test/fakeProjectApi'
import { installFakeProjectApi, openTestProject, putRequests, resetActiveProject } from '../../../test/projectSessionTestUtils'
import { readBridgeDefinitionStore, subscribeBridgeDefinitionStore, writeBridgeDefinitionStore } from './store'

/**
 * UI-only state of the bridge definitions (selected bridge / axis / constraint, view mode, terrain visibility) lives in a memory layer:
 * changing it updates the store at once but never sends a request; a data change sends exactly one `bridge-definitions` PUT without any
 * UI field; a project switch resets the layer. (BACKEND-DB-PERSISTENCE M5c, D6.)
 */
const UI_ONLY_KEYS = ['selectedBridgeId', 'selectedAxisId', 'selectedConstraintId', 'viewMode', 'terrainVisible', 'keyBy', 'activeGraphId']
export function keysOf(value: unknown, found: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) value.forEach((item) => keysOf(item, found))
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) { found.add(key); keysOf(item, found) }
  return found
}

let fake: FakeProjectApi
beforeEach(() => {
  vi.useFakeTimers()
  fake = installFakeProjectApi(createFakeProjectApi())
  openTestProject(CANONICAL_PROJECT_DOCUMENT_JSON, fake)
})
afterEach(() => { vi.useRealTimers() })

const settle = () => vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS * 2)

describe('bridge definition UI-only state', () => {
  it('starts from the defaults for the loaded definitions', () => {
    const store = readBridgeDefinitionStore()
    expect(store.selectedBridgeId).toBe('bridge-1')
    expect(store.definitions['bridge-1']).toMatchObject({ selectedAxisId: 'A1', selectedConstraintId: null, viewMode: 'PROFILE', terrainVisible: true })
  })

  it('updates the store for UI-only changes and sends no request', async () => {
    const store = readBridgeDefinitionStore()
    const definition = store.definitions['bridge-1']
    const seen = vi.fn()
    const unsubscribe = subscribeBridgeDefinitionStore(seen)
    expect(writeBridgeDefinitionStore({
      ...store, selectedBridgeId: 'bridge-2',
      definitions: { ...store.definitions, 'bridge-1': { ...definition, selectedAxisId: 'P2', selectedConstraintId: 'c2', viewMode: '3D', terrainVisible: false } },
    })).toBe(true)
    unsubscribe()
    expect(seen).toHaveBeenCalled()
    const next = readBridgeDefinitionStore()
    expect(next.selectedBridgeId).toBe('bridge-2')
    expect(next.definitions['bridge-1']).toMatchObject({ selectedAxisId: 'P2', selectedConstraintId: 'c2', viewMode: '3D', terrainVisible: false })
    await settle()
    expect(putRequests(fake)).toHaveLength(0)
  })

  it('returns the same object while nothing changed and a new one after a UI change', () => {
    const first = readBridgeDefinitionStore()
    expect(readBridgeDefinitionStore()).toBe(first)
    writeBridgeDefinitionStore({ ...first, definitions: { ...first.definitions, 'bridge-1': { ...first.definitions['bridge-1'], viewMode: 'PLAN' } } })
    const second = readBridgeDefinitionStore()
    expect(second).not.toBe(first)
    expect(readBridgeDefinitionStore()).toBe(second)
  })

  it('sends one PUT for a data change, without any UI-only field, and keeps the UI state', async () => {
    const store = readBridgeDefinitionStore()
    const definition = store.definitions['bridge-1']
    writeBridgeDefinitionStore({ ...store, selectedBridgeId: 'bridge-2', definitions: { ...store.definitions, 'bridge-1': { ...definition, viewMode: '3D', constructionMethod: 'Cast in place' } } })
    await settle()
    const puts = putRequests(fake)
    expect(puts.map((request) => request.path.split('/').slice(-1)[0])).toEqual(['bridge-definitions'])
    expect(UI_ONLY_KEYS.filter((key) => keysOf(puts[0].body).has(key))).toEqual([])
    const next = readBridgeDefinitionStore()
    expect(next.definitions['bridge-1']).toMatchObject({ constructionMethod: 'Cast in place', viewMode: '3D' })
    expect(next.selectedBridgeId).toBe('bridge-2')
  })

  it('resets the UI layer when the project changes', () => {
    const store = readBridgeDefinitionStore()
    writeBridgeDefinitionStore({ ...store, selectedBridgeId: 'bridge-2', definitions: { ...store.definitions, 'bridge-1': { ...store.definitions['bridge-1'], selectedAxisId: 'P2', viewMode: '3D', terrainVisible: false } } })
    openTestProject(CANONICAL_PROJECT_DOCUMENT_JSON, fake)
    const reopened = readBridgeDefinitionStore()
    expect(reopened.selectedBridgeId).toBe('bridge-1')
    expect(reopened.definitions['bridge-1']).toMatchObject({ selectedAxisId: 'A1', viewMode: 'PROFILE', terrainVisible: true })
  })

  it('rejects a write while no project is open, sends nothing and leaves the store empty', async () => {
    const store = readBridgeDefinitionStore()
    resetActiveProject()
    const before = putRequests(fake).length
    expect(writeBridgeDefinitionStore({ ...store, selectedBridgeId: 'bridge-2' })).toBe(false)
    expect(readBridgeDefinitionStore().selectedBridgeId).toBeNull()
    await settle()
    expect(putRequests(fake)).toHaveLength(before)
  })
})
