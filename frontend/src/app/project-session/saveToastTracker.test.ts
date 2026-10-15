import { describe, expect, it } from 'vitest'
import type { ProjectSessionSnapshot } from '../../shared/project-store/projectSession'
import { createSaveToastTracker } from './saveToastTracker'

const snap = (patch: Partial<ProjectSessionSnapshot>): ProjectSessionSnapshot => ({
  epoch: 1, projectId: 'p1', revision: 1, status: 'idle', pendingCount: 0, failedKey: null, lastError: null, ...patch,
})

describe('createSaveToastTracker', () => {
  it('reports saved when a draining queue moved the revision', () => {
    const tracker = createSaveToastTracker()
    expect(tracker.observe(snap({}))).toBeNull()
    expect(tracker.observe(snap({ status: 'saving', pendingCount: 1 }))).toBeNull()
    expect(tracker.observe(snap({ status: 'idle', revision: 2 }))).toBe('saved')
  })

  it('gives no toast when the revision did not change (aborted write)', () => {
    const tracker = createSaveToastTracker()
    tracker.observe(snap({}))
    tracker.observe(snap({ status: 'saving', pendingCount: 1 }))
    expect(tracker.observe(snap({ status: 'idle' }))).toBeNull()
  })

  it('reports failed for a local rejection that arrives from idle', () => {
    const tracker = createSaveToastTracker()
    tracker.observe(snap({}))
    expect(tracker.observe(snap({ status: 'rejected', failedKey: 'workspace' }))).toBe('failed')
  })

  it('gives no toast for a discard after a problem', () => {
    const tracker = createSaveToastTracker()
    tracker.observe(snap({}))
    tracker.observe(snap({ status: 'saving', pendingCount: 1 }))
    expect(tracker.observe(snap({ status: 'error' }))).toBe('failed')
    expect(tracker.observe(snap({ status: 'idle', revision: 2 }))).toBeNull()
  })

  it('resets on an epoch change', () => {
    const tracker = createSaveToastTracker()
    tracker.observe(snap({}))
    tracker.observe(snap({ status: 'saving', pendingCount: 1 }))
    expect(tracker.observe(snap({ epoch: 2, status: 'idle', revision: 5 }))).toBeNull()
    expect(tracker.observe(snap({ epoch: 3, projectId: null, revision: null }))).toBeNull()
  })

  it('reports failed when entering error, rejected or conflict from idle or saving', () => {
    for (const status of ['error', 'rejected', 'conflict'] as const) {
      const fromIdle = createSaveToastTracker()
      fromIdle.observe(snap({}))
      expect(fromIdle.observe(snap({ status }))).toBe('failed')
      const fromSaving = createSaveToastTracker()
      fromSaving.observe(snap({}))
      fromSaving.observe(snap({ status: 'saving' }))
      expect(fromSaving.observe(snap({ status }))).toBe('failed')
    }
  })

  it('does not repeat failed when moving between problem states', () => {
    const tracker = createSaveToastTracker()
    tracker.observe(snap({}))
    expect(tracker.observe(snap({ status: 'error' }))).toBe('failed')
    expect(tracker.observe(snap({ status: 'conflict' }))).toBeNull()
  })

  it('reports saved after a retry succeeds', () => {
    const tracker = createSaveToastTracker()
    tracker.observe(snap({}))
    tracker.observe(snap({ status: 'saving' }))
    expect(tracker.observe(snap({ status: 'error' }))).toBe('failed')
    expect(tracker.observe(snap({ status: 'saving' }))).toBeNull()
    expect(tracker.observe(snap({ status: 'idle', revision: 2 }))).toBe('saved')
  })
})
