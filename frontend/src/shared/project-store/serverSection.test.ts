import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ApiError } from '../api/http'
import type { SectionWriteEnvelope } from './projectApi'
import { WireMappingError } from './projectDataValidation'
import { createProjectSession } from './projectSession'
import { createServerSection, createServerSectionCollection, type CollectionCodec, type SectionCodec } from './serverSection'
import { createWriteQueue, SAVE_DEBOUNCE_MS } from './writeQueue'

// Synthetic section: frontend value { n, ui } <-> wire { n }; `ui` is frontend-only.
type Local = { n: number; ui: string }
type Wire = { n: number }
const wireSchema = z.object({ n: z.number() }).strict()
const codec = (clearable: boolean): SectionCodec<Local, Wire> => ({
  schema: wireSchema.nullable(), clearable,
  toWire: (value) => { if (value.n < 0) throw new WireMappingError('n', 'must not be negative'); return { n: value.n } },
  fromWire: (wire) => wire === null ? undefined : { n: wire.n, ui: 'default' },
})

type Call = { path: string; expectedRevision: number; value: unknown; resolve(echo?: unknown): void; reject(error: unknown): void }
function setup(active = true) {
  const session = createProjectSession(); if (active) session.begin('p1', 1)
  const calls: Call[] = []
  const putSection = vi.fn((_projectId: string, path: string, expectedRevision: number, value: unknown) => new Promise<SectionWriteEnvelope>((resolve, reject) => {
    calls.push({ path, expectedRevision, value, resolve: (echo = value) => resolve({ projectId: 'p1', revision: expectedRevision + 1, updatedAt: 'now', value: echo }), reject })
  }))
  const queue = createWriteQueue({ session, putSection })
  return { session, queue, calls, putSection }
}
const tick = (ms: number) => vi.advanceTimersByTimeAsync(ms)

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('ServerSection', () => {
  it('read is synchronous; a write with the same wire is a no-op without request or notification', async () => {
    const { session, queue, calls } = setup()
    const section = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue, session })
    const listener = vi.fn(); section.subscribe(listener)
    expect(section.read()).toBeUndefined()
    section.hydrate({ n: 1, ui: 'x' }); listener.mockClear()
    expect(section.write({ n: 1, ui: 'other' })).toBe(true)
    await tick(SAVE_DEBOUNCE_MS * 2); expect(calls).toHaveLength(0); expect(listener).not.toHaveBeenCalled()
    expect(section.read()).toEqual({ n: 1, ui: 'x' })
  })
  it('a different value is readable at once, notifies once and sends one PUT; an equal server echo keeps the same reference (UI-only fields survive)', async () => {
    const { session, queue, calls } = setup()
    const section = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue, session })
    section.hydrate({ n: 1, ui: 'x' })
    const listener = vi.fn(); section.subscribe(listener)
    const next = { n: 2, ui: 'edited' }
    expect(section.write(next)).toBe(true)
    expect(section.read()).toBe(next); expect(listener).toHaveBeenCalledTimes(1)
    await tick(SAVE_DEBOUNCE_MS); expect(calls).toHaveLength(1); expect(calls[0]).toMatchObject({ path: 'sec', value: { n: 2 }, expectedRevision: 1 })
    calls[0].resolve(); await tick(0)
    expect(section.read()).toBe(next); expect(listener).toHaveBeenCalledTimes(1); expect(session.getSnapshot()).toMatchObject({ status: 'idle', revision: 2 })
  })
  it('a differing server value replaces the mirror when no newer edit is pending', async () => {
    const { session, queue, calls } = setup()
    const section = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue, session })
    const listener = vi.fn(); section.subscribe(listener)
    section.write({ n: 2, ui: 'edited' }); await tick(SAVE_DEBOUNCE_MS)
    calls[0].resolve({ n: 99 }); await tick(0)
    expect(section.read()).toEqual({ n: 99, ui: 'default' }); expect(listener).toHaveBeenCalledTimes(2)
  })
  it('a newer pending edit is not overwritten by the confirmation of the older one', async () => {
    const { session, queue, calls } = setup()
    const section = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue, session })
    section.write({ n: 2, ui: 'a' }); await tick(SAVE_DEBOUNCE_MS)
    const newer = { n: 3, ui: 'b' }; section.write(newer)
    calls[0].resolve({ n: 99 }); await tick(0)
    expect(section.read()).toBe(newer)
  })
  it('a listener writing the same section keeps the newer value in the queue (NF1)', async () => {
    const { session, queue, calls } = setup()
    const section = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue, session })
    section.hydrate({ n: 0, ui: 'base' })
    section.subscribe(() => { if (section.read()?.n === 1) section.write({ n: 2, ui: 'newer' }) })
    expect(section.write({ n: 1, ui: 'older' })).toBe(true)
    await tick(SAVE_DEBOUNCE_MS)
    expect(calls).toHaveLength(1); expect(calls[0].value).toEqual({ n: 2 })
    calls[0].resolve(); await tick(0)
    expect(section.read()).toEqual({ n: 2, ui: 'newer' })
    expect(session.getSnapshot()).toMatchObject({ status: 'idle', pendingCount: 0 })
  })
  it('a session listener writing during enqueue keeps the newer section value', async () => {
    const { session, queue, calls } = setup()
    const section = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue, session })
    section.hydrate({ n: 0, ui: 'base' })
    session.subscribe(() => {
      if (session.getSnapshot().status === 'saving' && section.read()?.n === 1) section.write({ n: 2, ui: 'newer' })
    })
    section.write({ n: 1, ui: 'older' }); await tick(SAVE_DEBOUNCE_MS)
    expect(calls).toHaveLength(1); expect(calls[0].value).toEqual({ n: 2 })
  })
  it('a throwing listener does not prevent the section write or other notifications (NF1)', async () => {
    const { session, queue, calls } = setup()
    const section = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue, session })
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const later = vi.fn()
    section.subscribe(() => { throw new Error('listener boom') }); section.subscribe(later)
    expect(() => section.write({ n: 1, ui: 'x' })).not.toThrow()
    expect(later).toHaveBeenCalledTimes(1)
    await tick(SAVE_DEBOUNCE_MS); expect(calls[0].value).toEqual({ n: 1 })
    calls[0].resolve(); await tick(0)
    expect(session.getSnapshot().status).toBe('idle'); expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })
  it('hydrate sends no request and notifies', async () => {
    const { session, queue, calls } = setup()
    const section = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue, session })
    const listener = vi.fn(); section.subscribe(listener)
    section.hydrate({ n: 5, ui: 'x' }); await tick(SAVE_DEBOUNCE_MS * 2)
    expect(calls).toHaveLength(0); expect(listener).toHaveBeenCalledTimes(1); expect(section.read()).toEqual({ n: 5, ui: 'x' })
  })
  it('discard returns to the last confirmed value and notifies', async () => {
    const { session, queue } = setup()
    const section = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue, session })
    const confirmedValue = { n: 1, ui: 'x' }; section.hydrate(confirmedValue)
    section.write({ n: 2, ui: 'y' })
    const listener = vi.fn(); section.subscribe(listener)
    queue.discard()
    expect(section.read()).toBe(confirmedValue); expect(listener).toHaveBeenCalledTimes(1)
  })
  it('discard keeps a newer section write made by a session listener during drop (NF4)', async () => {
    const { session, queue, calls } = setup()
    const section = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue, session })
    section.hydrate({ n: 0, ui: 'base' }); section.write({ n: 1, ui: 'old' })
    session.subscribe(() => {
      if (session.getSnapshot().status === 'idle' && section.read()?.n === 1) section.write({ n: 2, ui: 'new' })
    })
    section.discard()
    expect(section.read()).toEqual({ n: 2, ui: 'new' }); expect(queue.pendingKeys()).toEqual(['sec'])
    await tick(SAVE_DEBOUNCE_MS); expect(calls[0].value).toEqual({ n: 2 })
  })
  it('queue discard reverts before session listeners can enqueue a newer section value (NF4)', async () => {
    const { session, queue, calls } = setup()
    const section = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue, session })
    section.hydrate({ n: 0, ui: 'base' }); section.write({ n: 1, ui: 'old' })
    session.subscribe(() => {
      if (session.getSnapshot().status === 'idle' && section.read()?.n === 1) section.write({ n: 2, ui: 'new' })
    })
    queue.discard()
    expect(section.read()).toEqual({ n: 0, ui: 'base' }); expect(queue.pendingKeys()).toEqual([])
    await tick(SAVE_DEBOUNCE_MS); expect(calls).toHaveLength(0)
  })
  it('a disposed queue does not leave an unsent section value in the mirror (NF6)', () => {
    const { session, queue } = setup()
    const section = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue, session })
    const base = { n: 0, ui: 'base' }; section.hydrate(base); queue.dispose()
    expect(() => section.write({ n: 1, ui: 'new' })).toThrow('disposed')
    expect(section.read()).toBe(base)
  })
  it('write returns false without an active project and leaves the mirror unchanged', () => {
    const { session, queue } = setup(false)
    const section = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue, session })
    expect(section.write({ n: 1, ui: 'x' })).toBe(false); expect(section.read()).toBeUndefined()
  })
  it('write returns false and sets status rejected for a value that cannot be represented', () => {
    const { session, queue } = setup()
    const section = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue, session })
    section.hydrate({ n: 1, ui: 'x' })
    expect(section.write({ n: -1, ui: 'x' })).toBe(false)
    expect(section.read()).toEqual({ n: 1, ui: 'x' }); expect(session.getSnapshot()).toMatchObject({ status: 'rejected', failedKey: 'sec' })
    expect(session.getSnapshot().lastError).toBeInstanceOf(WireMappingError)
  })
  it('clears a clearable section with value null and rejects undefined for a non-clearable one', async () => {
    const a = setup()
    const clearable = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue: a.queue, session: a.session })
    clearable.hydrate({ n: 1, ui: 'x' }); expect(clearable.write(undefined)).toBe(true)
    await tick(SAVE_DEBOUNCE_MS); expect(a.calls[0].value).toBeNull(); expect(clearable.read()).toBeUndefined()
    const b = setup()
    const fixed = createServerSection({ id: 's', path: 'sec', codec: codec(false) }, { queue: b.queue, session: b.session })
    fixed.hydrate({ n: 1, ui: 'x' }); expect(fixed.write(undefined)).toBe(false)
    expect(fixed.read()).toEqual({ n: 1, ui: 'x' }); expect(b.session.getSnapshot().status).toBe('rejected')
  })
})

