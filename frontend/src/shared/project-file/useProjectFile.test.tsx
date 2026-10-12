import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { INITIAL_PROJECT } from '../../features/project/model/projectWorkspace'
import type { PersistedProjectState } from '../../features/project/model/projectWorkspace'
import { useProjectFile } from './useProjectFile'
import { buildProjectFile, projectFileText } from './projectFileService'
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
})
