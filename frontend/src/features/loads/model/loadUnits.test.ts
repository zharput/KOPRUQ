import { describe, expect, it } from 'vitest'
import { canonicalText, displayText, formatLoad, formatLoadValue, loadFormatter, loadUnit, type LoadQuantity } from './loadUnits'

const TONF = { force: 'tonf' }
const MM = { length: 'mm' }
const CM = { length: 'cm' }

describe('loadUnit labels', () => {
  it('keeps canonical labels with default / missing units', () => {
    for (const units of [undefined, {}, { force: 'kN', length: 'm', temperature: 'C' }]) {
      expect(loadUnit('length', units).label).toBe('m')
      expect(loadUnit('force', units).label).toBe('kN')
      expect(loadUnit('lineLoad', units).label).toBe('kN/m')
      expect(loadUnit('pressure', units).label).toBe('kN/m²')
      expect(loadUnit('unitWeight', units).label).toBe('kN/m³')
      expect(loadUnit('temperature', units).label).toBe('°C')
      expect(loadUnit('temperatureDifference', units).label).toBe('°C')
      expect(loadUnit('perTemperatureDifference', units).label).toBe('/°C')
    }
  })

  it('derives compound labels from Force and Length, not from Stress or Mass', () => {
    expect(loadUnit('lineLoad', TONF).label).toBe('tonf/m')
    expect(loadUnit('pressure', { ...TONF, stress: 'kPa' }).label).toBe('tonf/m²')
    expect(loadUnit('unitWeight', { ...TONF, mass: 'kg' }).label).toBe('tonf/m³')
    expect(loadUnit('lineLoad', { force: 'N', length: 'cm' }).label).toBe('N/cm')
    expect(loadUnit('lineLoad', { ...TONF, ...MM }).label).toBe('tonf/mm')
    expect(loadUnit('pressure', { ...TONF, ...MM }).label).toBe('tonf/mm²')
    expect(loadUnit('unitWeight', { ...TONF, ...MM }).label).toBe('tonf/mm³')
  })

  it('maps temperature labels', () => {
    expect(loadUnit('temperature', { temperature: 'F' }).label).toBe('°F')
    expect(loadUnit('temperature', { temperature: 'K' }).label).toBe('K')
    expect(loadUnit('temperatureDifference', { temperature: 'F' }).label).toBe('°F')
    expect(loadUnit('perTemperatureDifference', { temperature: 'F' }).label).toBe('/°F')
    expect(loadUnit('perTemperatureDifference', { temperature: 'K' }).label).toBe('/K')
  })

  it('falls back to canonical units for unknown or empty ids (AC15)', () => {
    const bad = { force: 'bogus', length: '', temperature: 'zzz' }
    expect(loadUnit('lineLoad', bad).label).toBe('kN/m')
    expect(loadUnit('temperature', bad).label).toBe('°C')
    expect(formatLoad(4, 'lineLoad', bad)).toBe('4.0000 kN/m')
  })
})

describe('conversion', () => {
  it('converts force/length compound units by dimensional analysis', () => {
    expect(loadUnit('lineLoad', TONF).toDisplay(2)).toBeCloseTo(2 / 9.80665, 12)
    expect(loadUnit('unitWeight', TONF).toDisplay(24)).toBeCloseTo(24 / 9.80665, 12)
    expect(loadUnit('lineLoad', MM).toDisplay(4)).toBeCloseTo(0.004, 12)
    expect(loadUnit('pressure', MM).toDisplay(9)).toBeCloseTo(9e-6, 15)
    expect(loadUnit('unitWeight', MM).toDisplay(24)).toBeCloseTo(2.4e-8, 20)
    expect(loadUnit('lineLoad', { force: 'N' }).toDisplay(4)).toBeCloseTo(4000, 9)
    expect(loadUnit('length', MM).toDisplay(0.1)).toBeCloseTo(100, 9)
    expect(loadUnit('length', CM).toDisplay(0.1)).toBeCloseTo(10, 9)
    expect(loadUnit('force', { force: 'kgf' }).toDisplay(0.00980665)).toBeCloseTo(1, 12)
  })

  it('converts temperatures, differences and alphaT', () => {
    expect(loadUnit('temperature', { temperature: 'F' }).toDisplay(10)).toBeCloseTo(50, 9)
    expect(loadUnit('temperature', { temperature: 'K' }).toDisplay(10)).toBeCloseTo(283.15, 9)
    expect(loadUnit('temperatureDifference', { temperature: 'F' }).toDisplay(-20)).toBeCloseTo(-36, 9)
    expect(loadUnit('temperatureDifference', { temperature: 'K' }).toDisplay(-20)).toBeCloseTo(-20, 9)
    expect(loadUnit('perTemperatureDifference', { temperature: 'F' }).toDisplay(10e-6)).toBeCloseTo(10e-6 * 5 / 9, 15)
    expect(loadUnit('perTemperatureDifference', { temperature: 'K' }).toDisplay(10e-6)).toBeCloseTo(10e-6, 15)
  })

  it('round-trips every quantity for several unit sets', () => {
    const sets = [{}, { ...TONF, ...MM, temperature: 'F' }, { force: 'N', length: 'cm', temperature: 'K' }, { force: 'kgf', length: 'm' }]
    const quantities: LoadQuantity[] = ['length', 'force', 'lineLoad', 'pressure', 'unitWeight', 'temperature', 'temperatureDifference', 'perTemperatureDifference']
    for (const units of sets) for (const q of quantities) {
      const u = loadUnit(q, units)
      expect(u.toCanonical(u.toDisplay(12.375))).toBeCloseTo(12.375, 9)
    }
  })

  it('AC13: 0.5 tonf/m stores 4.903325 kN/m', () => {
    expect(loadUnit('lineLoad', TONF).toCanonical(0.5)).toBeCloseTo(4.903325, 9)
    expect(formatLoadValue(4.903325, 'lineLoad')).toBe('4.9033')
  })
})

