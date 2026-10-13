import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createProjectModule, PROJECT_MODULE_CHANGED_EVENT } from './projectModuleStore'
import { PROJECT_DATA_CHANGED_EVENT } from './projectDataEvents'

const KEY = 'test.synthetic.module'
const schema = z.object({ n: z.number(), label: z.string() })
const VALUE = { n: 3, label: 'a' }

function spyOnEvents() {
  const moduleEvent = vi.fn()
  const dataEvent = vi.fn()
  window.addEventListener(PROJECT_MODULE_CHANGED_EVENT, moduleEvent)
  window.addEventListener(PROJECT_DATA_CHANGED_EVENT, dataEvent)
  return {
    moduleEvent,
    dataEvent,
    stop: () => {
      window.removeEventListener(PROJECT_MODULE_CHANGED_EVENT, moduleEvent)
      window.removeEventListener(PROJECT_DATA_CHANGED_EVENT, dataEvent)
    },
  }
}

beforeEach(() => localStorage.clear())

describe('createProjectModule', () => {
  it('exposes the event names unchanged', () => {
    expect(PROJECT_MODULE_CHANGED_EVENT).toBe('kopruq:project-module-changed')
    expect(PROJECT_DATA_CHANGED_EVENT).toBe('kopruq:project-data-changed')
  })

  it('exposes id and key and parses through the schema', () => {
    const module = createProjectModule('synthetic', KEY, schema)
    expect(module.id).toBe('synthetic')
    expect(module.key).toBe(KEY)
    expect(module.parse(VALUE)).toEqual(VALUE)
    expect(() => module.parse({ n: 'x' })).toThrow()
  })

  it('read returns undefined when missing, corrupt or schema-invalid', () => {
    const module = createProjectModule('synthetic', KEY, schema)
    expect(module.read()).toBeUndefined()
    localStorage.setItem(KEY, '{not json')
    expect(module.read()).toBeUndefined()
    localStorage.setItem(KEY, JSON.stringify({ n: 'x', label: 1 }))
    expect(module.read()).toBeUndefined()
  })

  it('write stores the value and emits both events exactly once', () => {
    const module = createProjectModule('synthetic', KEY, schema)
    const events = spyOnEvents()
    expect(module.write(VALUE)).toBe(true)
    expect(module.read()).toEqual(VALUE)
    expect(events.moduleEvent).toHaveBeenCalledTimes(1)
    expect((events.moduleEvent.mock.calls[0][0] as CustomEvent).detail).toEqual({ id: 'synthetic' })
    expect(events.dataEvent).toHaveBeenCalledTimes(1)
    expect((events.dataEvent.mock.calls[0][0] as CustomEvent).detail).toEqual({ source: 'module', id: 'synthetic' })
    events.stop()
  })

  it('write of an identical value returns true and emits nothing', () => {
    const module = createProjectModule('synthetic', KEY, schema)
    module.write(VALUE)
    const events = spyOnEvents()
    expect(module.write(VALUE)).toBe(true)
    expect(events.moduleEvent).not.toHaveBeenCalled()
    expect(events.dataEvent).not.toHaveBeenCalled()
    events.stop()
  })

  it('write returns false and emits nothing when storage throws', () => {
    const module = createProjectModule('synthetic', KEY, schema)
    const events = spyOnEvents()
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(module.write(VALUE)).toBe(false)
    spy.mockRestore()
    expect(events.moduleEvent).not.toHaveBeenCalled()
    events.stop()
  })

  it('reset removes the value and emits both events, and is silent when nothing is stored', () => {
    const module = createProjectModule('synthetic', KEY, schema)
    module.write(VALUE)
    const events = spyOnEvents()
    module.reset()
    expect(module.read()).toBeUndefined()
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(events.moduleEvent).toHaveBeenCalledTimes(1)
    expect(events.dataEvent).toHaveBeenCalledTimes(1)
    module.reset()
    expect(events.moduleEvent).toHaveBeenCalledTimes(1)
    expect(events.dataEvent).toHaveBeenCalledTimes(1)
    events.stop()
  })

  it('supports custom write and reset', () => {
    const custom = { write: vi.fn(() => true), reset: vi.fn(() => true) }
    const module = createProjectModule('synthetic', KEY, schema, custom)
    const events = spyOnEvents()
    expect(module.write(VALUE)).toBe(true)
    expect(custom.write).toHaveBeenCalledWith(VALUE)
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(events.moduleEvent).toHaveBeenCalledTimes(1)
    module.reset()
    expect(custom.reset).toHaveBeenCalledTimes(1)
    expect(events.moduleEvent).toHaveBeenCalledTimes(2)
    events.stop()
  })

  it('a custom write or reset that reports failure emits nothing', () => {
    const module = createProjectModule('synthetic', KEY, schema, { write: () => false, reset: () => false })
    const events = spyOnEvents()
    expect(module.write(VALUE)).toBe(false)
    module.reset()
    expect(events.moduleEvent).not.toHaveBeenCalled()
    expect(events.dataEvent).not.toHaveBeenCalled()
    events.stop()
  })
})
