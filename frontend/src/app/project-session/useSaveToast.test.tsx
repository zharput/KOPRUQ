import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createProjectSession } from '../../shared/project-store/projectSession'
import { SAVE_TOAST_MS } from './saveToastTracker'
import { useSaveToast } from './useSaveToast'

describe('useSaveToast', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  const open = () => {
    const session = createProjectSession()
    session.begin('p1', 1)
    const hook = renderHook(() => useSaveToast(session))
    return { session, hook }
  }
  const save = (session: ReturnType<typeof createProjectSession>, revision: number) => {
    act(() => { session.update({ status: 'saving', pendingCount: 1 }) })
    act(() => { session.setRevision(revision); session.update({ status: 'idle', pendingCount: 0 }) })
  }

  it('shows nothing after opening a project', () => {
    const { hook } = open()
    expect(hook.result.current).toBeNull()
  })

  it('shows a saved toast that disappears after SAVE_TOAST_MS', () => {
    const { session, hook } = open()
    save(session, 2)
    expect(hook.result.current?.kind).toBe('saved')
    act(() => { vi.advanceTimersByTime(SAVE_TOAST_MS - 1) })
    expect(hook.result.current).not.toBeNull()
    act(() => { vi.advanceTimersByTime(1) })
    expect(hook.result.current).toBeNull()
  })

  it('shows a failed toast', () => {
    const { session, hook } = open()
    act(() => { session.update({ status: 'saving', pendingCount: 1 }) })
    act(() => { session.update({ status: 'error' }) })
    expect(hook.result.current?.kind).toBe('failed')
    act(() => { vi.advanceTimersByTime(SAVE_TOAST_MS) })
    expect(hook.result.current).toBeNull()
  })

  it('replaces the toast on a new save and restarts the timer', () => {
    const { session, hook } = open()
    save(session, 2)
    const first = hook.result.current
    act(() => { vi.advanceTimersByTime(1000) })
    save(session, 3)
    expect(hook.result.current?.id).not.toBe(first?.id)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(hook.result.current).not.toBeNull()
    act(() => { vi.advanceTimersByTime(500) })
    expect(hook.result.current).toBeNull()
  })

  it('clears the toast when the epoch changes', () => {
    const { session, hook } = open()
    save(session, 2)
    act(() => { session.begin('p2', 1) })
    expect(hook.result.current).toBeNull()
  })

  it('shows a failed toast for a local rejection that arrives without a preceding save', () => {
    const { session, hook } = open()
    act(() => { session.update({ status: 'rejected', failedKey: 'workspace' }) })
    expect(hook.result.current?.kind).toBe('failed')
  })

  it('unsubscribes and clears its timer on unmount', () => {
    const session = createProjectSession()
    session.begin('p1', 1)
    const unsubscribe = vi.fn()
    const original = session.subscribe
    const subscribe = vi.spyOn(session, 'subscribe').mockImplementation((listener) => {
      const remove = original(listener)
      return () => { unsubscribe(); remove() }
    })
    const hook = renderHook(() => useSaveToast(session))
    expect(subscribe).toHaveBeenCalledTimes(1)
    save(session, 2)
    expect(vi.getTimerCount()).toBe(1)
    hook.unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
    save(session, 3)
    expect(vi.getTimerCount()).toBe(0)
  })
})
