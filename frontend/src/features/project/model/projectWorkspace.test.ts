import { beforeEach, describe, expect, it } from 'vitest'
import { INITIAL_PROJECT, normalizeProjectUnits, normalizeUnitId, readProjectState } from './projectWorkspace'

beforeEach(() => localStorage.clear())

describe('project unit identifiers', () => {
  it('normalizes display labels, including mojibake labels, to unit ids', () => {
    expect(normalizeUnitId('kN·m')).toBe('kNm'); expect(normalizeUnitId('kNÂ·m')).toBe('kNm'); expect(normalizeUnitId('°C')).toBe('C')
    expect(normalizeUnitId('Â°C')).toBe('C'); expect(normalizeUnitId('kN·mm')).toBe('kNmm'); expect(normalizeUnitId('mm')).toBe('mm')
  })
  it('stores default project units as ids', () => {
    expect(INITIAL_PROJECT.units.moment).toBe('kNm'); expect(INITIAL_PROJECT.units.temperature).toBe('C')
  })
  it('normalizes units read from storage', () => {
    localStorage.setItem('kopruq.project-workspace.v1', JSON.stringify({ project: { units: { moment: 'kN·m', temperature: '°C', length: 'mm' } }, bridges: [] }))
    expect(readProjectState([]).project.units).toMatchObject({ moment: 'kNm', temperature: 'C', length: 'mm' })
    expect(normalizeProjectUnits({ ...INITIAL_PROJECT.units, moment: 'MN·m' }).moment).toBe('MNm')
  })
})
