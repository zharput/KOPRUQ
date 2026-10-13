import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { INITIAL_PROJECT } from '../../features/project/model/projectWorkspace'
import type { PersistedProjectState } from '../../features/project/model/projectWorkspace'
import { useProjectFile } from './useProjectFile'
import { buildProjectFile, projectFileText } from './projectFileService'
import { goodFileJson, REJECTIONS } from './projectFileFixtures'
import { PROJECT_DATA_ENTRIES } from './projectDataContract'
import { createEmptyGraph, exportGraphDocuments, importGraphDocuments } from '../../features/graph/state/graphStore'
import { getFamilyRecords, saveFamilyRecords } from '../../features/family-registry/model/familyRepository'
import { getFamilySnapshots, publishFamilySnapshots } from '../../features/graph/family/familySnapshotStore'
import type { BridgeDefinitionStore } from '../../features/bridge-definition/model/types'

const definitions: BridgeDefinitionStore = { selectedBridgeId: null, definitions: {} }
function state(name: string): PersistedProjectState { return { project: { ...INITIAL_PROJECT, name }, bridges: [] } }

describe('useProjectFile safety', () => {
  it('keeps a concurrent mutation dirty and writes it on the next save', async () => {
    let release!: () => void; let written: string[] = []
    const write = vi.fn((value: unknown) => new Promise<void>((resolve) => { written.push(String(value)); release = resolve }))
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: vi.fn().mockResolvedValue({ createWritable: vi.fn().mockResolvedValue({ write, close: vi.fn() }) }) })
    let current = state('Initial'); let currentDefinitions = definitions
    const setProject = (next: typeof current | ((previous: typeof current) => typeof current)) => { current = typeof next === 'function' ? next(current) : next }
    const setDefinitions = (next: BridgeDefinitionStore | ((previous: BridgeDefinitionStore) => BridgeDefinitionStore)) => { currentDefinitions = typeof next === 'function' ? next(currentDefinitions) : next }
    const hook = renderHook(() => useProjectFile(current, setProject, currentDefinitions, setDefinitions))
    let saving!: Promise<void>; await act(async () => { saving = hook.result.current.save(true); await Promise.resolve() })
    current = state('Changed while saving'); window.dispatchEvent(new CustomEvent('kopruq:project-data-changed', { detail: { source: 'project' } }))
    await act(async () => { release(); await saving })
    expect(JSON.parse(written[0]).projectState.project.name).toBe('Initial'); expect(hook.result.current.dirty).toBe(true)
    hook.unmount()
  })
  it('clears the file reference when applying an opened project fails, so the next Save does not overwrite the previous file', async () => {
    const oldWritable = { write: vi.fn(), close: vi.fn() }
    const oldHandle = { name: 'old.kopruq', createWritable: vi.fn().mockResolvedValue(oldWritable) }
    const newHandle = { name: 'new.kopruq', createWritable: vi.fn().mockResolvedValue({ write: vi.fn(), close: vi.fn() }) }
    const picker = vi.fn().mockResolvedValueOnce(oldHandle).mockResolvedValue(newHandle)
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: picker })
    let current = state('Initial'); let failState = false
    const setProject = (next: typeof current | ((previous: typeof current) => typeof current)) => { if (failState) throw new Error('state failure'); current = typeof next === 'function' ? next(current) : next }
    const setDefinitions = vi.fn()
    const hook = renderHook(() => useProjectFile(current, setProject, definitions, setDefinitions))
    await act(async () => { await hook.result.current.save(true) })
    expect(picker).toHaveBeenCalledTimes(1); expect(hook.result.current.ref?.name).toBe('old.kopruq')
    failState = true
    const incoming = new File([projectFileText(buildProjectFile(state('Incoming'), definitions))], 'incoming.kopruq')
    await act(async () => { await expect(hook.result.current.open(incoming)).rejects.toThrow('state failure') })
    expect(hook.result.current.ref).toBeUndefined(); expect(hook.result.current.dirty).toBe(true)
    failState = false; oldHandle.createWritable.mockClear()
    await act(async () => { await hook.result.current.save() })
    expect(oldHandle.createWritable).not.toHaveBeenCalled(); expect(picker).toHaveBeenCalledTimes(2)
    hook.unmount()
  })
  it('opens a file without modules and sets wind loads to null', async () => {
    let current = state('Initial')
    const setProject = (next: typeof current | ((previous: typeof current) => typeof current)) => { current = typeof next === 'function' ? next(current) : next }
    const setWind = vi.fn()
    const hook = renderHook(() => useProjectFile(current, setProject, definitions, vi.fn(), null, setWind))
    const legacy = JSON.parse(projectFileText(buildProjectFile(state('Legacy'), definitions))); delete legacy.modules
    await act(async () => { await hook.result.current.open(new File([JSON.stringify(legacy)], 'legacy.kopruq')) })
    expect(setWind).toHaveBeenCalledWith(null); expect(current.project.name).toBe('Legacy'); expect(hook.result.current.ref?.name).toBe('legacy.kopruq')
    hook.unmount()
  })
  it('clears family snapshots and recorded graph runs after opening a project', async () => {
    publishFamilySnapshots([{ snapshotId: 's', bridgeId: 'b', graphDocumentId: 'g', sourceNodeId: 'n', sourceNodeType: 't', sourceNodeName: 'N', familyCategory: 'PIER', graphFingerprint: 'fp', candidates: [], generatedAt: '', freshness: 'VALID', executionStatus: 'SUCCESS', errors: [] }])
    localStorage.setItem('kopruq.graph.successful-runs.v1', JSON.stringify({ 'b|g': { graphFingerprint: 'fp', completedAt: '' } }))
    let current = state('Initial')
    const setProject = (next: typeof current | ((previous: typeof current) => typeof current)) => { current = typeof next === 'function' ? next(current) : next }
    const hook = renderHook(() => useProjectFile(current, setProject, definitions, vi.fn()))
    await act(async () => { await hook.result.current.open(new File([projectFileText(buildProjectFile(state('Other'), definitions))], 'other.kopruq')) })
    expect(getFamilySnapshots('b', 'g')).toHaveLength(0); expect(localStorage.getItem('kopruq.graph.successful-runs.v1')).toBeNull()
    hook.unmount()
  })
  it('restores graph, family and module storage when a step after applyProjectFile fails, and the next Save writes the pre-open data', async () => {
    const before = createEmptyGraph('Before'); importGraphDocuments({ activeGraphId: before.id, graphs: [before] }); saveFamilyRecords('PIER', [{ id: 'before', name: 'Before' }])
    localStorage.setItem('kopruq.seismic', JSON.stringify({ a: '0.1', g: 'A', t: 'Type 2', i: '1' }))
    const incomingFile = buildProjectFile(state('Incoming'), definitions)
    const after = createEmptyGraph('After'); incomingFile.graph = { activeGraphId: after.id, graphs: [after] }; incomingFile.families.PIER = [{ id: 'after', name: 'After' }]; incomingFile.modules.seismicInputs = { a: '0.9', g: 'B', t: 'Type 1', i: '2' }
    const written: string[] = []
    const picker = vi.fn().mockResolvedValue({ name: 'n.kopruq', createWritable: vi.fn().mockResolvedValue({ write: vi.fn((v: unknown) => { written.push(String(v)) }), close: vi.fn() }) })
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: picker })
    let current = state('Initial'); let failState = true
    const setProject = (next: typeof current | ((previous: typeof current) => typeof current)) => { if (failState) throw new Error('state failure'); current = typeof next === 'function' ? next(current) : next }
    const hook = renderHook(() => useProjectFile(current, setProject, definitions, vi.fn()))
    await act(async () => { await expect(hook.result.current.open(new File([projectFileText(incomingFile)], 'incoming.kopruq'))).rejects.toThrow('state failure') })
    expect(exportGraphDocuments().graphs[0].name).toBe('Before'); expect(getFamilyRecords('PIER')).toEqual([{ id: 'before', name: 'Before' }])
    expect(JSON.parse(localStorage.getItem('kopruq.seismic') ?? 'null').a).toBe('0.1')
    expect(hook.result.current.ref).toBeUndefined(); expect(hook.result.current.dirty).toBe(true)
    failState = false
    await act(async () => { await hook.result.current.save() })
    const saved = JSON.parse(written[0]); expect(saved.graph.graphs[0].name).toBe('Before'); expect(saved.projectState.project.name).toBe('Initial')
    hook.unmount()
  })
  it.each(REJECTIONS)('rejects the whole file when %s and leaves storage, React state, file reference and dirty untouched', async (_name, corrupt, path) => {
    const json = goodFileJson()
    const before = createEmptyGraph('Before'); importGraphDocuments({ activeGraphId: before.id, graphs: [before] }); saveFamilyRecords('PIER', [{ id: 'before', name: 'Before' }])
    localStorage.setItem('kopruq.seismic', JSON.stringify({ a: '0.1', g: 'A', t: 'Type 2', i: '1' }))
    localStorage.setItem('kopruq.project-workspace.v1', '{"marker":"project"}'); localStorage.setItem('kopruq.bridge-definitions.v1', '{"marker":"definitions"}')
    const handle = { name: 'kept.kopruq', createWritable: vi.fn().mockResolvedValue({ write: vi.fn(), close: vi.fn() }) }
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: vi.fn().mockResolvedValue(handle) })
    let current = state('Initial'); let currentDefinitions = definitions; let setterCalls = 0
    const setProject = (next: typeof current | ((previous: typeof current) => typeof current)) => { setterCalls++; current = typeof next === 'function' ? next(current) : next }
    const setDefinitions = () => { setterCalls++ }; const setWind = vi.fn()
    const hook = renderHook(() => useProjectFile(current, setProject, currentDefinitions, setDefinitions, null, setWind))
    await act(async () => { await hook.result.current.save(true) })
    expect(hook.result.current.dirty).toBe(false)
    const keys = [...PROJECT_DATA_ENTRIES.flatMap((entry) => entry.storageKeys), 'kopruq.project-workspace.v1', 'kopruq.bridge-definitions.v1']
    const bytes = () => keys.map((key) => localStorage.getItem(key)); const storageBefore = bytes(); const projectBefore = current; const refBefore = hook.result.current.ref
    corrupt(json)
    await act(async () => { await expect(hook.result.current.open(new File([JSON.stringify(json)], 'bad.kopruq'))).rejects.toThrow(path) })
    expect(bytes()).toEqual(storageBefore); expect(current).toBe(projectBefore); expect(currentDefinitions).toBe(definitions); expect(setterCalls).toBe(0); expect(setWind).not.toHaveBeenCalled()
    expect(hook.result.current.ref).toBe(refBefore); expect(hook.result.current.ref?.name).toBe('kept.kopruq'); expect(hook.result.current.dirty).toBe(false)
    hook.unmount()
  })
  it('keeps one Recent record across open and Save, and Save As does not bind the new file to the old record', async () => {
    localStorage.removeItem('kopruq.recent-projects.metadata.v1')
    const makeHandle = (name: string) => { const self = { name, kind: 'file', createWritable: vi.fn().mockResolvedValue({ write: vi.fn(), close: vi.fn() }), isSameEntry: vi.fn(async (other: unknown) => other === self) }; return self as unknown as FileSystemFileHandle }
    const opened = makeHandle('shared-name.kopruq'), copy = makeHandle('shared-name.kopruq')
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: vi.fn().mockResolvedValue(copy) })
    let current = state('Initial')
    const setProject = (next: typeof current | ((previous: typeof current) => typeof current)) => { current = typeof next === 'function' ? next(current) : next }
    const hook = renderHook(() => useProjectFile(current, setProject, definitions, vi.fn()))
    await act(async () => { await hook.result.current.open(new File([projectFileText(buildProjectFile(state('Opened'), definitions))], 'shared-name.kopruq'), { name: 'shared-name.kopruq', handle: opened }) })
    const openedId = hook.result.current.ref?.recentId
    expect(openedId).toBeTruthy(); expect(openedId).not.toBe('shared-name.kopruq'); expect(hook.result.current.recent).toHaveLength(1)
    await act(async () => { await hook.result.current.save() })
    expect(hook.result.current.recent).toHaveLength(1); expect(hook.result.current.ref?.recentId).toBe(openedId)
    await act(async () => { await hook.result.current.save(true) })
    expect(hook.result.current.recent).toHaveLength(2); expect(hook.result.current.ref?.recentId).toBeTruthy(); expect(hook.result.current.ref?.recentId).not.toBe(openedId)
    expect(hook.result.current.recent.find((record) => record.id === openedId)?.handle).toBe(opened)
    hook.unmount()
  })
})