describe('ServerSectionCollection', () => {
  type Doc = { id: string; title: string }
  const docCodec: CollectionCodec<Doc, Doc> = { schema: z.object({ id: z.string(), title: z.string() }).strict(), idOf: (d) => d.id, toWire: (d) => ({ id: d.id, title: d.title }), fromWire: (w) => ({ ...w }) }
  const make = () => {
    const ctx = setup()
    const collection = createServerSectionCollection({ id: 'graphs', pathOf: (id) => `graphs/${encodeURIComponent(id)}`, codec: docCodec }, { queue: ctx.queue, session: ctx.session })
    return { ...ctx, collection }
  }

  it('sends a PUT only for the changed item', async () => {
    const { collection, calls } = make()
    const a = { id: 'a', title: 'A' }; const b = { id: 'b', title: 'B' }
    collection.hydrate([a, b])
    expect(collection.write([a, { id: 'b', title: 'B2' }])).toBe(true)
    expect(collection.get('b')).toEqual({ id: 'b', title: 'B2' }); expect(collection.get('a')).toBe(a)
    await tick(SAVE_DEBOUNCE_MS); expect(calls).toHaveLength(1); expect(calls[0]).toMatchObject({ path: 'graphs/b', value: { id: 'b', title: 'B2' } })
    calls[0].resolve(); await tick(0)
    expect(collection.list()).toEqual([a, { id: 'b', title: 'B2' }])
  })
  it('a new item is added and sent; discard removes it again', async () => {
    const { collection, calls, queue } = make()
    const a = { id: 'a', title: 'A' }; collection.hydrate([a])
    collection.write([a, { id: 'new/1', title: 'N' }])
    await tick(SAVE_DEBOUNCE_MS); expect(calls[0].path).toBe('graphs/new%2F1')
    queue.discard() // in flight: stays; nothing else queued
    collection.write([a, { id: 'new/1', title: 'N' }, { id: 'c', title: 'C' }])
    queue.discard()
    expect(collection.list().map((d) => d.id)).toEqual(['a']) // the in-flight item is reverted too (N1); its confirmation adopts it below
    calls[0].resolve(); await tick(0)
    expect(collection.list().map((d) => d.id)).toEqual(['a', 'new/1'])
  })
  it('a never-confirmed new item disappears on discard', async () => {
    const { collection, queue, session } = make()
    const a = { id: 'a', title: 'A' }; collection.hydrate([a])
    const listener = vi.fn(); collection.subscribe(listener)
    collection.write([a, { id: 'n', title: 'N' }]); queue.discard()
    expect(collection.list()).toEqual([a]); expect(session.getSnapshot().status).toBe('idle'); expect(listener).toHaveBeenCalledTimes(2)
  })
  it('removing an item is rejected: false, status rejected, mirror unchanged', () => {
    const { collection, session } = make()
    const a = { id: 'a', title: 'A' }; const b = { id: 'b', title: 'B' }; collection.hydrate([a, b])
    expect(collection.write([a])).toBe(false)
    expect(collection.list()).toEqual([a, b]); expect(session.getSnapshot()).toMatchObject({ status: 'rejected', failedKey: 'graphs/b' })
  })
  it('an unchanged list sends nothing', async () => {
    const { collection, calls } = make()
    const a = { id: 'a', title: 'A' }; collection.hydrate([a])
    expect(collection.write([{ ...a }])).toBe(true); await tick(SAVE_DEBOUNCE_MS * 2); expect(calls).toHaveLength(0)
  })
  it('a listener writing the same graph keeps the newer value in the queue (NF1)', async () => {
    const { collection, calls, session } = make()
    const a = { id: 'a', title: 'A' }; collection.hydrate([a])
    collection.subscribe(() => { if (collection.get('a')?.title === 'A1') collection.write([{ id: 'a', title: 'A2' }]) })
    expect(collection.write([{ id: 'a', title: 'A1' }])).toBe(true)
    await tick(SAVE_DEBOUNCE_MS)
    expect(calls).toHaveLength(1); expect(calls[0].value).toEqual({ id: 'a', title: 'A2' })
    calls[0].resolve(); await tick(0)
    expect(collection.get('a')).toEqual({ id: 'a', title: 'A2' })
    expect(session.getSnapshot().status).toBe('idle')
  })
  it('a session listener changing a later graph does not let the outer batch overwrite it (NF1)', async () => {
    const { collection, calls, session } = make()
    const a = { id: 'a', title: 'A' }; const b = { id: 'b', title: 'B' }; collection.hydrate([a, b])
    session.subscribe(() => {
      if (session.getSnapshot().status === 'saving' && collection.get('b')?.title === 'B1') {
        collection.write([{ id: 'a', title: 'A1' }, { id: 'b', title: 'B2' }])
      }
    })
    collection.write([{ id: 'a', title: 'A1' }, { id: 'b', title: 'B1' }])
    await tick(SAVE_DEBOUNCE_MS)
    expect(calls[0]).toMatchObject({ path: 'graphs/a', value: { id: 'a', title: 'A1' } })
    calls[0].resolve(); await tick(0)
    expect(calls[1]).toMatchObject({ path: 'graphs/b', value: { id: 'b', title: 'B2' } })
    calls[1].resolve(); await tick(0)
    expect(collection.get('b')).toEqual({ id: 'b', title: 'B2' })
    expect(session.getSnapshot().status).toBe('idle')
  })
  it('a throwing listener does not prevent the graph write (NF1)', async () => {
    const { collection, calls } = make()
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    collection.subscribe(() => { throw new Error('listener boom') })
    expect(() => collection.write([{ id: 'a', title: 'A' }])).not.toThrow()
    await tick(SAVE_DEBOUNCE_MS)
    expect(calls).toHaveLength(1); expect(calls[0].value).toEqual({ id: 'a', title: 'A' })
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })
  it('discard clears a rejection for a new graph that is not in the mirror (NF3)', async () => {
    const ctx = setup()
    const invalidCodec: CollectionCodec<Doc, Doc> = { ...docCodec, toWire: (d) => { if (d.title === 'bad') throw new WireMappingError('title', 'invalid'); return docCodec.toWire(d) } }
    const collection = createServerSectionCollection({ id: 'graphs', pathOf: (id) => `graphs/${id}`, codec: invalidCodec }, { queue: ctx.queue, session: ctx.session })
    const a = { id: 'a', title: 'A' }; collection.hydrate([a])
    expect(collection.write([a, { id: 'new', title: 'bad' }])).toBe(false)
    expect(ctx.session.getSnapshot()).toMatchObject({ status: 'rejected', failedKey: 'graphs/new' })
    collection.discard()
    expect(ctx.session.getSnapshot()).toMatchObject({ status: 'idle', failedKey: null })
    const section = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue: ctx.queue, session: ctx.session })
    section.write({ n: 1, ui: 'x' }); await tick(SAVE_DEBOUNCE_MS)
    expect(ctx.calls).toHaveLength(1); expect(ctx.calls[0].path).toBe('sec')
  })
  it('hydrate clears a tracked local rejection from the queue in the same epoch (NF5)', () => {
    const ctx = setup()
    const invalidCodec: CollectionCodec<Doc, Doc> = { ...docCodec, toWire: (d) => { if (d.title === 'bad') throw new WireMappingError('title', 'invalid'); return docCodec.toWire(d) } }
    const collection = createServerSectionCollection({ id: 'graphs', pathOf: (id) => `graphs/${id}`, codec: invalidCodec }, { queue: ctx.queue, session: ctx.session })
    const a = { id: 'a', title: 'A' }; collection.hydrate([a])
    expect(collection.write([a, { id: 'new', title: 'bad' }])).toBe(false)
    expect(ctx.session.getSnapshot()).toMatchObject({ status: 'rejected', failedKey: 'graphs/new' })
    collection.hydrate([a])
    expect(ctx.session.getSnapshot()).toMatchObject({ status: 'idle', failedKey: null })
    collection.discard(); expect(ctx.session.getSnapshot().status).toBe('idle')
  })
  it('discard keeps a newer graph write made by a session listener during drop (NF4)', async () => {
    const { collection, session, queue, calls } = make()
    collection.hydrate([{ id: 'a', title: 'A' }]); collection.write([{ id: 'a', title: 'A1' }])
    session.subscribe(() => {
      if (session.getSnapshot().status === 'idle' && collection.get('a')?.title === 'A1') collection.write([{ id: 'a', title: 'A2' }])
    })
    collection.discard()
    expect(collection.get('a')).toEqual({ id: 'a', title: 'A2' }); expect(queue.pendingKeys()).toEqual(['graphs/a'])
    await tick(SAVE_DEBOUNCE_MS); expect(calls[0].value).toEqual({ id: 'a', title: 'A2' })
  })
  it('discard preserves a new graph edit made while clearing another local rejection (NF4)', async () => {
    const ctx = setup()
    const invalidCodec: CollectionCodec<Doc, Doc> = { ...docCodec, toWire: (d) => { if (d.title === 'bad') throw new WireMappingError('title', 'invalid'); return docCodec.toWire(d) } }
    const collection = createServerSectionCollection({ id: 'graphs', pathOf: (id) => `graphs/${id}`, codec: invalidCodec }, { queue: ctx.queue, session: ctx.session })
    const a = { id: 'a', title: 'A' }; collection.hydrate([a])
    expect(collection.write([a, { id: 'new', title: 'bad' }])).toBe(false)
    collection.write([{ id: 'a', title: 'A1' }])
    ctx.session.subscribe(() => {
      if (ctx.session.getSnapshot().status === 'saving' && collection.get('a')?.title === 'A1') collection.write([{ id: 'a', title: 'A2' }])
    })
    collection.discard()
    expect(collection.get('a')).toEqual({ id: 'a', title: 'A2' }); expect(ctx.queue.pendingKeys()).toEqual(['graphs/a'])
    await tick(SAVE_DEBOUNCE_MS); expect(ctx.calls[0].value).toEqual({ id: 'a', title: 'A2' })
  })
  it('a disposed queue does not leave a partial graph batch in the mirror (NF6)', () => {
    const { collection, queue } = make()
    const a = { id: 'a', title: 'A' }; const b = { id: 'b', title: 'B' }; collection.hydrate([a, b]); queue.dispose()
    expect(() => collection.write([{ id: 'a', title: 'A1' }, { id: 'b', title: 'B1' }])).toThrow('disposed')
    expect(collection.list()).toEqual([a, b]); expect(queue.pendingKeys()).toEqual([])
  })
})

