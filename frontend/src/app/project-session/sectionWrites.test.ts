import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { activeProjectSession } from '../../shared/project-store/activeProject'
import { SAVE_DEBOUNCE_MS } from '../../shared/project-store/writeQueue'
import { BRIDGE_DEFINITIONS_SERVER_SECTION } from '../../features/bridge-definition/model/bridgeDefinitionServerSection'
import { readBridgeDefinitionStore, writeBridgeDefinitionStore } from '../../features/bridge-definition/model/store'
import { getFamilyRecords, getPrecastGirderDefinition, saveFamilyRecords, savePrecastGirderDefinition, type FamilyRecord } from '../../features/family-registry/model/familyRepository'
import { FAMILY_SERVER_SECTIONS, GIRDER_LIBRARY_SERVER_SECTION } from '../../features/family-registry/model/familyServerSections'
import { GRAPH_SERVER_COLLECTION } from '../../features/graph/state/graphServerCollection'
import { renameActiveGraph, selectGraphDocument } from '../../features/graph/state/graphStore'
import {
  SEISMIC_INPUTS_MODULE, SELF_WEIGHT_INPUTS_MODULE, TEMPERATURE_INPUTS_MODULE, TRAFFIC_LM1_MODULE, WIND_INPUTS_MODULE, WIND_SNAPSHOT_MODULE,
} from '../../features/loads/model/loadsProjectModules'
import {
  SEISMIC_SERVER_SECTION, SELF_WEIGHT_SERVER_SECTION, TEMPERATURE_SERVER_SECTION, TRAFFIC_LM1_SERVER_SECTION, WIND_SERVER_SECTION, WIND_SNAPSHOT_SERVER_SECTION,
} from '../../features/loads/model/loadsServerSections'
import { PREFERRED_SPAN_RULES_MODULE } from '../../features/preferred-span/model/preferredSpanRulesProjectModule'
import { PREFERRED_SPAN_RULES_SERVER_SECTION } from '../../features/preferred-span/model/preferredSpanServerSection'
import { readProjectState, writeProjectState } from '../../features/project/model/projectWorkspace'
import { WORKSPACE_SERVER_SECTION } from '../../features/project/model/projectWorkspaceServerSection'
import { CROSS_SECTION_VALUES_MODULE } from '../../features/superstructure-families/model/crossSectionProjectModule'
import { CROSS_SECTION_SERVER_SECTION } from '../../features/superstructure-families/model/crossSectionServerSection'
import { createFakeProjectApi, type FakeProjectApi } from '../../test/fakeProjectApi'
import { installFakeProjectApi, openTestProject, putRequests } from '../../test/projectSessionTestUtils'
import { PROJECT_SECTION_DEFINITIONS } from './projectDocument'
import { CANONICAL_PROJECT_DOCUMENT_JSON } from './projectDocumentFixtures'

/**
 * One example edit per server section (16) and per graph document: after the save debounce exactly one PUT goes out for that path, and the
 * expected revisions chain (each PUT is sent with the revision the previous answer returned). The data comes from the canonical fixture.
 */
let fake: FakeProjectApi

const family = (category: 'PIER' | 'PIER_CAP' | 'FOUNDATION' | 'BEARING') => () => saveFamilyRecords(category, getFamilyRecords<FamilyRecord>(category).map((record) => ({ ...record, name: 'Edited' })))
const must = <T,>(value: T | undefined): T => { expect(value).toBeDefined(); return value as T }
const SECTIONS = [
  WORKSPACE_SERVER_SECTION, BRIDGE_DEFINITIONS_SERVER_SECTION,
  FAMILY_SERVER_SECTIONS.PIER, FAMILY_SERVER_SECTIONS.PIER_CAP, FAMILY_SERVER_SECTIONS.FOUNDATION, FAMILY_SERVER_SECTIONS.BEARING, FAMILY_SERVER_SECTIONS.MATERIAL,
  GIRDER_LIBRARY_SERVER_SECTION, PREFERRED_SPAN_RULES_SERVER_SECTION, CROSS_SECTION_SERVER_SECTION,
  SEISMIC_SERVER_SECTION, WIND_SERVER_SECTION, TEMPERATURE_SERVER_SECTION, SELF_WEIGHT_SERVER_SECTION, TRAFFIC_LM1_SERVER_SECTION, WIND_SNAPSHOT_SERVER_SECTION,
] as const

