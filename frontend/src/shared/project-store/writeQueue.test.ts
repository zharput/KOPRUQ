import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ApiError } from '../api/http'
import { SectionEnvelopeError, type SectionWriteEnvelope } from './projectApi'
import { ProjectDataValidationError, WireMappingError } from './projectDataValidation'
import { createProjectSession } from './projectSession'
import { createWriteQueue, SAVE_DEBOUNCE_MS, type QueuedWrite } from './writeQueue'

type Call = { projectId: string; path: string; expectedRevision: number; value: unknown; resolve(revision?: number, value?: unknown): void; reject(error: unknown): void }
const valueSchema = z.object({ v: z.number() }).strict().nullable()

function setup(revision = 10) {
  const session = createProjectSession(); session.begin('p1', revision)
  const calls: Call[] = []
  const putSection = vi.fn((projectId: string, path: string, expectedRevision: number, value: unknown) => new Promise<SectionWriteEnvelope>((resolve, reject) => {
    const call: Call = {
      projectId, path, expectedRevision, value,
      resolve: (rev = expectedRevision + 1, echoed = value) => resolve({ projectId, revision: rev, updatedAt: 'now', value: echoed }),
      reject,
    }
    calls.push(call)
  }))
  const queue = createWriteQueue({ session, putSection })
  const confirmed = vi.fn(); const discarded = vi.fn()
  const write = (key: string, v: unknown, extra: Partial<QueuedWrite> = {}): QueuedWrite => ({ key, path: key, wire: v === null ? null : { v }, valueSchema, onConfirmed: (server, sent) => confirmed(key, server, sent), onDiscarded: () => discarded(key), ...extra })
  return { session, queue, calls, putSection, confirmed, discarded, write }
}
const api = (status: number, code: string, correlationId = 'corr-1') => new ApiError({ status, message: `err ${status}`, code, correlationId, fieldErrors: [{ field: 'value.x', message: 'is required' }] })
const tick = (ms: number) => vi.advanceTimersByTimeAsync(ms)

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('write queue: debounce and coalescing', () => {
  it('sends one PUT 300 ms after the last of three writes to the same key, with the latest value', async () => {
    const { queue, calls, write, session } = setup()
    queue.enqueue(write('families/piers', 1)); await tick(100)
    queue.enqueue(write('families/piers', 2)); await tick(100)
    queue.enqueue(write('families/piers', 3))
    expect(session.getSnapshot()).toMatchObject({ status: 'saving', pendingCount: 1 })
    await tick(SAVE_DEBOUNCE_MS - 1); expect(calls).toHaveLength(0)
    await tick(1); expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ projectId: 'p1', path: 'families/piers', expectedRevision: 10, value: { v: 3 } })
  })
  it('keeps the queue position of a coalesced unsent entry', async () => {
    const { queue, calls, write } = setup()
    queue.enqueue(write('a', 1)); queue.enqueue(write('b', 1)); queue.enqueue(write('a', 2))
    expect(queue.pendingKeys()).toEqual(['a', 'b'])
    await tick(SAVE_DEBOUNCE_MS); expect(calls[0]).toMatchObject({ path: 'a', value: { v: 2 } })
  })
  it('throws when there is no active project', () => {
    const session = createProjectSession(); const queue = createWriteQueue({ session, putSection: vi.fn() })
    expect(() => queue.enqueue({ key: 'a', path: 'a', wire: null, valueSchema, onConfirmed: vi.fn(), onDiscarded: vi.fn() })).toThrow('No active project')
  })
})

