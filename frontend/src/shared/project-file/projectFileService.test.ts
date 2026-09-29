import { describe, expect, it, vi } from 'vitest'
import { applyProjectFile, buildProjectFile, projectFileText, validateProjectFile, writeProjectFile } from './projectFileService'
import { INITIAL_PROJECT } from '../../features/project/model/projectWorkspace'
import { INITIAL_BRIDGES } from '../../features/project/model/types'
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
})