describe('discard while a request is in flight (F2, F3)', () => {
  it('section: a queue discard while v1 is in flight adopts the confirmed server value afterwards and notifies', async () => {
    const { session, queue, calls } = setup()
    const section = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue, session })
    section.hydrate({ n: 0, ui: 'x' })
    section.write({ n: 1, ui: 'a' }); await tick(SAVE_DEBOUNCE_MS)
    section.write({ n: 2, ui: 'b' })
    queue.discard() // v2 dropped; v1 stays in flight
    expect(section.read()).toEqual({ n: 0, ui: 'x' })
    const listener = vi.fn(); section.subscribe(listener)
    calls[0].resolve(); await tick(0)
    expect(section.read()).toEqual({ n: 1, ui: 'default' }); expect(listener).toHaveBeenCalledTimes(1)
    expect(session.getSnapshot().status).toBe('idle')
    // the mirror equals the server again: writing the old value sends a PUT instead of being a silent no-op
    expect(section.write({ n: 0, ui: 'x' })).toBe(true); await tick(SAVE_DEBOUNCE_MS); expect(calls).toHaveLength(2); expect(calls[1].value).toEqual({ n: 0 })
  })
  it('section: a direct section.discard() drops the pending PUT, sends nothing and reconciles the in-flight one', async () => {
    const { session, queue, calls } = setup()
    const section = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue, session })
    const base = { n: 0, ui: 'x' }; section.hydrate(base)
    section.write({ n: 1, ui: 'a' })
    section.discard()
    expect(section.read()).toBe(base); expect(session.getSnapshot()).toMatchObject({ status: 'idle', pendingCount: 0 })
    await tick(SAVE_DEBOUNCE_MS * 2); expect(calls).toHaveLength(0)
    section.write({ n: 2, ui: 'b' }); await tick(SAVE_DEBOUNCE_MS)
    section.write({ n: 3, ui: 'c' }); section.discard() // v2 in flight, v3 dropped
    await tick(SAVE_DEBOUNCE_MS * 2); expect(calls).toHaveLength(1)
    calls[0].resolve(); await tick(0)
    expect(section.read()).toEqual({ n: 2, ui: 'default' }); expect(session.getSnapshot().status).toBe('idle')
  })
  it('section: discard clears a local rejection of its own path', () => {
    const { session, queue } = setup()
    const section = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue, session })
    section.hydrate({ n: 1, ui: 'x' }); section.write({ n: -1, ui: 'x' })
    expect(session.getSnapshot().status).toBe('rejected'); section.discard()
    expect(session.getSnapshot()).toMatchObject({ status: 'idle', failedKey: null })
  })
  type Doc = { id: string; title: string }
  const docCodec: CollectionCodec<Doc, Doc> = { schema: z.object({ id: z.string(), title: z.string() }).strict(), idOf: (d) => d.id, toWire: (d) => ({ id: d.id, title: d.title }), fromWire: (w) => ({ ...w }) }
  const make = () => {
    const ctx = setup()
    return { ...ctx, collection: createServerSectionCollection({ id: 'graphs', pathOf: (id) => `graphs/${id}`, codec: docCodec }, { queue: ctx.queue, session: ctx.session }) }
  }
  it('collection: a new graph whose PUT is in flight and confirmed after collection.discard() ends up in the list', async () => {
    const { collection, calls } = make()
    const a = { id: 'a', title: 'A' }; collection.hydrate([a])
    collection.write([a, { id: 'n', title: 'N' }]); await tick(SAVE_DEBOUNCE_MS)
    collection.discard(); expect(collection.list()).toEqual([a])
    const listener = vi.fn(); collection.subscribe(listener)
    calls[0].resolve(); await tick(0)
    expect(collection.list().map((d) => d.id)).toEqual(['a', 'n']); expect(collection.get('n')).toEqual({ id: 'n', title: 'N' }); expect(listener).toHaveBeenCalledTimes(1)
  })
  it('collection: collection.discard() drops pending PUTs of changed items and reverts an in-flight change that is confirmed later', async () => {
    const { collection, calls, session } = make()
    const a = { id: 'a', title: 'A' }; const b = { id: 'b', title: 'B' }; collection.hydrate([a, b])
    collection.write([{ id: 'a', title: 'A1' }, b]); await tick(SAVE_DEBOUNCE_MS)
    collection.write([{ id: 'a', title: 'A1' }, { id: 'b', title: 'B1' }])
    collection.discard()
    expect(collection.list()).toEqual([a, b]); expect(session.getSnapshot()).toMatchObject({ status: 'saving', pendingCount: 1 })
    await tick(SAVE_DEBOUNCE_MS * 2); expect(calls).toHaveLength(1)
    calls[0].resolve(); await tick(0)
    expect(collection.get('a')).toEqual({ id: 'a', title: 'A1' }); expect(collection.get('b')).toBe(b)
    expect(session.getSnapshot().status).toBe('idle')
  })
  it('collection: a new graph whose PUT fails after queue.discard() does not stay in the list (N1)', async () => {
    const { collection, calls, queue, session } = make()
    const a = { id: 'a', title: 'A' }; collection.hydrate([a])
    collection.write([a, { id: 'n', title: 'N' }]); await tick(SAVE_DEBOUNCE_MS)
    queue.discard(); expect(collection.list()).toEqual([a])
    calls[0].reject(new TypeError('Failed to fetch')); await tick(0)
    expect(collection.list()).toEqual([a]); expect(collection.get('n')).toBeUndefined(); expect(session.getSnapshot()).toMatchObject({ status: 'idle', pendingCount: 0 })
    await expect(queue.flush()).resolves.toBeUndefined()
  })
  it('collection: a changed graph whose PUT fails after queue.discard() keeps the confirmed value (N1)', async () => {
    const { collection, calls, queue } = make()
    const a = { id: 'a', title: 'A' }; collection.hydrate([a])
    collection.write([{ id: 'a', title: 'A1' }]); await tick(SAVE_DEBOUNCE_MS)
    queue.discard(); expect(collection.get('a')).toBe(a)
    calls[0].reject(new ApiError({ status: 500, message: 'x', code: 'INTERNAL_ERROR', correlationId: 'c', fieldErrors: [] })); await tick(0)
    expect(collection.get('a')).toBe(a)
  })
  it('collection: a codec.idOf failure is reported under a sentinel key, not under the previous item', () => {
    const throwing: CollectionCodec<Doc, Doc> = { ...docCodec, idOf: (d) => { if (d.title === 'bad') throw new WireMappingError('id', 'unreadable'); return d.id } }
    const ctx = setup()
    const collection = createServerSectionCollection({ id: 'graphs', pathOf: (id) => `graphs/${id}`, codec: throwing }, { queue: ctx.queue, session: ctx.session })
    expect(collection.write([{ id: 'a', title: 'A' }, { id: 'b', title: 'bad' }])).toBe(false)
    expect(ctx.session.getSnapshot()).toMatchObject({ status: 'rejected', failedKey: 'graphs[1]' })
    collection.discard()
    expect(ctx.session.getSnapshot()).toMatchObject({ status: 'idle', failedKey: null })
  })
})