const EDITS: { path: string; edit(): void }[] = [
  { path: 'workspace', edit: () => { const state = readProjectState(); writeProjectState({ ...state, project: { ...state.project, name: 'Edited' } }) } },
  { path: 'bridge-definitions', edit: () => {
    const store = readBridgeDefinitionStore()
    writeBridgeDefinitionStore({ ...store, definitions: { ...store.definitions, 'bridge-1': { ...store.definitions['bridge-1'], constructionMethod: 'Cast in place' } } })
  } },
  { path: 'families/piers', edit: family('PIER') },
  { path: 'families/pier-caps', edit: family('PIER_CAP') },
  { path: 'families/foundations', edit: family('FOUNDATION') },
  { path: 'families/bearings', edit: family('BEARING') },
  { path: 'families/materials', edit: () => saveFamilyRecords('MATERIAL', getFamilyRecords<FamilyRecord & { concreteClass?: string }>('MATERIAL').map((record) => ({ ...record, concreteClass: 'C40/50' }))) },
  { path: 'girder-library', edit: () => { savePrecastGirderDefinition({ ...getPrecastGirderDefinition<Record<string, unknown>>({}), enabled: false }) } },
  { path: 'preferred-span-rules', edit: () => { PREFERRED_SPAN_RULES_MODULE.write(must(PREFERRED_SPAN_RULES_MODULE.read()).map((rule) => ({ ...rule, primarySpan: 30 }))) } },
  { path: 'cross-section', edit: () => { CROSS_SECTION_VALUES_MODULE.write({ ...must(CROSS_SECTION_VALUES_MODULE.read()), platformWidthM: 14 }) } },
  { path: 'loads/seismic', edit: () => { SEISMIC_INPUTS_MODULE.write({ ...must(SEISMIC_INPUTS_MODULE.read()), a: '0.3' }) } },
  { path: 'loads/wind', edit: () => { WIND_INPUTS_MODULE.write({ ...must(WIND_INPUTS_MODULE.read()), vb: '30' }) } },
  { path: 'loads/temperature', edit: () => { TEMPERATURE_INPUTS_MODULE.write({ ...must(TEMPERATURE_INPUTS_MODULE.read()), max: '45' }) } },
  { path: 'loads/self-weight', edit: () => { SELF_WEIGHT_INPUTS_MODULE.write({ ...must(SELF_WEIGHT_INPUTS_MODULE.read()), asphaltThicknessM: 0.15 }) } },
  { path: 'loads/traffic-lm1', edit: () => {
    const value = must(TRAFFIC_LM1_MODULE.read())
    TRAFFIC_LM1_MODULE.write({ ...value, remainingAreaUdl: { ...value.remainingAreaUdl, label: 'Remaining area' } })
  } },
  { path: 'loads/wind-snapshot', edit: () => {
    const snapshot = must(WIND_SNAPSHOT_MODULE.read())
    WIND_SNAPSHOT_MODULE.write({ ...snapshot, inputs: { ...snapshot.inputs, deckWidthM: 14 } })
  } },
  { path: 'graphs/graph-1', edit: () => renameActiveGraph('Renamed') },
]

beforeEach(() => {
  vi.useFakeTimers()
  fake = installFakeProjectApi(createFakeProjectApi())
  openTestProject(CANONICAL_PROJECT_DOCUMENT_JSON, fake)
})
afterEach(() => { vi.useRealTimers() })

describe('example edit of every project section', () => {
  it('covers the 16 sections of the project document and one graph', () => {
    expect(EDITS.map((entry) => entry.path).filter((path) => !path.startsWith('graphs/'))).toEqual(PROJECT_SECTION_DEFINITIONS.map((definition) => definition.path))
    expect(EDITS).toHaveLength(17)
  })

  it('sends one PUT per edit after the debounce, with a chained expectedRevision', async () => {
    let revision = CANONICAL_PROJECT_DOCUMENT_JSON.revision
    expect(activeProjectSession.getSnapshot().revision).toBe(revision)
    for (const { path, edit } of EDITS) {
      const before = putRequests(fake).length
      edit()
      expect(putRequests(fake), `${path} must not be sent before the debounce`).toHaveLength(before)
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS)
      const sent = putRequests(fake).slice(before)
      expect(sent.map((request) => request.path), path).toEqual([expect.stringMatching(new RegExp(`/${path}$`))])
      expect((sent[0].body as { expectedRevision: number }).expectedRevision, path).toBe(revision)
      revision += 1
      expect(activeProjectSession.getSnapshot()).toMatchObject({ revision, status: 'idle', pendingCount: 0 })
    }
    expect(putRequests(fake)).toHaveLength(EDITS.length)
  })

  it('keeps every edited value after the project is opened again from the fake backend', async () => {
    for (const { edit } of EDITS) edit()
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS * 3)
    expect(putRequests(fake)).toHaveLength(EDITS.length)
    const before = SECTIONS.map((section) => structuredClone(section.read()))
    const graphs = structuredClone(GRAPH_SERVER_COLLECTION.list())
    expect(before[1]).toMatchObject({ definitions: { 'bridge-1': { constructionMethod: 'Cast in place' } } })
    expect(before[7]).toMatchObject({ enabled: false })
    expect(graphs[0]).toMatchObject({ name: 'Renamed' })
    openTestProject(fake.document(CANONICAL_PROJECT_DOCUMENT_JSON.projectId))
    expect(SECTIONS).toHaveLength(PROJECT_SECTION_DEFINITIONS.length)
    SECTIONS.forEach((section, index) => expect(section.read(), PROJECT_SECTION_DEFINITIONS[index].path).toEqual(before[index]))
    expect(GRAPH_SERVER_COLLECTION.list()).toEqual(graphs)
  })

  it('never puts a UI-only field into a request body (selection, view mode, terrain visibility, key mode, active graph)', async () => {
    const forbidden = ['selectedBridgeId', 'selectedAxisId', 'selectedConstraintId', 'viewMode', 'terrainVisible', 'keyBy', 'activeGraphId', 'canUndo', 'canRedo']
    const keysOf = (value: unknown, found: Set<string> = new Set()): Set<string> => {
      if (Array.isArray(value)) value.forEach((item) => keysOf(item, found))
      else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) { found.add(key); keysOf(item, found) }
      return found
    }
    selectGraphDocument('graph-2')
    for (const { edit } of EDITS) edit()
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS * 3)
    const bodies = putRequests(fake).map((request) => request.body)
    expect(bodies).not.toHaveLength(0)
    expect(forbidden.filter((key) => bodies.some((body) => keysOf(body).has(key)))).toEqual([])
  })
})

