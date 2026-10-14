import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProjectDataValidationError } from '../../shared/project-store/projectDataValidation'
import { activeProjectSession, activeWriteQueue } from '../../shared/project-store/activeProject'
import { BRIDGE_DEFINITIONS_SERVER_SECTION } from '../../features/bridge-definition/model/bridgeDefinitionServerSection'
import { FAMILY_SERVER_SECTIONS, GIRDER_LIBRARY_SERVER_SECTION } from '../../features/family-registry/model/familyServerSections'
import { GRAPH_SERVER_COLLECTION } from '../../features/graph/state/graphServerCollection'
import {
  SEISMIC_SERVER_SECTION, SELF_WEIGHT_SERVER_SECTION, TEMPERATURE_SERVER_SECTION, TRAFFIC_LM1_SERVER_SECTION, WIND_SERVER_SECTION, WIND_SNAPSHOT_SERVER_SECTION,
} from '../../features/loads/model/loadsServerSections'
import { PREFERRED_SPAN_RULES_SERVER_SECTION } from '../../features/preferred-span/model/preferredSpanServerSection'
import { WORKSPACE_SERVER_SECTION } from '../../features/project/model/projectWorkspaceServerSection'
import { CROSS_SECTION_SERVER_SECTION } from '../../features/superstructure-families/model/crossSectionServerSection'
import { installFakeProjectApi, openTestProject, closeTestProject, resetActiveProject } from '../../test/projectSessionTestUtils'
import { loadProjectDocument, PROJECT_SECTION_DEFINITIONS } from './projectDocument'
import { CANONICAL_PROJECT_DOCUMENT_JSON, NEW_PROJECT_DOCUMENT_JSON } from './projectDocumentFixtures'
import { applyPreparedProject, prepareLoadedProject } from './projectSections'

const SECTIONS = [
  WORKSPACE_SERVER_SECTION, BRIDGE_DEFINITIONS_SERVER_SECTION,
  FAMILY_SERVER_SECTIONS.PIER, FAMILY_SERVER_SECTIONS.PIER_CAP, FAMILY_SERVER_SECTIONS.FOUNDATION, FAMILY_SERVER_SECTIONS.BEARING, FAMILY_SERVER_SECTIONS.MATERIAL,
  GIRDER_LIBRARY_SERVER_SECTION, PREFERRED_SPAN_RULES_SERVER_SECTION, CROSS_SECTION_SERVER_SECTION,
  SEISMIC_SERVER_SECTION, WIND_SERVER_SECTION, TEMPERATURE_SERVER_SECTION, SELF_WEIGHT_SERVER_SECTION, TRAFFIC_LM1_SERVER_SECTION, WIND_SNAPSHOT_SERVER_SECTION,
]
const readAll = () => JSON.stringify([...SECTIONS.map((section) => section.read()), GRAPH_SERVER_COLLECTION.list()])
const SEISMIC = { a: '0.5', g: '9.81', t: '1', i: '1' }

afterEach(() => { vi.useRealTimers(); resetActiveProject() })

describe('prepareLoadedProject', () => {
  it('reconciles the bridge definitions with the workspace (canonical document)', () => {
    const loaded = loadProjectDocument(CANONICAL_PROJECT_DOCUMENT_JSON)
    const prepared = prepareLoadedProject(loaded)
    expect(prepared.bridgeDefinitions.keyBy).toBe('bridgeId')
    expect(Object.keys(prepared.bridgeDefinitions.definitions).sort()).toEqual(['bridge-1', 'bridge-2'])
    expect(prepared.bridgeDefinitions.selectedBridgeId).toBe('bridge-1')
    expect(prepared.bridgeDefinitions.definitions['bridge-1']).toEqual(loaded.bridgeDefinitions?.definitions['bridge-1'])
    expect(prepared.projectId).toBe(loaded.projectId)
    expect(prepared.graphs).toEqual(loaded.graphs)
  })

  it('gives a new project an empty reconciled store', () => {
    const prepared = prepareLoadedProject(loadProjectDocument(NEW_PROJECT_DOCUMENT_JSON))
    expect(prepared.bridgeDefinitions).toEqual({ keyBy: 'bridgeId', selectedBridgeId: null, definitions: {} })
  })

  it('throws a ProjectDataValidationError for a value that cannot be mapped to the wire, without any side effect', () => {
    const fake = installFakeProjectApi()
    openTestProject(CANONICAL_PROJECT_DOCUMENT_JSON, fake)
    const snapshot = activeProjectSession.getSnapshot()
    const before = readAll()
    const canonical = loadProjectDocument(CANONICAL_PROJECT_DOCUMENT_JSON)
    const workspace = canonical.workspace!
    const broken = { ...canonical, workspace: { ...workspace, bridges: [{ ...workspace.bridges[0], id: '' }] } }
    let thrown: unknown
    try { prepareLoadedProject(broken) } catch (error) { thrown = error }
    expect(thrown).toBeInstanceOf(ProjectDataValidationError)
    expect((thrown as Error).message.startsWith('Invalid project data: workspace')).toBe(true)
    expect(activeProjectSession.getSnapshot()).toBe(snapshot)
    expect(readAll()).toBe(before)
    expect(activeWriteQueue.pendingKeys()).toEqual([])
  })

  it('has no side effect on an open project when it succeeds', () => {
    const fake = installFakeProjectApi()
    openTestProject(CANONICAL_PROJECT_DOCUMENT_JSON, fake)
    const snapshot = activeProjectSession.getSnapshot()
    const before = readAll()
    prepareLoadedProject(loadProjectDocument(NEW_PROJECT_DOCUMENT_JSON))
    expect(activeProjectSession.getSnapshot()).toBe(snapshot)
    expect(readAll()).toBe(before)
  })

  it('rejects duplicate graph ids before changing the active project', () => {
    installFakeProjectApi()
    openTestProject(NEW_PROJECT_DOCUMENT_JSON)
    const before = activeProjectSession.getSnapshot()
    const loaded = loadProjectDocument(CANONICAL_PROJECT_DOCUMENT_JSON)
    const duplicate = { ...loaded, graphs: [loaded.graphs[0], { ...loaded.graphs[1], id: loaded.graphs[0].id }] }
    expect(() => prepareLoadedProject(duplicate)).toThrow(ProjectDataValidationError)
    expect(activeProjectSession.getSnapshot()).toBe(before)
    expect(GRAPH_SERVER_COLLECTION.list()).toEqual([])
  })
})

