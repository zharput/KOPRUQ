import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PROJECT_MODULES, PROJECT_MODULE_IDS } from './projectModules'

const SEISMIC = { a: '0.2', g: 'C', t: 'Type 2', i: '1.2' }
beforeEach(() => localStorage.clear())

describe('project modules store', () => {
  it('lists the eight project-scoped modules with their storage keys', () => {
    expect(PROJECT_MODULE_IDS).toEqual(['girderLibrary', 'preferredSpanRules', 'seismicInputs', 'windInputs', 'temperatureInputs', 'crossSectionValues', 'selfWeightInputs', 'trafficLm1'])
    expect(PROJECT_MODULES.seismicInputs.key).toBe('kopruq.seismic')
    expect(PROJECT_MODULES.windInputs.key).toBe('kopruq.wind-load.inputs')
    expect(PROJECT_MODULES.temperatureInputs.key).toBe('kopruq.uniform-temperature.inputs')
    expect(PROJECT_MODULES.girderLibrary.key).toBe('kopruq.girder-library.precast')
    expect(PROJECT_MODULES.preferredSpanRules.key).toBe('kopruq.project-design-system.girder-span-rules')
  })
  it('returns undefined instead of throwing for corrupt or schema-invalid stored data', () => {
    localStorage.setItem('kopruq.seismic', '{not json')
    expect(PROJECT_MODULES.seismicInputs.read()).toBeUndefined()
    localStorage.setItem('kopruq.seismic', JSON.stringify({ a: 5 }))
    expect(PROJECT_MODULES.seismicInputs.read()).toBeUndefined()
  })
  it('write stores the value and emits a project-data-changed event only when the value changes', () => {
    const listener = vi.fn(); window.addEventListener('kopruq:project-data-changed', listener)
    expect(PROJECT_MODULES.seismicInputs.write(SEISMIC)).toBe(true)
    expect(PROJECT_MODULES.seismicInputs.read()).toEqual(SEISMIC); expect(listener).toHaveBeenCalledTimes(1)
    PROJECT_MODULES.seismicInputs.write(SEISMIC); expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener('kopruq:project-data-changed', listener)
  })
  it('parse throws for an invalid value and write reports failure when storage rejects it', () => {
    expect(() => PROJECT_MODULES.windInputs.parse({ vb: 1 })).toThrow()
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(PROJECT_MODULES.seismicInputs.write(SEISMIC)).toBe(false); spy.mockRestore()
  })
  it('reset removes the stored value and emits an event', () => {
    PROJECT_MODULES.temperatureInputs.write({ min: '-20', max: '40', t0: '10' })
    const listener = vi.fn(); window.addEventListener('kopruq:project-data-changed', listener)
    PROJECT_MODULES.temperatureInputs.reset()
    expect(PROJECT_MODULES.temperatureInputs.read()).toBeUndefined(); expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener('kopruq:project-data-changed', listener)
  })
})