describe('write queue: serial sending and revision chain', () => {
  it('starts the second PUT only after the first response and chains the revision', async () => {
    const { queue, calls, write, session, confirmed } = setup(10)
    queue.enqueue(write('a', 1)); queue.enqueue(write('b', 2))
    await tick(SAVE_DEBOUNCE_MS); expect(calls).toHaveLength(1); expect(calls[0].expectedRevision).toBe(10)
    await tick(1000); expect(calls).toHaveLength(1)
    calls[0].resolve(11); await tick(0)
    expect(calls).toHaveLength(2); expect(calls[1]).toMatchObject({ path: 'b', expectedRevision: 11 })
    expect(session.getSnapshot()).toMatchObject({ revision: 11, status: 'saving', pendingCount: 1 })
    calls[1].resolve(12); await tick(0)
    expect(session.getSnapshot()).toMatchObject({ revision: 12, status: 'idle', pendingCount: 0, lastError: null })
    expect(confirmed).toHaveBeenNthCalledWith(1, 'a', { v: 1 }, { v: 1 }); expect(confirmed).toHaveBeenNthCalledWith(2, 'b', { v: 2 }, { v: 2 })
  })
  it('a write to the same key while in flight is sent after the first completes, debounced, with the chained revision', async () => {
    const { queue, calls, write, session } = setup(5)
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS)
    queue.enqueue(write('a', 2)); queue.enqueue(write('b', 9))
    await tick(SAVE_DEBOUNCE_MS * 2); expect(calls).toHaveLength(1)
    calls[0].resolve(6); await tick(0)
    expect(calls).toHaveLength(2); expect(calls[1]).toMatchObject({ path: 'a', value: { v: 2 }, expectedRevision: 6 })
    calls[1].resolve(7); await tick(0); expect(calls[2]).toMatchObject({ path: 'b', expectedRevision: 7 })
    calls[2].resolve(8); await tick(0)
    expect(session.getSnapshot().revision).toBe(8); expect(session.getSnapshot().status).toBe('idle')
  })
  it('waits for the running debounce timer after a response instead of sending immediately', async () => {
    const { queue, calls, write } = setup()
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS)
    queue.enqueue(write('b', 1)); await tick(100)
    calls[0].resolve(); await tick(0); expect(calls).toHaveLength(1)
    await tick(SAVE_DEBOUNCE_MS - 100); expect(calls).toHaveLength(2)
  })
})

describe('write queue: failures', () => {
  it('409 conflict stops the queue; retry rejects without a request; discard returns to idle', async () => {
    const { queue, calls, write, session, discarded } = setup()
    queue.enqueue(write('a', 1)); queue.enqueue(write('b', 1)); await tick(SAVE_DEBOUNCE_MS)
    calls[0].reject(api(409, 'PROJECT_REVISION_CONFLICT')); await tick(0)
    expect(session.getSnapshot()).toMatchObject({ status: 'conflict', failedKey: 'a', pendingCount: 2 })
    expect((session.getSnapshot().lastError as ApiError).code).toBe('PROJECT_REVISION_CONFLICT')
    queue.enqueue(write('c', 1)); await tick(5000); expect(calls).toHaveLength(1)
    await expect(queue.retry()).rejects.toMatchObject({ code: 'PROJECT_REVISION_CONFLICT' }); expect(calls).toHaveLength(1)
    await expect(queue.flush()).rejects.toMatchObject({ status: 409 })
    queue.discard()
    expect(discarded.mock.calls.map((c) => c[0])).toEqual(['a', 'b', 'c'])
    expect(session.getSnapshot()).toMatchObject({ status: 'idle', pendingCount: 0, failedKey: null, lastError: null })
  })
  it('400 rejects with the server field errors; a new write updates the failed entry without sending; retry sends the latest value once', async () => {
    const { queue, calls, write, session } = setup(3)
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS)
    calls[0].reject(api(400, 'INVALID_REQUEST')); await tick(0)
    expect(session.getSnapshot().status).toBe('rejected')
    expect((session.getSnapshot().lastError as ApiError).fieldErrors).toEqual([{ field: 'value.x', message: 'is required' }])
    queue.enqueue(write('a', 2)); await tick(5000); expect(calls).toHaveLength(1)
    expect(session.getSnapshot()).toMatchObject({ status: 'rejected', pendingCount: 1 })
    const retry = queue.retry(); await tick(0)
    expect(calls).toHaveLength(2); expect(calls[1]).toMatchObject({ path: 'a', value: { v: 2 }, expectedRevision: 3 })
    calls[1].resolve(4); await retry
    expect(session.getSnapshot()).toMatchObject({ status: 'idle', revision: 4, pendingCount: 0 })
  })
  it('400 then discard rolls the entries back', async () => {
    const { queue, calls, write, session, discarded } = setup()
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS); calls[0].reject(api(422, 'INVALID_REQUEST')); await tick(0)
    expect(session.getSnapshot().status).toBe('rejected')
    queue.discard(); expect(discarded).toHaveBeenCalledWith('a'); expect(session.getSnapshot().status).toBe('idle')
  })
  it.each([
    ['network failure', () => new TypeError('Failed to fetch')],
    ['404', () => api(404, 'PROJECT_NOT_FOUND')],
    ['500', () => api(500, 'INTERNAL_ERROR')],
  ])('%s -> error, pending kept, retry succeeds', async (_name, makeError) => {
    const { queue, calls, write, session } = setup(1)
    queue.enqueue(write('a', 1)); queue.enqueue(write('b', 1)); await tick(SAVE_DEBOUNCE_MS)
    calls[0].reject(makeError()); await tick(0)
    expect(session.getSnapshot()).toMatchObject({ status: 'error', failedKey: 'a', pendingCount: 2 }); expect(queue.pendingKeys()).toEqual(['a', 'b'])
    const error = session.getSnapshot().lastError
    if (error instanceof ApiError) expect(error.correlationId).toBe('corr-1')
    const retry = queue.retry(); await tick(0)
    expect(calls[1]).toMatchObject({ path: 'a', expectedRevision: 1 })
    calls[1].resolve(2); await tick(0); expect(calls[2]).toMatchObject({ path: 'b', expectedRevision: 2 })
    calls[2].resolve(3); await retry
    expect(session.getSnapshot()).toMatchObject({ status: 'idle', revision: 3 })
  })
  it('error then discard rolls back', async () => {
    const { queue, calls, write, session, discarded } = setup()
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS); calls[0].reject(api(500, 'INTERNAL_ERROR')); await tick(0)
    queue.discard(); expect(discarded).toHaveBeenCalledWith('a'); expect(session.getSnapshot()).toMatchObject({ status: 'idle', pendingCount: 0 })
  })
  it('reportLocalRejection rejects without a request', async () => {
    const { queue, calls, write, session } = setup()
    queue.enqueue(write('b', 1))
    const error = new WireMappingError('bridges[0].id', 'must not be empty')
    queue.reportLocalRejection('workspace', error)
    expect(session.getSnapshot()).toMatchObject({ status: 'rejected', failedKey: 'workspace', lastError: error })
    await tick(5000); expect(calls).toHaveLength(0)
    await expect(queue.flush()).rejects.toBe(error)
  })
  it('an invalid 200 value updates the revision, stops the queue with a ProjectDataValidationError and confirms the sent value', async () => {
    const { queue, calls, write, session, confirmed } = setup(10)
    queue.enqueue(write('a', 1)); queue.enqueue(write('b', 1)); await tick(SAVE_DEBOUNCE_MS)
    calls[0].resolve(11, { v: 'wrong' }); await tick(0)
    expect(session.getSnapshot()).toMatchObject({ revision: 11, status: 'error', failedKey: 'a' })
    expect(session.getSnapshot().lastError).toBeInstanceOf(ProjectDataValidationError)
    expect(confirmed).toHaveBeenCalledWith('a', { v: 1 }, { v: 1 })
    await tick(5000); expect(calls).toHaveLength(1); expect(queue.pendingKeys()).toEqual(['b'])
  })
})

