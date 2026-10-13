import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createProjectModule } from './projectModuleStore'
import { useProjectModule } from './useProjectModule'

const KEY = 'test.synthetic.hook'
const MODULE = createProjectModule('hookSynthetic', KEY, z.object({ n: z.number() }))
const FALLBACK = { n: 0 }

beforeEach(() => localStorage.clear())

describe('useProjectModule (generic)', () => {
  it('returns the fallback when nothing is stored', () => {
    const { result } = renderHook(() => useProjectModule(MODULE, FALLBACK))
    expect(result.current[0]).toBe(FALLBACK)
  })

  it('reads a stored value', () => {
    localStorage.setItem(KEY, JSON.stringify({ n: 5 }))
    const { result } = renderHook(() => useProjectModule(MODULE, FALLBACK))
    expect(result.current[0]).toEqual({ n: 5 })
  })

  it('set writes a value and a functional update receives the previous value', () => {
    const { result } = renderHook(() => useProjectModule(MODULE, FALLBACK))
    act(() => result.current[1]({ n: 2 }))
    expect(result.current[0]).toEqual({ n: 2 })
    expect(JSON.parse(localStorage.getItem(KEY) as string)).toEqual({ n: 2 })
    act(() => result.current[1](previous => ({ n: previous.n + 1 })))
    expect(result.current[0]).toEqual({ n: 3 })
  })

  it('refreshes on a storage event', () => {
    const { result } = renderHook(() => useProjectModule(MODULE, FALLBACK))
    localStorage.setItem(KEY, JSON.stringify({ n: 9 }))
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: KEY })) })
    expect(result.current[0]).toEqual({ n: 9 })
  })

  it('refreshes when the module is reset', () => {
    localStorage.setItem(KEY, JSON.stringify({ n: 4 }))
    const { result } = renderHook(() => useProjectModule(MODULE, FALLBACK))
    expect(result.current[0]).toEqual({ n: 4 })
    act(() => MODULE.reset())
    expect(result.current[0]).toBe(FALLBACK)
  })
})
