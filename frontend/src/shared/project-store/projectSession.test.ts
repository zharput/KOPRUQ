import { describe, expect, it, vi } from 'vitest'
import { createProjectSession } from './projectSession'

describe('project session', () => {
  it('starts without a project and idle', () => {
    expect(createProjectSession().getSnapshot()).toEqual({ epoch: 0, projectId: null, revision: null, status: 'idle', pendingCount: 0, failedKey: null, lastError: null })
  })
  it('keeps the snapshot reference until something changes', () => {
    const session = createProjectSession(); session.begin('p1', 2)
    const first = session.getSnapshot()
    expect(session.getSnapshot()).toBe(first)
    session.setRevision(2); session.update({ status: 'idle' })
    expect(session.getSnapshot()).toBe(first)
    session.setRevision(3)
    expect(session.getSnapshot()).not.toBe(first); expect(session.getSnapshot().revision).toBe(3)
  })
  it('notifies subscribers on change only and stops after unsubscribe', () => {
    const session = createProjectSession(); const listener = vi.fn()
    const unsubscribe = session.subscribe(listener)
    session.begin('p1', 1); expect(listener).toHaveBeenCalledTimes(1)
    session.setRevision(1); expect(listener).toHaveBeenCalledTimes(1)
    session.update({ status: 'saving', pendingCount: 2 }); expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe(); session.setRevision(9); expect(listener).toHaveBeenCalledTimes(2)
  })
  it('logs a throwing listener and still notifies later subscribers', () => {
    const session = createProjectSession(); const later = vi.fn()
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    session.subscribe(() => { throw new Error('listener boom') })
    session.subscribe(later)
    expect(() => session.begin('p1', 1)).not.toThrow()
    expect(later).toHaveBeenCalledTimes(1)
    expect(logged).toHaveBeenCalledWith('Project session: a listener threw', expect.any(Error))
    logged.mockRestore()
  })
  it('begin resets status and errors; end clears the project', () => {
    const session = createProjectSession(); session.begin('p1', 1)
    const error = new Error('x'); session.update({ status: 'error', failedKey: 'workspace', lastError: error, pendingCount: 1 })
    expect(session.getSnapshot()).toMatchObject({ status: 'error', failedKey: 'workspace', lastError: error, pendingCount: 1 })
    session.begin('p2', 5)
    expect(session.getSnapshot()).toEqual({ epoch: 2, projectId: 'p2', revision: 5, status: 'idle', pendingCount: 0, failedKey: null, lastError: null })
    session.end(); expect(session.getSnapshot()).toMatchObject({ projectId: null, revision: null, status: 'idle' })
  })
  it('epoch increments on every begin and end, also for the same project id, and the snapshot reference stays stable otherwise (N2)', () => {
    const session = createProjectSession(); expect(session.getSnapshot().epoch).toBe(0)
    session.begin('p1', 3); expect(session.getSnapshot().epoch).toBe(1)
    const first = session.getSnapshot()
    session.setRevision(3); session.update({ status: 'idle' }); expect(session.getSnapshot()).toBe(first)
    session.setRevision(4); session.update({ status: 'saving' }); expect(session.getSnapshot().epoch).toBe(1)
    const listener = vi.fn(); session.subscribe(listener)
    session.begin('p1', 3); expect(session.getSnapshot().epoch).toBe(2); expect(listener).toHaveBeenCalledTimes(1)
    session.end(); expect(session.getSnapshot().epoch).toBe(3)
  })
})