describe('queue.discard() while a section request is in flight and another section is rejected (N1)', () => {
  const failures: [string, () => unknown][] = [
    ['network failure', () => new TypeError('Failed to fetch')],
    ['500', () => new ApiError({ status: 500, message: 'x', code: 'INTERNAL_ERROR', correlationId: 'c', fieldErrors: [] })],
    ['400', () => new ApiError({ status: 400, message: 'x', code: 'INVALID_REQUEST', correlationId: 'c', fieldErrors: [] })],
  ]
  const prepare = async () => {
    const ctx = setup()
    const section = createServerSection({ id: 's', path: 'sec', codec: codec(true) }, { queue: ctx.queue, session: ctx.session })
    const other = createServerSection({ id: 'o', path: 'other', codec: codec(true) }, { queue: ctx.queue, session: ctx.session })
    const base = { n: 0, ui: 'x' }; section.hydrate(base)
    section.write({ n: 1, ui: 'a' }); await tick(SAVE_DEBOUNCE_MS)
    expect(other.write({ n: -1, ui: 'x' })).toBe(false); expect(ctx.session.getSnapshot().status).toBe('rejected')
    ctx.queue.discard()
    return { ...ctx, section, base }
  }
  it.each(failures)('%s: the mirror equals the confirmed value and nothing is pending', async (_name, makeError) => {
    const { section, base, calls, queue, session } = await prepare()
    expect(section.read()).toBe(base)
    calls[0].reject(makeError()); await tick(0)
    expect(section.read()).toBe(base); expect(queue.pendingKeys()).toEqual([]); expect(session.getSnapshot()).toMatchObject({ status: 'idle', pendingCount: 0 })
    await expect(queue.flush()).resolves.toBeUndefined()
    // the mirror is consistent: writing the value again sends a PUT
    expect(section.write({ n: 1, ui: 'a' })).toBe(true); await tick(SAVE_DEBOUNCE_MS); expect(calls).toHaveLength(2)
  })
  it('success: the server value is adopted and listeners are notified', async () => {
    const { section, calls } = await prepare()
    const listener = vi.fn(); section.subscribe(listener)
    calls[0].resolve(); await tick(0)
    expect(section.read()).toEqual({ n: 1, ui: 'default' }); expect(listener).toHaveBeenCalledTimes(1)
  })
})