describe('write queue: flush, discard and reset', () => {
  it('flush sends without waiting for the debounce and resolves when drained', async () => {
    const { queue, calls, write, session } = setup(1)
    queue.enqueue(write('a', 1)); queue.enqueue(write('b', 1))
    let done = false; const flushed = queue.flush().then(() => { done = true }); await tick(0)
    expect(calls).toHaveLength(1)
    calls[0].resolve(2); await tick(0); expect(calls).toHaveLength(2); expect(done).toBe(false)
    calls[1].resolve(3); await flushed
    expect(done).toBe(true); expect(session.getSnapshot()).toMatchObject({ status: 'idle', revision: 3 })
    await tick(5000); expect(calls).toHaveLength(2)
  })
  it('flush rejects with the error of a failed send and immediately when stalled; resolves at once when empty', async () => {
    const { queue, calls, write } = setup()
    await expect(queue.flush()).resolves.toBeUndefined()
    queue.enqueue(write('a', 1)); const flushed = queue.flush(); const assertion = expect(flushed).rejects.toMatchObject({ status: 500 })
    await tick(0); calls[0].reject(api(500, 'INTERNAL_ERROR')); await assertion
    await expect(queue.flush()).rejects.toMatchObject({ status: 500 }); expect(calls).toHaveLength(1)
  })
  it('discard reverts the entry in flight too (N1), keeps the request running and returns to idle after it completes', async () => {
    const { queue, calls, write, session, discarded } = setup()
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS); queue.enqueue(write('b', 1))
    queue.discard(); expect(discarded.mock.calls.map((c) => c[0])).toEqual(['a', 'b']); expect(session.getSnapshot()).toMatchObject({ status: 'saving', pendingCount: 1 })
    await tick(5000); expect(calls).toHaveLength(1)
    calls[0].resolve(); await tick(0); expect(session.getSnapshot()).toMatchObject({ status: 'idle', pendingCount: 0 })
  })
  it('reset ignores the response of the request in flight and drops everything without callbacks', async () => {
    const { queue, calls, write, session, confirmed, discarded } = setup(10)
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS); queue.enqueue(write('b', 1))
    queue.reset()
    expect(session.getSnapshot()).toMatchObject({ status: 'idle', pendingCount: 0 }); expect(queue.pendingKeys()).toEqual([])
    calls[0].resolve(11); await tick(0)
    expect(session.getSnapshot().revision).toBe(10); expect(confirmed).not.toHaveBeenCalled(); expect(discarded).not.toHaveBeenCalled()
    await tick(5000); expect(calls).toHaveLength(1)
  })
})

