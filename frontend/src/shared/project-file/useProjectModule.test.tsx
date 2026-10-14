import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SEISMIC_INPUTS_MODULE } from '../../features/loads/model/loadsProjectModules'
import { useProjectModule, useProjectModuleValue } from './useProjectModule'

const FALLBACK = { a: '0', g: '0', t: '0', i: '0' }

describe('useProjectModule (generic)', () => {
  it('returns the fallback when the section has no value', () => {
    const { result } = renderHook(() => useProjectModule(SEISMIC_INPUTS_MODULE, FALLBACK))
    expect(result.current[0]).toBe(FALLBACK)
  })

  it('reads a value that is already in the section', () => {
    SEISMIC_INPUTS_MODULE.write({ a: '5', g: '1', t: '1', i: '1' })
    const { result } = renderHook(() => useProjectModule(SEISMIC_INPUTS_MODULE, FALLBACK))
    expect(result.current[0]).toEqual({ a: '5', g: '1', t: '1', i: '1' })
  })

  it('set writes a value and a functional update receives the previous value', () => {
    const { result } = renderHook(() => useProjectModule(SEISMIC_INPUTS_MODULE, FALLBACK))
    act(() => result.current[1]({ a: '2', g: '1', t: '1', i: '1' }))
    expect(result.current[0]).toEqual({ a: '2', g: '1', t: '1', i: '1' })
    expect(SEISMIC_INPUTS_MODULE.read()).toEqual({ a: '2', g: '1', t: '1', i: '1' })
    act(() => result.current[1]((previous) => ({ ...previous, a: `${previous.a}3` })))
    expect(result.current[0].a).toBe('23')
  })

  it('refreshes when the module is reset', () => {
    SEISMIC_INPUTS_MODULE.write({ a: '4', g: '1', t: '1', i: '1' })
    const { result } = renderHook(() => useProjectModule(SEISMIC_INPUTS_MODULE, FALLBACK))
    expect(result.current[0].a).toBe('4')
    act(() => SEISMIC_INPUTS_MODULE.reset())
    expect(result.current[0]).toBe(FALLBACK)
  })

  it('useProjectModuleValue returns undefined without a value and the stored value afterwards', () => {
    const { result } = renderHook(() => useProjectModuleValue(SEISMIC_INPUTS_MODULE))
    expect(result.current).toBeUndefined()
    act(() => { SEISMIC_INPUTS_MODULE.write({ a: '1', g: '1', t: '1', i: '1' }) })
    expect(result.current).toEqual({ a: '1', g: '1', t: '1', i: '1' })
  })
})