describe('formatting rule (Q2 / AC12)', () => {
  it('uses 4 decimals for Length=m and 3 for cm on length-bearing values', () => {
    expect(formatLoad(0.1, 'length')).toBe('0.1000 m')
    expect(formatLoad(4, 'lineLoad')).toBe('4.0000 kN/m')
    expect(formatLoad(9, 'pressure')).toBe('9.0000 kN/m²')
    expect(formatLoad(24, 'unitWeight')).toBe('24.0000 kN/m³')
    expect(formatLoadValue(0.1, 'length', CM)).toBe('10.000')
    expect(formatLoadValue(4, 'lineLoad', CM)).toBe('0.040')
  })

  it('uses 1 decimal for lengths and 4 significant digits for derived values in mm', () => {
    expect(formatLoadValue(0.1, 'length', MM)).toBe('100.0')
    expect(formatLoad(4, 'lineLoad', MM)).toBe('0.004000 kN/mm')
    expect(formatLoad(4, 'lineLoad', { ...TONF, ...MM })).toBe('0.0004079 tonf/mm')
    expect(formatLoad(9, 'pressure', MM)).toBe('0.000009000 kN/mm²')
    expect(formatLoad(24, 'unitWeight', MM)).toBe('2.400e-8 kN/mm³')
    expect(formatLoad(55.55, 'lineLoad', MM)).toBe('0.05555 kN/mm')
    expect(formatLoad(12.3, 'lineLoad', MM)).toBe('0.01230 kN/mm')
    expect(formatLoadValue(0, 'lineLoad', MM)).toBe('0.000')
  })

  it('matches the tonf examples', () => {
    expect(formatLoadValue(2, 'lineLoad', TONF)).toBe('0.2039')
    expect(formatLoad(4, 'lineLoad', TONF)).toBe('0.4079 tonf/m')
    expect(formatLoadValue(24, 'unitWeight', TONF)).toBe('2.4473')
    expect(formatLoadValue(25, 'unitWeight', TONF)).toBe('2.5493')
    expect(formatLoad(300, 'force', TONF)).toBe('30.59 tonf')
    expect(formatLoadValue(9, 'pressure', TONF)).toBe('0.9177')
  })

  it('keeps 2 decimals for quantities without Length', () => {
    expect(formatLoad(300, 'force', MM)).toBe('300.00 kN')
    expect(formatLoad(10, 'temperature', { temperature: 'F' })).toBe('50.00 °F')
    expect(formatLoad(-20, 'temperatureDifference', { temperature: 'F' })).toBe('-36.00 °F')
    expect(formatLoadValue(-8, 'temperature', MM)).toBe('-8.00')
  })

  it('applies the unknown Length id fallback (4 decimals)', () => {
    expect(formatLoadValue(0.1, 'length', { length: 'furlong' })).toBe('0.1000')
    expect(loadFormatter('length', { length: 'mm' })(100)).toBe('100.0')
  })
})

describe('text helpers', () => {
  it('converts canonical <-> display text', () => {
    expect(displayText('10', 'length', MM)).toBe('10000')
    expect(canonicalText('10000', 'length', MM)).toBe('10')
    expect(canonicalText('-4', 'temperature', { temperature: 'F' })).toBe('-20')
    expect(displayText('10', 'temperature', { temperature: 'F' })).toBe('50')
  })

  it('shows clean numbers for degF/K values whose conversion is not exact, never -0 (finding 1)', () => {
    const F = { temperature: 'F' }
    const K = { temperature: 'K' }
    for (const [typed, shown] of [['0', '0'], ['1', '1'], ['51', '51'], ['-4', '-4']]) {
      const canonical = canonicalText(typed, 'temperature', F)!
      expect(displayText(canonical, 'temperature', F)).toBe(shown)
    }
    for (const typed of ['0', '1', '273.15', '300']) {
      expect(displayText(canonicalText(typed, 'temperature', K)!, 'temperature', K)).toBe(typed)
    }
    expect(formatLoadValue(loadUnit('temperature', F).toCanonical(0), 'temperature', F)).toBe('0.00')
    expect(formatLoad(loadUnit('temperature', F).toCanonical(0), 'temperature', F)).toBe('0.00 °F')
    expect(formatLoadValue(-0.001, 'temperature')).toBe('0.00')
    expect(formatLoadValue(-0.00001, 'length')).toBe('0.0000')
    expect(formatLoadValue(-0.00000004, 'length', MM)).toBe('0.0')
    expect(formatLoadValue(-1, 'temperature')).toBe('-1.00')
  })

  it('keeps empty empty and refuses non-numbers', () => {
    expect(displayText('', 'length', MM)).toBe('')
    expect(canonicalText('', 'length', MM)).toBe('')
    expect(canonicalText('-', 'length', MM)).toBeNull()
    expect(canonicalText('abc', 'temperature')).toBeNull()
    expect(displayText('abc', 'length', MM)).toBe('abc')
  })
})