describe('write queue: one entry per key after a failure (F1)', () => {
  it.each([
    ['400', () => api(400, 'INVALID_REQUEST'), 'rejected'],
    ['500', () => api(500, 'INTERNAL_ERROR'), 'error'],
    ['network failure', () => new TypeError('Failed to fetch'), 'error'],
  ])('in-flight K=v1, write v2, v1 fails (%s), write v3, retry -> exactly one PUT for K with v3', async (_name, makeError, status) => {
    const { queue, calls, write, session, confirmed, discarded } = setup(10)
    queue.enqueue(write('K', 1)); await tick(SAVE_DEBOUNCE_MS)
    queue.enqueue(write('K', 2))
    calls[0].reject(makeError()); await tick(0)
    expect(session.getSnapshot()).toMatchObject({ status, failedKey: 'K', pendingCount: 1 }); expect(queue.pendingKeys()).toEqual(['K'])
    queue.enqueue(write('K', 3)); await tick(5000)
    expect(calls).toHaveLength(1); expect(queue.pendingKeys()).toEqual(['K']); expect(session.getSnapshot().pendingCount).toBe(1)
    const retry = queue.retry(); await tick(0)
    expect(calls).toHaveLength(2); expect(calls[1]).toMatchObject({ path: 'K', value: { v: 3 }, expectedRevision: 10 })
    calls[1].resolve(); await retry
    expect(calls).toHaveLength(2); expect(confirmed).toHaveBeenCalledTimes(1); expect(confirmed).toHaveBeenCalledWith('K', { v: 3 }, { v: 3 })
    expect(session.getSnapshot()).toMatchObject({ status: 'idle', pendingCount: 0, revision: 11 }); expect(discarded).not.toHaveBeenCalled()
  })
  it('discard calls onDiscarded once per key after a failure with a newer write of the same key', async () => {
    const { queue, calls, write, discarded } = setup()
    queue.enqueue(write('a', 1)); queue.enqueue(write('b', 1)); await tick(SAVE_DEBOUNCE_MS)
    queue.enqueue(write('a', 2))
    calls[0].reject(api(500, 'INTERNAL_ERROR')); await tick(0)
    expect(queue.pendingKeys()).toEqual(['a', 'b'])
    queue.discard(); expect(discarded.mock.calls.map((c) => c[0])).toEqual(['a', 'b'])
  })
  it('a newer entry of the failed key is moved to the head so failedKey stays first', async () => {
    const { queue, calls, write } = setup()
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS)
    queue.enqueue(write('b', 1)); queue.enqueue(write('a', 2))
    calls[0].reject(api(500, 'INTERNAL_ERROR')); await tick(0)
    expect(queue.pendingKeys()).toEqual(['a', 'b'])
  })
})

describe('write queue: failure severity (F4)', () => {
  it('a conflict is sticky: a later local rejection does not replace it and retry still rejects without a request', async () => {
    const { queue, calls, write, session } = setup()
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS); calls[0].reject(api(409, 'PROJECT_REVISION_CONFLICT')); await tick(0)
    queue.reportLocalRejection('b', new WireMappingError('x', 'bad'))
    expect(session.getSnapshot()).toMatchObject({ status: 'conflict', failedKey: 'a' }); expect((session.getSnapshot().lastError as ApiError).status).toBe(409)
    await expect(queue.retry()).rejects.toMatchObject({ status: 409 }); expect(calls).toHaveLength(1)
  })
  it('a conflict of the request in flight replaces an earlier local rejection (more severe)', async () => {
    const { queue, calls, write, session } = setup()
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS)
    queue.reportLocalRejection('b', new WireMappingError('x', 'bad'))
    calls[0].reject(api(409, 'PROJECT_REVISION_CONFLICT')); await tick(0)
    expect(session.getSnapshot()).toMatchObject({ status: 'conflict', failedKey: 'a' })
    await expect(queue.retry()).rejects.toMatchObject({ status: 409 })
  })
  it('a local rejection is not erased by a later network error of the request in flight (the entry still returns to the queue)', async () => {
    const { queue, calls, write, session } = setup()
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS)
    const error = new WireMappingError('x', 'bad'); queue.reportLocalRejection('b', error)
    calls[0].reject(new TypeError('Failed to fetch')); await tick(0)
    expect(session.getSnapshot()).toMatchObject({ status: 'rejected', failedKey: 'b', lastError: error, pendingCount: 1 }); expect(queue.pendingKeys()).toEqual(['a'])
  })
})

