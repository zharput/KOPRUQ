import { afterEach, describe, expect, it, vi } from 'vitest'
import { confirmDiscardDrafts, DISCARD_DRAFT_MESSAGE, hasDirtyDrafts, setDraftDirty } from './unsavedDrafts'

describe('unsavedDrafts', () => {
  afterEach(() => { setDraftDirty('a', false); setDraftDirty('b', false); vi.restoreAllMocks() })

  it('is dirty while any draft holds edits', () => {
    expect(hasDirtyDrafts()).toBe(false)
    setDraftDirty('a', true)
    setDraftDirty('b', true)
    setDraftDirty('a', false)
    expect(hasDirtyDrafts()).toBe(true)
    setDraftDirty('b', false)
    expect(hasDirtyDrafts()).toBe(false)
  })

  it('asks only while a draft holds edits and returns the answer', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    expect(confirmDiscardDrafts()).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
    setDraftDirty('a', true)
    expect(confirmDiscardDrafts()).toBe(false)
    expect(confirm).toHaveBeenCalledWith(DISCARD_DRAFT_MESSAGE)
    confirm.mockReturnValue(true)
    expect(confirmDiscardDrafts()).toBe(true)
  })
})