describe('applyPreparedProject', () => {
  it('begins a new epoch and hydrates every section without a request', async () => {
    vi.useFakeTimers()
    const fake = installFakeProjectApi()
    const epoch = activeProjectSession.getSnapshot().epoch
    const loaded = loadProjectDocument(CANONICAL_PROJECT_DOCUMENT_JSON)
    const prepared = prepareLoadedProject(loaded)
    applyPreparedProject(prepared)
    expect(activeProjectSession.getSnapshot()).toMatchObject({ epoch: epoch + 1, projectId: loaded.projectId, revision: 17, status: 'idle', pendingCount: 0 })
    expect(activeWriteQueue.pendingKeys()).toEqual([])
    expect(WORKSPACE_SERVER_SECTION.read()).toEqual(prepared.workspace)
    expect(BRIDGE_DEFINITIONS_SERVER_SECTION.read()).toEqual(prepared.bridgeDefinitions)
    expect(FAMILY_SERVER_SECTIONS.PIER.read()).toEqual(prepared.families.PIER)
    expect(SEISMIC_SERVER_SECTION.read()).toEqual(prepared.loads.seismic)
    expect(CROSS_SECTION_SERVER_SECTION.read()).toEqual(prepared.crossSection)
    expect(GRAPH_SERVER_COLLECTION.list()).toEqual(prepared.graphs)
    await vi.advanceTimersByTimeAsync(1000)
    expect(fake.requests).toEqual([])
  })

  it('notifies in definition order, graphs last', () => {
    installFakeProjectApi()
    const order: string[] = []
    const offs = SECTIONS.map((section, index) => section.subscribe(() => order.push(PROJECT_SECTION_DEFINITIONS[index].id)))
    offs.push(GRAPH_SERVER_COLLECTION.subscribe(() => order.push('graphs')))
    applyPreparedProject(prepareLoadedProject(loadProjectDocument(CANONICAL_PROJECT_DOCUMENT_JSON)))
    offs.forEach((off) => off())
    expect(order).toEqual([...PROJECT_SECTION_DEFINITIONS.map((definition) => definition.id), 'graphs'])
  })

  it('increments the epoch again when the same project is applied twice', () => {
    installFakeProjectApi()
    const prepared = prepareLoadedProject(loadProjectDocument(NEW_PROJECT_DOCUMENT_JSON))
    applyPreparedProject(prepared)
    const epoch = activeProjectSession.getSnapshot().epoch
    applyPreparedProject(prepared)
    expect(activeProjectSession.getSnapshot().epoch).toBe(epoch + 1)
  })

  it('drops pending writes of the previous project', () => {
    vi.useFakeTimers()
    const fake = installFakeProjectApi()
    openTestProject(CANONICAL_PROJECT_DOCUMENT_JSON, fake)
    expect(SEISMIC_SERVER_SECTION.write(SEISMIC)).toBe(true)
    expect(activeWriteQueue.pendingKeys()).toEqual(['loads/seismic'])
    openTestProject(NEW_PROJECT_DOCUMENT_JSON, fake)
    expect(activeWriteQueue.pendingKeys()).toEqual([])
    expect(SEISMIC_SERVER_SECTION.read()).toBeUndefined()
  })
})

describe('closeActiveProject', () => {
  it('ends the session, empties every section, drops held errors and sends no request', async () => {
    vi.useFakeTimers()
    const fake = installFakeProjectApi()
    openTestProject(CANONICAL_PROJECT_DOCUMENT_JSON, fake)
    SEISMIC_SERVER_SECTION.write(SEISMIC)
    WORKSPACE_SERVER_SECTION.write(undefined) // not clearable: a held local rejection
    expect(activeProjectSession.getSnapshot().status).toBe('rejected')
    closeTestProject()
    expect(activeProjectSession.getSnapshot()).toMatchObject({ projectId: null, revision: null, status: 'idle', failedKey: null })
    for (const section of SECTIONS) expect(section.read()).toBeUndefined()
    expect(GRAPH_SERVER_COLLECTION.list()).toEqual([])
    expect(activeWriteQueue.pendingKeys()).toEqual([])
    expect(SEISMIC_SERVER_SECTION.write(SEISMIC)).toBe(false)
    await vi.advanceTimersByTimeAsync(1000)
    expect(fake.requests).toEqual([])
  })
})