describe('write queue: invalid 200 envelope (F5)', () => {
  it('applies a readable revision, confirms the sent value, stops with error; retry then uses the new revision', async () => {
    const { queue, calls, putSection, session, write, confirmed } = setup(10)
    putSection.mockImplementationOnce(async () => { throw new SectionEnvelopeError(new ProjectDataValidationError([{ path: '', message: 'Unrecognized key' }]), 11) })
    queue.enqueue(write('a', 1)); queue.enqueue(write('b', 1)); await tick(SAVE_DEBOUNCE_MS)
    expect(session.getSnapshot()).toMatchObject({ revision: 11, status: 'error', failedKey: 'a', pendingCount: 1 })
    expect(session.getSnapshot().lastError).toBeInstanceOf(ProjectDataValidationError); expect(confirmed).toHaveBeenCalledWith('a', { v: 1 }, { v: 1 })
    expect(queue.pendingKeys()).toEqual(['b'])
    const retry = queue.retry(); await tick(0)
    expect(calls).toHaveLength(1); expect(calls[0]).toMatchObject({ path: 'b', expectedRevision: 11 })
    calls[0].resolve(); await retry
    expect(session.getSnapshot()).toMatchObject({ status: 'idle', revision: 12 })
  })
  it('without a readable revision the entry returns to the queue (outcome unknown)', async () => {
    const { queue, putSection, session, write } = setup(10)
    putSection.mockImplementationOnce(async () => { throw new SectionEnvelopeError(new ProjectDataValidationError([{ path: '', message: 'bad' }]), null) })
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS)
    expect(session.getSnapshot()).toMatchObject({ revision: 10, status: 'error', failedKey: 'a', pendingCount: 1 }); expect(queue.pendingKeys()).toEqual(['a'])
  })
})

describe('write queue: project binding (F6)', () => {
  it('begin of another project resets the queue; the response of the old project does not touch the new revision', async () => {
    const { queue, calls, write, session, confirmed } = setup(10)
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS); queue.enqueue(write('b', 1))
    session.begin('p2', 50)
    expect(session.getSnapshot()).toMatchObject({ projectId: 'p2', revision: 50, status: 'idle', pendingCount: 0 }); expect(queue.pendingKeys()).toEqual([])
    calls[0].resolve(11); await tick(0)
    expect(session.getSnapshot()).toMatchObject({ projectId: 'p2', revision: 50, status: 'idle', pendingCount: 0 }); expect(confirmed).not.toHaveBeenCalled()
    await tick(5000); expect(calls).toHaveLength(1)
    queue.enqueue(write('c', 1)); await tick(SAVE_DEBOUNCE_MS); expect(calls[1]).toMatchObject({ projectId: 'p2', expectedRevision: 50 })
  })
  it('end of the session drops the queue and ignores a failing response', async () => {
    const { queue, calls, write, session } = setup()
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS); session.end()
    calls[0].reject(api(500, 'INTERNAL_ERROR')); await tick(0)
    expect(session.getSnapshot()).toMatchObject({ projectId: null, status: 'idle', pendingCount: 0 }); expect(queue.pendingKeys()).toEqual([])
  })
})

