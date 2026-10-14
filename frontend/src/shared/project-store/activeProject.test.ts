import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetActiveProject } from '../../test/projectSessionTestUtils'
import { z } from 'zod'
import {
  ACTIVE_PROJECT, activeProjectApi, activeProjectSession, activeSections, activeWriteQueue, createActiveCollection, createActiveSection, onProjectSwitch, setActiveProjectApi,
} from './activeProject'
import { projectApi, type ProjectApi } from './projectApi'
import type { SectionDefinition } from './serverSection'

const definition = (id: string, path = `test/${id}`): SectionDefinition<string, string> => ({
  id, path, codec: { schema: z.string().nullable(), clearable: true, toWire: (value) => value, fromWire: (wire) => wire ?? undefined },
})

function fakeApi(): ProjectApi & { putSection: ReturnType<typeof vi.fn> } {
  const putSection = vi.fn(async (projectId: string, _path: string, expectedRevision: number, value: unknown) => ({ projectId, revision: expectedRevision + 1, updatedAt: 't', value }))
  return { ...projectApi, putSection } as unknown as ProjectApi & { putSection: ReturnType<typeof vi.fn> }
}

// The global test setup opens a project; this suite exercises the session layer from a closed one.
beforeEach(() => resetActiveProject())
afterEach(() => {
  activeWriteQueue.reset()
  activeProjectSession.end()
  setActiveProjectApi(projectApi)
})

describe('active project singletons', () => {
  it('shares one session and queue between the deps', () => {
    expect(ACTIVE_PROJECT.session).toBe(activeProjectSession)
    expect(ACTIVE_PROJECT.queue).toBe(activeWriteQueue)
  })

  it('resets the write queue before a project-switch listener runs', () => {
    const section = createActiveSection(definition('order.a'))
    activeProjectSession.begin('p1', 1)
    expect(section.write('x')).toBe(true)
    expect(activeWriteQueue.pendingKeys()).toEqual(['test/order.a'])
    const seen: string[][] = []
    const off = onProjectSwitch(() => { seen.push(activeWriteQueue.pendingKeys()) })
    activeProjectSession.begin('p2', 1)
    off()
    expect(seen).toEqual([[]])
  })

  it('returns the previous api from setActiveProjectApi and sends later PUTs to the current one, also mid-session', async () => {
    const first = fakeApi(); const second = fakeApi()
    expect(setActiveProjectApi(first)).toBe(projectApi)
    expect(activeProjectApi()).toBe(first)
    const section = createActiveSection(definition('api.a'))
    activeProjectSession.begin('p1', 1)
    section.write('one'); await activeWriteQueue.flush()
    expect(first.putSection).toHaveBeenCalledTimes(1)
    expect(setActiveProjectApi(second)).toBe(first)
    section.write('two'); await activeWriteQueue.flush()
    expect(first.putSection).toHaveBeenCalledTimes(1)
    expect(second.putSection).toHaveBeenCalledWith('p1', 'test/api.a', 2, 'two')
  })
})

describe('onProjectSwitch', () => {
  it('runs once per begin and end, also for the same id, and not for revision or status updates', () => {
    const listener = vi.fn()
    const off = onProjectSwitch(listener)
    activeProjectSession.begin('p1', 1); expect(listener).toHaveBeenCalledTimes(1)
    activeProjectSession.begin('p1', 1); expect(listener).toHaveBeenCalledTimes(2)
    activeProjectSession.setRevision(5); activeProjectSession.update({ status: 'saving', pendingCount: 1 })
    expect(listener).toHaveBeenCalledTimes(2)
    activeProjectSession.end(); expect(listener).toHaveBeenCalledTimes(3)
    off()
    activeProjectSession.begin('p2', 1); expect(listener).toHaveBeenCalledTimes(3)
  })

  it('keeps calling the other listeners when one throws', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const later = vi.fn()
    const offBad = onProjectSwitch(() => { throw new Error('boom') })
    const offLater = onProjectSwitch(later)
    expect(() => activeProjectSession.begin('p1', 1)).not.toThrow()
    expect(later).toHaveBeenCalledTimes(1)
    expect(logged).toHaveBeenCalled()
    offBad(); offLater(); logged.mockRestore()
  })
})

describe('section registry', () => {
  it('registers sections and collections in order and replaces an id registered again', () => {
    const before = activeSections().length
    createActiveSection(definition('reg.a', 'reg/a'))
    createActiveCollection({ id: 'reg.c', pathOf: (id) => `reg/c/${id}`, codec: { schema: z.string(), idOf: (item: string) => item, toWire: (item) => item, fromWire: (wire) => wire } })
    expect(activeSections().slice(before).map((entry) => [entry.kind, entry.id])).toEqual([['section', 'reg.a'], ['collection', 'reg.c']])
    createActiveSection(definition('reg.a', 'reg/a2'))
    const entries = activeSections().filter((entry) => entry.id === 'reg.a')
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: 'section', path: 'reg/a2' })
  })

  it('hydrateEmpty empties a section without a request', () => {
    const api = fakeApi(); setActiveProjectApi(api)
    const section = createActiveSection(definition('empty.a'))
    activeProjectSession.begin('p1', 1); section.hydrate('value')
    activeSections().find((entry) => entry.id === 'empty.a')?.hydrateEmpty()
    expect(section.read()).toBeUndefined()
    expect(activeWriteQueue.pendingKeys()).toEqual([])
    expect(api.putSection).not.toHaveBeenCalled()
  })
})
