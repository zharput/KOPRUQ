import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { INITIAL_PROJECT } from '../../features/project/model/projectWorkspace'
import type { PersistedProjectState } from '../../features/project/model/projectWorkspace'
import { useProjectFile } from './useProjectFile'
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
})