describe('write queue: drop(key) (F3)', () => {
  it('removes only the unsent entry of that key without a callback and keeps sending the rest', async () => {
    const { queue, calls, write, session, discarded } = setup()
    queue.enqueue(write('a', 1)); queue.enqueue(write('b', 1)); queue.drop('a')
    expect(queue.pendingKeys()).toEqual(['b']); expect(session.getSnapshot().pendingCount).toBe(1); expect(discarded).not.toHaveBeenCalled()
    await tick(SAVE_DEBOUNCE_MS); expect(calls).toHaveLength(1); expect(calls[0].path).toBe('b')
  })
  it('clears a rejection of that key and restarts sending of the rest, but not a conflict', async () => {
    const { queue, calls, write, session } = setup()
    queue.enqueue(write('b', 1)); queue.reportLocalRejection('a', new WireMappingError('x', 'bad'))
    await tick(1000); expect(calls).toHaveLength(0)
    queue.drop('a'); expect(session.getSnapshot()).toMatchObject({ status: 'saving', failedKey: null })
    await tick(SAVE_DEBOUNCE_MS); expect(calls).toHaveLength(1)
    calls[0].reject(api(409, 'PROJECT_REVISION_CONFLICT')); await tick(0)
    queue.drop('b'); expect(session.getSnapshot().status).toBe('conflict')
  })
  it('an in-flight request of a dropped/discarded key is not requeued when it fails', async () => {
    const { queue, calls, write, session } = setup()
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS); queue.drop('a')
    calls[0].reject(api(500, 'INTERNAL_ERROR')); await tick(0)
    expect(queue.pendingKeys()).toEqual([]); expect(session.getSnapshot()).toMatchObject({ status: 'idle', pendingCount: 0 })
    queue.enqueue(write('b', 1)); await tick(SAVE_DEBOUNCE_MS); queue.discard()
    calls[1].reject(new TypeError('Failed to fetch')); await tick(0)
    expect(queue.pendingKeys()).toEqual([]); expect(session.getSnapshot().status).toBe('idle')
  })
})

describe('write queue: discard of the entry in flight (N1)', () => {
  it('discard calls onDiscarded of the in-flight entry once, even if discard is repeated; a failed request is not requeued and flush resolves', async () => {
    const { queue, calls, write, session, discarded } = setup()
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS)
    queue.discard(); queue.discard()
    expect(discarded.mock.calls.map((c) => c[0])).toEqual(['a'])
    calls[0].reject(new TypeError('Failed to fetch')); await tick(0)
    expect(queue.pendingKeys()).toEqual([]); expect(session.getSnapshot()).toMatchObject({ status: 'idle', pendingCount: 0 })
    await expect(queue.flush()).resolves.toBeUndefined()
  })
})

describe('write queue: conflict after an in-flight discard (NF2)', () => {
  it.each(['drop', 'discard'] as const)('%s keeps a later 409 visible without requeueing the dropped write', async (action) => {
    const { queue, calls, write, session } = setup()
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS)
    if (action === 'drop') queue.drop('a'); else queue.discard()
    calls[0].reject(api(409, 'PROJECT_REVISION_CONFLICT')); await tick(0)
    expect(queue.pendingKeys()).toEqual([])
    expect(session.getSnapshot()).toMatchObject({ status: 'conflict', failedKey: 'a', pendingCount: 0 })
    await expect(queue.flush()).rejects.toMatchObject({ status: 409 })
    await expect(queue.retry()).rejects.toMatchObject({ status: 409 })
    expect(calls).toHaveLength(1)
  })
})

describe('write queue: re-begin of the same project id (N2)', () => {
  it('a conflict is cleared by begin(sameId, newRevision): queue idle and empty, retry sends nothing', async () => {
    const { queue, calls, write, session } = setup(10)
    queue.enqueue(write('a', 1)); queue.enqueue(write('b', 1)); await tick(SAVE_DEBOUNCE_MS)
    calls[0].reject(api(409, 'PROJECT_REVISION_CONFLICT')); await tick(0)
    expect(session.getSnapshot().status).toBe('conflict')
    session.begin('p1', 40)
    expect(session.getSnapshot()).toMatchObject({ projectId: 'p1', revision: 40, status: 'idle', pendingCount: 0, failedKey: null, lastError: null })
    expect(queue.pendingKeys()).toEqual([])
    await expect(queue.retry()).resolves.toBeUndefined(); await expect(queue.flush()).resolves.toBeUndefined()
    await tick(5000); expect(calls).toHaveLength(1)
    queue.enqueue(write('c', 1)); await tick(SAVE_DEBOUNCE_MS); expect(calls[1]).toMatchObject({ path: 'c', expectedRevision: 40 })
  })
  it('the response of the old epoch is ignored after begin(sameId, rev): no setRevision, no callback, no status change', async () => {
    const { queue, calls, write, session, confirmed } = setup(10)
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS); queue.enqueue(write('b', 1))
    session.begin('p1', 40)
    expect(queue.pendingKeys()).toEqual([])
    calls[0].resolve(11); await tick(0)
    expect(session.getSnapshot()).toMatchObject({ revision: 40, status: 'idle', pendingCount: 0 }); expect(confirmed).not.toHaveBeenCalled()
    await tick(5000); expect(calls).toHaveLength(1)
  })
  it('the failing response of the old epoch is ignored as well', async () => {
    const { queue, calls, write, session } = setup(10)
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS); session.begin('p1', 40)
    calls[0].reject(api(500, 'INTERNAL_ERROR')); await tick(0)
    expect(session.getSnapshot()).toMatchObject({ revision: 40, status: 'idle', pendingCount: 0 }); expect(queue.pendingKeys()).toEqual([])
  })
})

