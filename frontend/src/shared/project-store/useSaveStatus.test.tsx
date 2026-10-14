import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { activeProjectSession, activeWriteQueue } from './activeProject'
import { useSaveStatus } from './useSaveStatus'

afterEach(() => { cleanup(); activeWriteQueue.reset(); activeProjectSession.end() })

describe('useSaveStatus', () => {
  it('returns the same snapshot reference across renders while nothing changes', () => {
    const { result, rerender } = renderHook(() => useSaveStatus())
    const first = result.current
    rerender(); rerender()
    expect(result.current).toBe(first)
  })

  it('re-renders on begin and on a queue status change', () => {
    const { result } = renderHook(() => useSaveStatus())
    expect(result.current.projectId).toBeNull()
    act(() => { activeProjectSession.begin('p1', 3) })
    expect(result.current).toMatchObject({ projectId: 'p1', revision: 3, status: 'idle' })
    act(() => { activeProjectSession.update({ status: 'saving', pendingCount: 1 }) })
    expect(result.current.status).toBe('saving')
  })
})
