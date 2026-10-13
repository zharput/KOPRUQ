import { describe, expect, it, vi } from 'vitest'
import { applyProjectFile, buildProjectFile, projectFileText, ProjectStorageRollbackError, readProjectFile, resetProjectStorage, validateProjectFile, writeProjectFile } from './projectFileService'
import { INITIAL_PROJECT } from '../../features/project/model/projectWorkspace'
import { INITIAL_BRIDGES } from '../../features/project/model/types'
import { goodFileJson, asFile, REJECTIONS, type Json } from './projectFileFixtures'
import { createBridgeDefinition, ensureBridgeDefinitions } from '../../features/bridge-definition/model/store'
import { createEmptyGraph, exportGraphDocuments, importGraphDocuments } from '../../features/graph/state/graphStore'
import { getFamilyRecords, saveFamilyRecords } from '../../features/family-registry/model/familyRepository'

describe('KOPRUQ project file', () => {
  it('serializes the real project envelope and excludes candidate tables', () => {
    const state = { project: { ...INITIAL_PROJECT, name: 'Round Trip' }, bridges: [] }
    const file = buildProjectFile(state, { selectedBridgeId: null, definitions: {} })
    const json = JSON.stringify(file)
    expect(file.format).toBe('KOPRUQ_PROJECT'); expect(file.schemaVersion).toBe(1)
    expect(JSON.parse(json).projectState.project.name).toBe('Round Trip')
    expect(json).not.toContain('candidateTables'); expect(json).not.toContain('React')
  })
  it('rejects malformed, foreign and unsupported files', () => {
    expect(() => validateProjectFile({})).toThrow()
    expect(() => validateProjectFile({ format: 'OTHER', schemaVersion: 1 })).toThrow()
    expect(() => validateProjectFile({ format: 'KOPRUQ_PROJECT', schemaVersion: 99 })).toThrow()
  })
  it('round-trips real graph and family stores without candidate tables', () => {
    const graph = createEmptyGraph('Round Trip Graph', { projectId: 'project-1', bridgeId: 'bridge-1' })
    graph.nodes.push({ id: 'node-1', type: 'math.add', name: 'Add', position: { x: 12, y: 24 }, parameters: { a: 2, b: 3 } })
    graph.nodes.push({ id: 'node-2', type: 'math.multiply', name: 'Multiply', position: { x: 60, y: 24 }, parameters: { a: 4, b: 5 } })
    graph.connections.push({ id: 'edge-1', sourceNodeId: 'node-1', sourcePortId: 'result', targetNodeId: 'node-2', targetPortId: 'a' })
    importGraphDocuments({ activeGraphId: graph.id, graphs: [graph] })
    saveFamilyRecords('PIER', [{ id: 'pier-1', name: 'Pier Family', min: 1, max: 3, selected: true }])
    const state = { project: { ...INITIAL_PROJECT, id: 'project-1', name: 'Round Trip', units: { ...INITIAL_PROJECT.units, length: 'mm' } }, bridges: [{ ...INITIAL_BRIDGES[0], id: 'bridge-1', no: 'VIA-01' }] }
    const original = buildProjectFile(state, { selectedBridgeId: 'VIA-01', definitions: { 'VIA-01': { bridgeId: 'VIA-01', spanLengthsM: [30, 35], axes: [], selectedAxisId: null, superstructureType: 'PRECAST', girderFamilyId: null, girderVariantId: null, girderCount: 4, deckWidthOverrideM: null, axisAssignments: {}, abutmentFamilyIds: { A1: null, A2: null }, constructionMethod: '', constructionStagesNote: '', constraints: [], selectedConstraintId: null, viewMode: 'PROFILE', terrainVisible: true } } })
    const json = projectFileText(original); const restored = validateProjectFile(JSON.parse(json)); const temporary = createEmptyGraph('Temporary'); importGraphDocuments({ activeGraphId: temporary.id, graphs: [temporary] }); localStorage.clear(); applyProjectFile(restored)
    const graphAfter = exportGraphDocuments().graphs.find((item) => item.id === graph.id)!
    expect(graphAfter.nodes).toEqual(graph.nodes); expect(graphAfter.connections).toEqual(graph.connections)
    expect(getFamilyRecords('PIER')).toEqual(original.families.PIER); expect(restored.projectState.project.units.length).toBe('mm'); expect(restored.bridgeDefinitions).toEqual(original.bridgeDefinitions)
    expect(json).not.toContain('candidateTables')
  })
  it('propagates save-picker cancellation and write failures without pretending to save', async () => {
    const state = { project: { ...INITIAL_PROJECT, name: 'Failure' }, bridges: [] }
    const file = buildProjectFile(state, { selectedBridgeId: null, definitions: {} })
    const picker = vi.fn().mockRejectedValue(new DOMException('User cancelled', 'AbortError'))
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: picker })
    await expect(writeProjectFile(file)).rejects.toThrow('User cancelled')
    const writable = { write: vi.fn().mockRejectedValue(new Error('disk full')), close: vi.fn() }
    picker.mockResolvedValue({ createWritable: vi.fn().mockResolvedValue(writable) })
    await expect(writeProjectFile(file, { name: 'Failure.kopruq', handle: { createWritable: () => Promise.resolve(writable) } as unknown as FileSystemFileHandle })).rejects.toThrow('disk full')
  })
  it('uses download fallback when the File System Access API is unavailable', async () => {
    const state = { project: { ...INITIAL_PROJECT, name: 'Fallback' }, bridges: [] }
    const file = buildProjectFile(state, { selectedBridgeId: null, definitions: {} })
    const anchor = document.createElement('a'); const click = vi.spyOn(anchor, 'click').mockImplementation(() => undefined)
    vi.spyOn(document, 'createElement').mockReturnValueOnce(anchor)
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: undefined })
    const result = await writeProjectFile(file)
    expect(result.handle).toBeUndefined(); expect(result.name).toContain('.kopruq'); expect(click).toHaveBeenCalled()
  })
  it('uses the real FileSystemFileHandle.name after Save As', async () => {
    const file = buildProjectFile({ project: { ...INITIAL_PROJECT, name: 'Project Name' }, bridges: [] }, { selectedBridgeId: null, definitions: {} })
    const handle = { name: 'VIA20-Rev3.kopruq', createWritable: vi.fn().mockResolvedValue({ write: vi.fn(), close: vi.fn() }) } as unknown as FileSystemFileHandle
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: vi.fn().mockResolvedValue(handle) })
    const result = await writeProjectFile(file)
    expect(result.name).toBe('VIA20-Rev3.kopruq'); expect(result.handle).toBe(handle)
  })
  it('restores Graph and Family stores when a later family import fails', () => {
    const graph = createEmptyGraph('Before'); importGraphDocuments({ activeGraphId: graph.id, graphs: [graph] }); saveFamilyRecords('PIER', [{ id: 'before', name: 'Before' }])
    const file = buildProjectFile({ project: INITIAL_PROJECT, bridges: [] }, { selectedBridgeId: null, definitions: {} }); const after = createEmptyGraph('After'); file.graph = { activeGraphId: after.id, graphs: [after] }; file.families.PIER = [{ id: 'after', name: 'After' }]
    const original = localStorage.setItem.bind(localStorage); let failOnce = true; const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { if (key.includes('pier-cap') && failOnce) { failOnce = false; throw new Error('import failure') } original(key, value) })
    expect(() => applyProjectFile(file)).toThrow('Unable to import family data: PIER_CAP'); spy.mockRestore()
    expect(exportGraphDocuments().graphs[0].name).toBe('Before'); expect(getFamilyRecords('PIER')).toEqual([{ id: 'before', name: 'Before' }])
  })
  it('normalizes a file without modules to an empty modules object', () => {
    const file = buildProjectFile({ project: { ...INITIAL_PROJECT, name: 'Legacy' }, bridges: [] }, { selectedBridgeId: null, definitions: {} })
    const legacy = JSON.parse(JSON.stringify(file)); delete legacy.modules
    expect(validateProjectFile(legacy).modules).toEqual({})
  })
  it('rejects a malformed modules.windLoads and writes nothing to the stores', () => {
    const file = buildProjectFile({ project: { ...INITIAL_PROJECT, name: 'Bad Wind' }, bridges: [] }, { selectedBridgeId: null, definitions: {} })
    const bad = JSON.parse(JSON.stringify(file)); bad.modules = { windLoads: { schemaVersion: 1, result: null } }
    const before = JSON.stringify(exportGraphDocuments())
    expect(() => applyProjectFile(bad)).toThrow()
    expect(JSON.stringify(exportGraphDocuments())).toBe(before)
    expect(() => validateProjectFile({ ...file, modules: 'x' })).toThrow()
  })
  it('resetProjectStorage restores graph, families and modules when a later reset step fails', () => {
    const graph = createEmptyGraph('Before'); importGraphDocuments({ activeGraphId: graph.id, graphs: [graph] }); saveFamilyRecords('PIER', [{ id: 'before', name: 'Before' }])
    localStorage.setItem('kopruq.seismic', JSON.stringify({ a: '0.3', g: 'A', t: 'Type 2', i: '1' }))
    const original = localStorage.setItem.bind(localStorage); const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { if (key.includes('pier-cap') && value === '[]') throw new Error('quota'); original(key, value) })
    expect(() => resetProjectStorage()).toThrow('Unable to reset family catalog: PIER_CAP'); spy.mockRestore()
    expect(exportGraphDocuments().graphs[0].name).toBe('Before'); expect(getFamilyRecords('PIER')).toEqual([{ id: 'before', name: 'Before' }])
    expect(JSON.parse(localStorage.getItem('kopruq.seismic') ?? 'null')).toEqual({ a: '0.3', g: 'A', t: 'Type 2', i: '1' })
  })
  it('resetProjectStorage throws and rolls back when a module reset silently fails', () => {
    const graph = createEmptyGraph('Before'); importGraphDocuments({ activeGraphId: graph.id, graphs: [graph] })
    localStorage.setItem('kopruq.seismic', JSON.stringify({ a: '0.3', g: 'A', t: 'Type 2', i: '1' }))
    const original = localStorage.removeItem.bind(localStorage); const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => { if (key === 'kopruq.seismic') throw new Error('blocked'); original(key) })
    expect(() => resetProjectStorage()).toThrow(/seismicInputs/); spy.mockRestore()
    expect(exportGraphDocuments().graphs[0].name).toBe('Before'); expect(localStorage.getItem('kopruq.seismic')).not.toBeNull()
  })
  it('resetProjectStorage throws ProjectStorageRollbackError when the rollback also fails', () => {
    const graph = createEmptyGraph('Before'); importGraphDocuments({ activeGraphId: graph.id, graphs: [graph] }); localStorage.setItem('kopruq.seismic', JSON.stringify({ a: '0.3', g: 'A', t: 'Type 2', i: '1' }))
    const original = localStorage.setItem.bind(localStorage); const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { if (key.includes('pier-cap') || key === 'kopruq.seismic') throw new Error('quota'); original(key, value) })
    const originalRemove = localStorage.removeItem.bind(localStorage); const removeSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => { if (key === 'kopruq.seismic') throw new Error('blocked'); originalRemove(key) })
    let error: unknown; try { resetProjectStorage() } catch (e) { error = e } finally { spy.mockRestore(); removeSpy.mockRestore() }
    expect(error).toBeInstanceOf(ProjectStorageRollbackError)
  })
})