describe('write queue: session listener order (H1)', () => {
  it('keeps a write enqueued by a listener subscribed before the queue during begin', async () => {
    const session = createProjectSession(); session.begin('p1', 10)
    const putSection = vi.fn(async (projectId: string, _path: string, expectedRevision: number, value: unknown) => ({ projectId, revision: expectedRevision + 1, updatedAt: 'now', value }))
    let queue!: ReturnType<typeof createWriteQueue>
    let seenEpoch = session.getSnapshot().epoch
    session.subscribe(() => {
      const epoch = session.getSnapshot().epoch
      if (epoch === seenEpoch) return
      seenEpoch = epoch
      queue.enqueue({ key: 'new', path: 'new', wire: { v: 2 }, valueSchema, onConfirmed: vi.fn(), onDiscarded: vi.fn() })
    })
    queue = createWriteQueue({ session, putSection })
    queue.enqueue({ key: 'old', path: 'old', wire: { v: 1 }, valueSchema, onConfirmed: vi.fn(), onDiscarded: vi.fn() })
    session.begin('p1', 40)
    expect(queue.pendingKeys()).toEqual(['new'])
    await tick(SAVE_DEBOUNCE_MS)
    expect(putSection).toHaveBeenCalledExactlyOnceWith('p1', 'new', 40, { v: 2 })
  })
})

describe('write queue: masked failures (N3)', () => {
  it('a network error behind a local rejection is not retried silently when the rejection is dropped; retry then resends it', async () => {
    const { queue, calls, write, session } = setup(10)
    queue.enqueue(write('K', 1)); await tick(SAVE_DEBOUNCE_MS)
    const error = new WireMappingError('x', 'bad'); queue.reportLocalRejection('L', error)
    calls[0].reject(new TypeError('Failed to fetch')); await tick(0)
    expect(session.getSnapshot()).toMatchObject({ status: 'rejected', failedKey: 'L', lastError: error }); expect(queue.pendingKeys()).toEqual(['K'])
    queue.drop('L')
    expect(session.getSnapshot()).toMatchObject({ status: 'error', failedKey: 'K', pendingCount: 1 })
    await tick(5000); expect(calls).toHaveLength(1)
    await expect(queue.flush()).rejects.toBeInstanceOf(TypeError)
    const retry = queue.retry(); await tick(0)
    expect(calls).toHaveLength(2); expect(calls[1]).toMatchObject({ path: 'K', expectedRevision: 10 })
    calls[1].resolve(); await retry
    expect(session.getSnapshot()).toMatchObject({ status: 'idle', pendingCount: 0 })
  })
  it('a conflict stays shown and sticky above masked failures; discard clears them all', async () => {
    const { queue, calls, write, session } = setup()
    queue.enqueue(write('K', 1)); await tick(SAVE_DEBOUNCE_MS)
    queue.reportLocalRejection('L', new WireMappingError('x', 'bad'))
    calls[0].reject(api(409, 'PROJECT_REVISION_CONFLICT')); await tick(0)
    expect(session.getSnapshot()).toMatchObject({ status: 'conflict', failedKey: 'K' })
    queue.drop('L'); queue.drop('K'); expect(session.getSnapshot().status).toBe('conflict')
    queue.discard(); expect(session.getSnapshot()).toMatchObject({ status: 'idle', failedKey: null })
  })
})

