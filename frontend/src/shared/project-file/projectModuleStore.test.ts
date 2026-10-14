import { describe, expect, it, vi } from 'vitest'
import { createProjectModule } from './projectModuleStore'
import { SEISMIC_SERVER_SECTION } from '../../features/loads/model/loadsServerSections'
import { SEISMIC_INPUTS_MODULE } from '../../features/loads/model/loadsProjectModules'
import { FAMILY_SERVER_SECTIONS } from '../../features/family-registry/model/familyServerSections'
import { resetActiveProject } from '../../test/projectSessionTestUtils'

const VALUE = { a: '0.2', g: '1', t: '1', i: '1' }

describe('createProjectModule (a view of one server section)', () => {
  it('exposes the id of the section and reads, writes and resets through it', () => {
    const module = createProjectModule(SEISMIC_SERVER_SECTION)
    expect(module.id).toBe(SEISMIC_SERVER_SECTION.id)
    expect(module.read()).toBeUndefined()
    expect(module.write(VALUE)).toBe(true)
    expect(module.read()).toEqual(VALUE)
    expect(SEISMIC_SERVER_SECTION.read()).toEqual(VALUE)
    module.reset()
    expect(module.read()).toBeUndefined()
  })

  it('notifies subscribers of every change and stops after unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = SEISMIC_INPUTS_MODULE.subscribe(listener)
    SEISMIC_INPUTS_MODULE.write(VALUE)
    expect(listener).toHaveBeenCalledTimes(1)
    SEISMIC_INPUTS_MODULE.write(VALUE)
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    SEISMIC_INPUTS_MODULE.reset()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('write returns false while no project is open', () => {
    resetActiveProject()
    expect(SEISMIC_INPUTS_MODULE.write(VALUE)).toBe(false)
    expect(SEISMIC_INPUTS_MODULE.read()).toBeUndefined()
  })

  it('reset of a section that cannot be cleared is not accepted and leaves the value', () => {
    const module = createProjectModule(FAMILY_SERVER_SECTIONS.MATERIAL)
    const value = [{ id: 'm1', concreteClass: 'C30/37' }]
    expect(module.write(value)).toBe(true)
    module.reset()
    expect(module.read()).toEqual(value)
  })
})
