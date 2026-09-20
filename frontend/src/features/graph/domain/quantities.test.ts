import { describe, expect, it } from 'vitest'
import { toDisplayValue, toInternalValue, convertQuantity, formatDisplayValue, formatQuantity, makeQuantity, quantityFromCanonical } from './quantities'

describe('central unit conversion engine', () => {
  it.each([
    ['length', 15, 'mm', 15000], ['length', .25, 'mm', 250], ['area', 2.5, 'mm2', 2500000],
    ['volume', 1, 'mm3', 1e9], ['length4', 1, 'mm4', 1e12], ['force', 1, 'N', 1000],
    ['moment', 1, 'Nm', 1000], ['moment', 1, 'Nmm', 1000000], ['stress', 1, 'kPa', 1000], ['mass', 1, 'kg', 1000],
  ])('converts %s', (kind, value, unit, expected) => expect(convertQuantity(value, kind === 'length4' ? 'm4' : kind === 'area' ? 'm2' : kind === 'volume' ? 'm3' : kind === 'force' ? 'kN' : kind === 'moment' ? 'kNm' : kind === 'stress' ? 'MPa' : kind === 'mass' ? 't' : 'm', unit)).toBe(expected))
  it('handles absolute temperature and temperature difference separately', () => {
    expect(toDisplayValue(20, 'Absolute Temperature', { temperature: 'F' })).toBeCloseTo(68)
    expect(toDisplayValue(20, 'Absolute Temperature', { temperature: 'K' })).toBeCloseTo(293.15)
    expect(toDisplayValue(10, 'Temperature Difference', { temperature: 'F' })).toBeCloseTo(18)
  })
  it.each(['Length','Area','Volume','Length^4','Force','Moment','Stress','Mass','Absolute Temperature','Temperature Difference','Integer','Dimensionless'] as const)('round trips %s', dimension => {
    const units = { length: 'mm', force: 'N', moment: 'Nm', stress: 'kPa', mass: 'kg', temperature: dimension.includes('Temperature') ? 'F' : 'm' }
    const initial = dimension === 'Length' ? 15 : dimension === 'Area' ? 2.5 : dimension === 'Volume' ? 1 : dimension === 'Length^4' ? 1 : dimension === 'Force' ? 1 : dimension === 'Moment' ? 1 : dimension === 'Stress' ? 1 : dimension === 'Mass' ? 1 : dimension.includes('Temperature') ? 20 : 7
    expect(toInternalValue(toDisplayValue(initial, dimension, units), dimension, units)).toBeCloseTo(initial)
  })
  it('formats only at the display boundary', () => expect(formatDisplayValue(.25, 'Length', { length: 'mm' }, 2)).toBe('250.00 mm'))
  it('keeps kind and display unit while storing canonical value', () => {
    const q = makeQuantity(2000, 'length', 'mm')
    expect(q).toMatchObject({ value: 2, quantityKind: 'length', unit: 'mm' })
    expect(quantityFromCanonical(q.value, q.quantityKind, 'm')).toBe(2)
    expect(formatQuantity(q)).toBe('2000.00 mm')
    expect(() => makeQuantity(2, 'stress', 'm')).toThrow('invalid for stress')
  })
})
