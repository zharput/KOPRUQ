import { describe, expect, it } from 'vitest'
import { makeQuantity } from './quantities'
import { resolveEngineeringInput } from './engineeringInputs'

describe('target-aware engineering input resolution', () => {
  it('uses the project display unit for primitive scalars and numeric arrays', () => {
    expect(resolveEngineeringInput(3000, { type: 'length' }, { length: 'mm' })).toMatchObject({ value: 3, quantityKind: 'length', unit: 'mm' })
    expect(resolveEngineeringInput([2, 2.5, 3], { type: 'length[]' }, { length: 'm' })).toMatchObject([
      { value: 2, quantityKind: 'length', unit: 'm' },
      { value: 2.5, quantityKind: 'length', unit: 'm' },
      { value: 3, quantityKind: 'length', unit: 'm' },
    ])
  })

  it('supports other target quantity kinds without changing primitive values', () => {
    expect(resolveEngineeringInput(2, { type: 'quantity', quantityKind: 'stress' }, { stress: 'GPa' })).toMatchObject({ value: 2000, quantityKind: 'stress', unit: 'GPa' })
    expect(resolveEngineeringInput(5, { type: 'quantity', quantityKind: 'force' }, { force: 'kN' })).toMatchObject({ value: 5, quantityKind: 'force', unit: 'kN' })
  })

  it('resolves integer values at continuous targets without changing the discrete integer boundary', () => {
    expect(resolveEngineeringInput(3, { type: 'length[]' }, { length: 'm' })).toMatchObject({ value: 3, quantityKind: 'length', unit: 'm' })
    expect(resolveEngineeringInput(40, { type: 'quantity', quantityKind: 'stress' }, { stress: 'MPa' })).toMatchObject({ value: 40, quantityKind: 'stress', unit: 'MPa' })
    expect(resolveEngineeringInput(100, { type: 'quantity', quantityKind: 'force' }, { force: 'kN' })).toMatchObject({ value: 100, quantityKind: 'force', unit: 'kN' })
    expect(resolveEngineeringInput(2, { type: 'integer' }, { length: 'm' })).toBe(2)
  })

  it('preserves explicit Quantity unit metadata and leaves non-quantity targets unchanged', () => {
    const explicit = makeQuantity(3000, 'length', 'mm')
    expect(resolveEngineeringInput(explicit, { type: 'length' }, { length: 'ft' })).toEqual(explicit)
    expect(resolveEngineeringInput(3, { type: 'integer' }, { length: 'm' })).toBe(3)
  })

  it('rejects explicitly typed quantities with the wrong target kind', () => {
    expect(() => resolveEngineeringInput(makeQuantity(40, 'stress', 'MPa'), { type: 'length[]' }, { length: 'm' })).toThrow('Cannot use stress')
  })
})
