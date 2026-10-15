import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createProjectSession } from '../../shared/project-store/projectSession'
import { SAVE_ERROR_TOAST_MS, SAVE_TOAST_MS } from './saveToastTracker'
import { useSaveToast } from './useSaveToast'

type Session = ReturnType<typeof createProjectSession>

describe('useSaveToast', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  const fakeQueue = () => {
    const listeners = new Set<() => void>()
    return {
      onHeldWrite: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
      listeners,
      hold: () => { for (const listener of [...listeners]) listener() },
    }
  }
  const open = () => {
    const session = createProjectSession()
    session.begin('p1', 1)
    const queue = fakeQueue()
    const hook = renderHook(() => useSaveToast(session, queue))
    return { session, queue, hook }
  }
  const save = (session: Session, revision: number) => {
    act(() => { session.update({ status: 'saving', pendingCount: 1 }) })
    act(() => { session.setRevision(revision); session.update({ status: 'idle', pendingCount: 0 }) })
  }
  const fail = (session: Session, status: 'error' | 'rejected' | 'conflict' = 'error') => {
    act(() => { session.update({ status: 'saving', pendingCount: 1 }) })
    act(() => { session.update({ status })})
  }

  it('shows nothing after opening a project', () => {
    const { hook } = open()
    expect(hook.result.current.toast).toBeNull()
  })

  it('shows a saved toast that disappears after SAVE_TOAST_MS', () => {
    const { session, hook } = open()
    save(session, 2)
    expect(hook.result.current.toast?.kind).toBe('saved')
    act(() => { vi.advanceTimersByTime(SAVE_TOAST_MS - 1) })
    expect(hook.result.current.toast).not.toBeNull()
    act(() => { vi.advanceTimersByTime(1) })
    expect(hook.result.current.toast).toBeNull()
  })

  it('shows a failed toast that lasts SAVE_ERROR_TOAST_MS', () => {
    const { session, hook } = open()
    fail(session)
    expect(hook.result.current.toast?.kind).toBe('failed')
    act(() => { vi.advanceTimersByTime(SAVE_TOAST_MS) })
    expect(hook.result.current.toast?.kind).toBe('failed')
    act(() => { vi.advanceTimersByTime(SAVE_ERROR_TOAST_MS - SAVE_TOAST_MS - 1) })
    expect(hook.result.current.toast).not.toBeNull()
    act(() => { vi.advanceTimersByTime(1) })
    expect(hook.result.current.toast).toBeNull()
  })

  it('keeps a failed toast while paused and restarts the full time on resume', () => {
    const { session, hook } = open()
    fail(session)
    act(() => { vi.advanceTimersByTime(SAVE_ERROR_TOAST_MS - 100) })
    act(() => { hook.result.current.pause() })
    act(() => { vi.advanceTimersByTime(SAVE_ERROR_TOAST_MS * 3) })
    expect(hook.result.current.toast?.kind).toBe('failed')
    act(() => { hook.result.current.resume() })
    act(() => { vi.advanceTimersByTime(SAVE_ERROR_TOAST_MS - 1) })
    expect(hook.result.current.toast).not.toBeNull()
    act(() => { vi.advanceTimersByTime(1) })
    expect(hook.result.current.toast).toBeNull()
  })

  it('stays paused while either hover or focus holds it', () => {
    const { session, hook } = open()
    fail(session)
    act(() => { hook.result.current.pause('hover'); hook.result.current.pause('focus') })
    act(() => { hook.result.current.resume('hover') })
    act(() => { vi.advanceTimersByTime(SAVE_ERROR_TOAST_MS * 3) })
    expect(hook.result.current.toast?.kind).toBe('failed')
    act(() => { hook.result.current.resume('focus') })
    act(() => { vi.advanceTimersByTime(SAVE_ERROR_TOAST_MS) })
    expect(hook.result.current.toast).toBeNull()
  })

  it('brings the failed toast back on a held write after it expired', () => {
    const { session, queue, hook } = open()
    fail(session)
    act(() => { vi.advanceTimersByTime(SAVE_ERROR_TOAST_MS) })
    expect(hook.result.current.toast).toBeNull()
    act(() => { queue.hold() })
    expect(hook.result.current.toast?.kind).toBe('failed')
    act(() => { vi.advanceTimersByTime(SAVE_ERROR_TOAST_MS) })
    expect(hook.result.current.toast).toBeNull()
  })

  it('a held write or reshow while visible keeps the id and only restarts the timer', () => {
    const { session, queue, hook } = open()
    fail(session)
    const id = hook.result.current.toast?.id
    act(() => { vi.advanceTimersByTime(SAVE_ERROR_TOAST_MS - 100) })
    act(() => { queue.hold() })
    expect(hook.result.current.toast?.id).toBe(id)
    act(() => { vi.advanceTimersByTime(SAVE_ERROR_TOAST_MS - 100) })
    act(() => { hook.result.current.reshow() })
    expect(hook.result.current.toast?.id).toBe(id)
    act(() => { vi.advanceTimersByTime(SAVE_ERROR_TOAST_MS - 1) })
    expect(hook.result.current.toast).not.toBeNull()
  })

  it('reshow and held writes do nothing without a problem', () => {
    const { session, queue, hook } = open()
    act(() => { queue.hold(); hook.result.current.reshow() })
    expect(hook.result.current.toast).toBeNull()
    save(session, 2)
    act(() => { vi.advanceTimersByTime(SAVE_TOAST_MS) })
    act(() => { queue.hold(); hook.result.current.reshow() })
    expect(hook.result.current.toast).toBeNull()
  })

  it('closes the failed toast when the problem is discarded, without a saved toast', () => {
    const { session, hook } = open()
    fail(session)
    act(() => { session.update({ status: 'idle', pendingCount: 0 }) })
    expect(hook.result.current.toast).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('closes the failed toast when the epoch changes', () => {
    const { session, hook } = open()
    fail(session)
    act(() => { session.begin('p2', 1) })
    expect(hook.result.current.toast).toBeNull()
  })

  it('replaces the failed toast by a saved toast after a successful retry', () => {
    const { session, hook } = open()
    fail(session, 'rejected')
    act(() => { session.update({ status: 'saving', pendingCount: 1 }) })
    expect(hook.result.current.toast).toBeNull()
    act(() => { session.setRevision(2); session.update({ status: 'idle', pendingCount: 0 }) })
    expect(hook.result.current.toast?.kind).toBe('saved')
    act(() => { vi.advanceTimersByTime(SAVE_TOAST_MS) })
    expect(hook.result.current.toast).toBeNull()
  })

  it('does not stay paused for the next toast after a paused one closed', () => {
    const { session, hook } = open()
    fail(session)
    act(() => { hook.result.current.pause() })
    act(() => { session.update({ status: 'idle', pendingCount: 0 }) })
    fail(session)
    act(() => { vi.advanceTimersByTime(SAVE_ERROR_TOAST_MS) })
    expect(hook.result.current.toast).toBeNull()
  })

  it('replaces the toast on a new save and restarts the timer', () => {
    const { session, hook } = open()
    save(session, 2)
    const first = hook.result.current.toast
    act(() => { vi.advanceTimersByTime(1000) })
    save(session, 3)
    expect(hook.result.current.toast?.id).not.toBe(first?.id)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(hook.result.current.toast).not.toBeNull()
    act(() => { vi.advanceTimersByTime(500) })
    expect(hook.result.current.toast).toBeNull()
  })

  it('clears the toast when the epoch changes', () => {
    const { session, hook } = open()
    save(session, 2)
    act(() => { session.begin('p2', 1) })
    expect(hook.result.current.toast).toBeNull()
  })

  it('shows a failed toast for a local rejection that arrives without a preceding save', () => {
    const { session, hook } = open()
    act(() => { session.update({ status: 'rejected', failedKey: 'workspace' }) })
    expect(hook.result.current.toast?.kind).toBe('failed')
  })

  it('unsubscribes from the session and the held-write feed and clears its timer on unmount', () => {
    const session = createProjectSession()
    session.begin('p1', 1)
    const unsubscribe = vi.fn()
    const original = session.subscribe
    const subscribe = vi.spyOn(session, 'subscribe').mockImplementation((listener) => {
      const remove = original(listener)
      return () => { unsubscribe(); remove() }
    })
    const queue = fakeQueue()
    const hook = renderHook(() => useSaveToast(session, queue))
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(queue.listeners.size).toBe(1)
    save(session, 2)
    expect(vi.getTimerCount()).toBe(1)
    hook.unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    expect(queue.listeners.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    save(session, 3)
    expect(vi.getTimerCount()).toBe(0)
    // A failure toast timer and a late held write leave nothing behind either.
    const second = renderHook(() => useSaveToast(session, queue))
    fail(session)
    expect(vi.getTimerCount()).toBe(1)
    second.unmount()
    expect(vi.getTimerCount()).toBe(0)
    expect(queue.listeners.size).toBe(0)
    queue.hold()
    expect(vi.getTimerCount()).toBe(0)
  })
})