describe('write queue: unreadable envelope on a dropped entry (N4)', () => {
  const deferEnvelope = (putSection: ReturnType<typeof setup>['putSection']) => {
    let fail!: (error: unknown) => void
    putSection.mockImplementationOnce(() => new Promise<never>((_, reject) => { fail = reject }))
    return (error: unknown) => fail(error)
  }
  it('without a readable revision: status error and flush rejects, although the entry was dropped in flight', async () => {
    const { queue, putSection, session, write } = setup(10)
    const fail = deferEnvelope(putSection)
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS); queue.drop('a')
    fail(new SectionEnvelopeError(new ProjectDataValidationError([{ path: '', message: 'bad' }]), null)); await tick(0)
    expect(session.getSnapshot()).toMatchObject({ revision: 10, status: 'error', failedKey: 'a' }); expect(queue.pendingKeys()).toEqual([])
    await expect(queue.flush()).rejects.toBeInstanceOf(ProjectDataValidationError)
  })
  it('with a readable revision: the revision is applied and the status is error, although the entry was discarded in flight', async () => {
    const { queue, putSection, session, write } = setup(10)
    const fail = deferEnvelope(putSection)
    queue.enqueue(write('a', 1)); await tick(SAVE_DEBOUNCE_MS); queue.discard()
    fail(new SectionEnvelopeError(new ProjectDataValidationError([{ path: '', message: 'bad' }]), 11)); await tick(0)
    expect(session.getSnapshot()).toMatchObject({ revision: 11, status: 'error' })
  })
})

describe('write queue: listener exceptions and dispose (H2, H3)', () => {
  it('a throwing session listener does not stop enqueue or the next send', async () => {
    const session = createProjectSession(); session.begin('p1', 10)
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    session.subscribe(() => { throw new Error('session listener boom') })
    const putSection = vi.fn(async (projectId: string, _path: string, expectedRevision: number, value: unknown) => ({ projectId, revision: expectedRevision + 1, updatedAt: 'now', value }))
    const queue = createWriteQueue({ session, putSection })
    const write = (key: string): QueuedWrite => ({ key, path: key, wire: { v: 1 }, valueSchema, onConfirmed: vi.fn(), onDiscarded: vi.fn() })
    expect(() => { queue.enqueue(write('a')); queue.enqueue(write('b')) }).not.toThrow()
    await tick(SAVE_DEBOUNCE_MS)
    expect(putSection.mock.calls.map((call) => call[1])).toEqual(['a', 'b'])
    expect(session.getSnapshot()).toMatchObject({ status: 'idle', pendingCount: 0, revision: 12 })
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })
  it('an onConfirmed that throws is logged, the status does not stay at saving and the next entry is sent without a new enqueue', async () => {
    const { queue, calls, write, session } = setup()
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    queue.enqueue(write('a', 1, { onConfirmed: () => { throw new Error('listener boom') } })); queue.enqueue(write('b', 1))
    await tick(SAVE_DEBOUNCE_MS); calls[0].resolve(); await tick(SAVE_DEBOUNCE_MS)
    expect(logged).toHaveBeenCalledTimes(1); expect(calls).toHaveLength(2); expect(calls[1].path).toBe('b')
    calls[1].resolve(); await tick(0)
    expect(session.getSnapshot()).toMatchObject({ status: 'idle', pendingCount: 0 })
    logged.mockRestore()
  })
  it('an onDiscarded that throws does not stop the other callbacks', () => {
    const { queue, write, discarded } = setup()
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    queue.enqueue(write('a', 1, { onDiscarded: () => { throw new Error('boom') } })); queue.enqueue(write('b', 1))
    queue.discard(); expect(discarded).toHaveBeenCalledWith('b'); logged.mockRestore()
  })
  it('dispose unsubscribes from the session, resets the queue and makes enqueue throw; calling it twice is safe', async () => {
    const session = createProjectSession(); session.begin('p1', 1)
    const unsubscribed = vi.fn(); const subscribe = session.subscribe.bind(session)
    session.subscribe = (listener) => { const off = subscribe(listener); return () => { unsubscribed(); off() } }
    const putSection = vi.fn(() => new Promise<SectionWriteEnvelope>(() => undefined))
    const queue = createWriteQueue({ session, putSection })
    queue.enqueue({ key: 'a', path: 'a', wire: { v: 1 }, valueSchema, onConfirmed: vi.fn(), onDiscarded: vi.fn() }); await tick(SAVE_DEBOUNCE_MS)
    queue.dispose()
    expect(unsubscribed).toHaveBeenCalledTimes(1); expect(session.getSnapshot()).toMatchObject({ status: 'idle', pendingCount: 0 })
    session.update({ status: 'error', failedKey: 'z' }); queue.reset(); queue.discard()
    expect(session.getSnapshot()).toMatchObject({ status: 'error', failedKey: 'z' })
    expect(() => queue.enqueue({ key: 'a', path: 'a', wire: null, valueSchema, onConfirmed: vi.fn(), onDiscarded: vi.fn() })).toThrow('disposed')
    queue.dispose(); expect(unsubscribed).toHaveBeenCalledTimes(1)
  })
})