describe('project file record validation (C-013-01)', () => {
  it('accepts a file produced by the application from real defaults', async () => {
    const json = goodFileJson(); expect(() => validateProjectFile(json)).not.toThrow()
    const read = await readProjectFile(asFile(json)); expect(read.projectState.bridges).toHaveLength(3)
  })
  it.each(REJECTIONS)('rejects the whole file when %s and names the path', (_name, corrupt, path) => {
    const json = goodFileJson(); corrupt(json)
    expect(() => validateProjectFile(json)).toThrow(path)
  })
  it.each(REJECTIONS)('readProjectFile rejects when %s', async (_name, corrupt, path) => {
    const json = goodFileJson(); corrupt(json)
    await expect(readProjectFile(asFile(json))).rejects.toThrow(path)
  })
  it('keeps the existing error texts', () => {
    expect(() => validateProjectFile({})).toThrow('Invalid or unsupported KOPRUQ project file.')
    const missing = goodFileJson(); delete missing.families.BEARING; expect(() => validateProjectFile(missing)).toThrow('Missing family data: BEARING')
    const badModule = goodFileJson(); badModule.modules.seismicInputs = { a: 5 }; expect(() => validateProjectFile(badModule)).toThrow('Invalid project data in file: seismicInputs')
    const badWind = goodFileJson(); badWind.modules.windLoads = { schemaVersion: 1 }; expect(() => validateProjectFile(badWind)).toThrow('Invalid wind load data in project file.')
    const badGraph = goodFileJson(); badGraph.graph.activeGraphId = 'nope'; expect(() => validateProjectFile(badGraph)).toThrow('Active graph is missing.')
    const emptyGraph = goodFileJson(); emptyGraph.graph.graphs = []; expect(() => validateProjectFile(emptyGraph)).toThrow('Invalid graph data.')
  })
  it('lists several problems and not only the first one', () => {
    const json = goodFileJson(); json.projectState.bridges = [{}]
    let text = ''; try { validateProjectFile(json) } catch (error) { text = (error as Error).message }
    expect(text).toMatch(/bridges\[0\]\.no/); expect(text).toMatch(/bridges\[0\]\.km/)
  })
})
describe('older project files keep opening (compatibility)', () => {
  it('fills missing environment, criteria and coordinate from the defaults', async () => {
    const json = goodFileJson(); delete json.projectState.project.environment; delete json.projectState.project.criteria; delete json.projectState.project.coordinate
    const read = await readProjectFile(asFile(json))
    expect(read.projectState.project.environment).toEqual(INITIAL_PROJECT.environment); expect(read.projectState.project.criteria).toEqual(INITIAL_PROJECT.criteria); expect(read.projectState.project.coordinate).toEqual(INITIAL_PROJECT.coordinate)
  })
  it('fills missing definition fields with the definition defaults', async () => {
    const json = goodFileJson(); const bare = json.bridgeDefinitions.definitions['bridge-0']; delete bare.viewMode; delete bare.terrainVisible; delete bare.constraints; delete bare.abutmentFamilyIds; delete bare.axisAssignments
    const read = await readProjectFile(asFile(json)); const defaults = createBridgeDefinition({ ...INITIAL_BRIDGES[0], id: 'bridge-0' })
    const filled = read.bridgeDefinitions.definitions['bridge-0']
    expect(filled.viewMode).toBe(defaults.viewMode); expect(filled.terrainVisible).toBe(defaults.terrainVisible); expect(filled.constraints).toEqual([]); expect(filled.abutmentFamilyIds).toEqual({ A1: null, A2: null })
  })
  it('assigns ids to bridges that have none', async () => {
    const json = goodFileJson()
    json.bridgeDefinitions = { selectedBridgeId: 'VIA-02', definitions: Object.fromEntries(json.projectState.bridges.map((bridge: Json) => [bridge.no, { ...json.bridgeDefinitions.definitions[bridge.id], bridgeId: bridge.no }])) }
    json.projectState.bridges.forEach((bridge: Json) => { delete bridge.id })
    const read = await readProjectFile(asFile(json))
    expect(read.projectState.bridges.every((bridge) => typeof bridge.id === 'string' && bridge.id.length > 0)).toBe(true)
    const selected = read.projectState.bridges.find((bridge) => bridge.no === 'VIA-02')!
    expect(read.bridgeDefinitions.selectedBridgeId).toBe(selected.id)
    expect(read.bridgeDefinitions.definitions[selected.id!].spanLengthsM).toEqual([30, 35])
  })
  it('migrates legacy definitions, then keeps their assignments after renumbering and saving again', async () => {
    const json = goodFileJson()
    json.bridgeDefinitions = { selectedBridgeId: 'VIA-02', definitions: Object.fromEntries(json.projectState.bridges.map((bridge: Json) => [bridge.no, { ...json.bridgeDefinitions.definitions[bridge.id], bridgeId: bridge.no }])) }
    json.bridgeDefinitions.definitions['VIA-02'].girderFamilyId = 'GIRDER-1'
    json.bridgeDefinitions.definitions['VIA-02'].axisAssignments = { P1: { pierFamilyId: 'PIER-1' } }
    const migrated = await readProjectFile(asFile(json))
    const before = migrated.bridgeDefinitions.definitions['bridge-1']
    const bridges = migrated.projectState.bridges.map((bridge) => bridge.id === 'bridge-1' ? { ...bridge, no: 'VIA-99' } : bridge)
    const definitions = ensureBridgeDefinitions(migrated.bridgeDefinitions, bridges)
    const saved = buildProjectFile({ ...migrated.projectState, bridges }, definitions)
    const reopened = await readProjectFile(asFile(saved))
    expect(reopened.bridgeDefinitions.keyBy).toBe('bridgeId')
    expect(reopened.bridgeDefinitions.selectedBridgeId).toBe('bridge-1')
    expect(reopened.bridgeDefinitions.definitions['bridge-1']).toEqual(before)
    expect(reopened.bridgeDefinitions.definitions['bridge-1'].axisAssignments.P1.pierFamilyId).toBe('PIER-1')
    expect(reopened.projectState.bridges[1].no).toBe('VIA-99')
  })
  it('opens graph documents without groups, a file without modules and the legacy box pier migration', async () => {
    const json = goodFileJson(); delete json.graph.graphs[0].groups; delete json.modules
    json.graph.graphs[0].nodes.push({ id: 'box', type: 'substructure.pier.box', name: 'Box', position: { x: 1, y: 1 }, parameters: { twValue: 0.4, twUnit: 'm' } })
    const read = await readProjectFile(asFile(json))
    const box = read.graph.graphs[0].nodes.find((node) => node.id === 'box')!
    expect(box.parameters.wxValue).toBe(0.4); expect(box.parameters.twValue).toBeUndefined(); expect(read.modules).toEqual({})
  })
  it('accepts the legacy pier types and unknown extra fields on family records', () => {
    const json = goodFileJson(); json.families.PIER = [{ id: 'p1', pierType: 'H_TYPE', futureField: { a: 1 } }, { id: 'p2', pierType: 'WALL' }]
    expect(() => validateProjectFile(json)).not.toThrow()
  })
  it('does not add numeric range rules: zero, negative and fractional numbers pass', () => {
    const json = goodFileJson(); json.projectState.bridges[0].estimatedLengthM = -1; json.projectState.bridges[0].roadWidthM = 0; json.projectState.bridges[0].spansM = [0, -5, 1.5]
    expect(() => validateProjectFile(json)).not.toThrow()
  })
})
